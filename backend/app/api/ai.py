from uuid import UUID
from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from backend.app.core.config import get_db_session
from backend.app.models.database import Project, Client, ProjectStatus, ProjectAssignment, ProjectRequirement
from backend.app.schemas.ai import (
    ProjectAnalysisInput,
    ProjectAnalysisResponse,
    ModuleRecommendationGroup,
    AssignmentRequest
)
from backend.app.services.ai.ai_orchestrator import AIOrchestrator


router = APIRouter(prefix="/ai", tags=["AI Project Engine"])


class AnalyzeRequest(BaseModel):
    project_name: str
    description: str
    deadline: Optional[date] = None
    client_id: Optional[UUID] = None
    budget: Optional[float] = None
    priority: Optional[str] = "Medium"


class AnalyzeResponseExtended(ProjectAnalysisResponse):
    project_id: UUID


@router.post("/projects/analyze", response_model=AnalyzeResponseExtended)
async def analyze_project(request: AnalyzeRequest, db: Session = Depends(get_db_session)):
    # 1. We need a Project record to bind requirements and cache.
    # If client_id is not provided, bind to the first available client in database.
    client_id = request.client_id
    if not client_id:
        first_client = db.query(Client).first()
        if not first_client:
            # Create a fallback dummy client if database is empty
            fallback_client = Client(
                name="Internal Operations",
                contact_person="Admin",
                email="admin@magnificit.co.uk"
            )
            db.add(fallback_client)
            db.flush()
            client_id = fallback_client.id
        else:
            client_id = first_client.id

    # Find the "active" project status
    status_rec = db.query(ProjectStatus).filter(ProjectStatus.name == "active").first()
    if not status_rec:
        status_rec = ProjectStatus(name="active")
        db.add(status_rec)
        db.flush()

    # Create the project record
    project = Project(
        name=request.project_name,
        client_id=client_id,
        start_date=date.today(),
        end_date=request.deadline if request.deadline else date.today(),
        status_id=status_rec.id,
        description=request.description,
        is_deleted=False
    )
    db.add(project)
    db.flush()  # Populates project.id

    # 2. Run AI Orchestrator to analyze and save requirements/skills/cache in DB
    analysis_result = await AIOrchestrator.analyze_and_populate_project(
        db=db,
        project_id=project.id,
        project_name=request.project_name,
        description=request.description,
        deadline=request.deadline
    )

    return AnalyzeResponseExtended(
        project_id=project.id,
        modules=analysis_result.modules,
        timeline=analysis_result.timeline
    )


@router.get("/projects/{id}/recommendations", response_model=List[ModuleRecommendationGroup])
def get_recommendations(id: UUID, db: Session = Depends(get_db_session)):
    project = db.query(Project).filter(Project.id == id, Project.is_deleted == False).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found."
        )

    return AIOrchestrator.get_project_recommendations(db, id)


@router.post("/projects/{id}/assign")
def assign_resource(id: UUID, request: AssignmentRequest, db: Session = Depends(get_db_session)):
    # Verify project exists
    project = db.query(Project).filter(Project.id == id, Project.is_deleted == False).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found."
        )

    # Verify requirement/module exists
    req = db.query(ProjectRequirement).filter(
        ProjectRequirement.id == request.module_id,
        ProjectRequirement.project_id == id
    ).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Module/Requirement not found for this project."
        )

    # Check if this assignment already exists to avoid duplicates
    existing = db.query(ProjectAssignment).filter(
        ProjectAssignment.project_id == id,
        ProjectAssignment.requirement_id == request.module_id,
        ProjectAssignment.resource_id == request.resource_id
    ).first()

    if existing:
        return {"status": "success", "message": "Resource is already assigned to this module.", "assignment_id": existing.id}

    # Store the project assignment
    assignment = ProjectAssignment(
        project_id=id,
        requirement_id=request.module_id,
        resource_id=request.resource_id,
        assignment_type=request.assignment_type
    )
    db.add(assignment)
    db.commit()

    return {"status": "success", "message": "Resource assigned successfully.", "assignment_id": assignment.id}


@router.post("/projects/{id}/generate-tasks")
async def ai_generate_tasks_for_project(id: UUID, db: Session = Depends(get_db_session)):
    from backend.app.api.tasks import generate_tasks_for_project
    return await generate_tasks_for_project(id, db)

