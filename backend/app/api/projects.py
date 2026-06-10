from datetime import datetime, date
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.core.config import get_db_session
from backend.app.core.security import require_privileged_user, require_current_user
from backend.app.models.database import (
    Project,
    Client,
    ProjectStatus,
    AuditLog,
    User,
    ProjectRequirement,
    ProjectAssignment,
    ProjectTask,
    TaskDependency,
    Resource
)
from backend.app.schemas.projects import ProjectCreateRequest, ProjectUpdateRequest, ProjectResponse
from backend.app.services.ai.task_planner import TaskPlanner
from backend.app.services.ai.dependency_analyzer import DependencyAnalyzer
from backend.app.services.ai.daily_task_scheduler import DailyTaskScheduler

router = APIRouter(prefix="/projects", tags=["Projects"])

def parse_date(date_str: Optional[str]) -> Optional[date]:
    if not date_str:
        return None
    for fmt in ("%Y-%m-%d", "%d-%m-%Y"):
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    raise HTTPException(status_code=400, detail=f"Invalid date format: {date_str}. Expected YYYY-MM-DD or DD-MM-YYYY.")

def _snapshot(project: Project) -> Dict[str, Any]:
    return {
        "id": str(project.id),
        "name": project.name,
        "client_id": str(project.client_id),
        "start_date": project.start_date.isoformat() if project.start_date else None,
        "end_date": project.end_date.isoformat() if project.end_date else None,
        "status_id": str(project.status_id),
        "description": project.description,
    }

def _audit(
    db: Session,
    actor: User,
    project_id: UUID,
    action: str,
    old_value: Optional[Dict[str, Any]] = None,
    new_value: Optional[Dict[str, Any]] = None,
    changed_fields: Optional[Dict[str, Any]] = None,
):
    db.add(
        AuditLog(
            module="projects",
            action=action,
            table_name="projects",
            record_id=project_id,
            old_value=old_value,
            new_value=new_value,
            changed_fields=changed_fields,
            user_id=actor.id,
        )
    )

def _project_response(db: Session, project: Project) -> ProjectResponse:
    # Resolve client name
    client = db.query(Client).filter(Client.id == project.client_id).first()
    client_name = client.name if client else "Unknown Client"
    
    # Resolve status name
    status_rec = db.query(ProjectStatus).filter(ProjectStatus.id == project.status_id).first()
    status_name = status_rec.name if status_rec else "active"

    return ProjectResponse(
        id=project.id,
        name=project.name,
        client=client_name,
        client_id=project.client_id,
        startDate=project.start_date.isoformat() if project.start_date else "",
        endDate=project.end_date.isoformat() if project.end_date else None,
        status=status_name,
        description=project.description
    )

@router.get("", response_model=List[ProjectResponse])
def get_projects(
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_current_user),
):
    if current_user.role.name == "resource":
        projects = db.query(Project).join(ProjectAssignment).filter(
            ProjectAssignment.resource_id == current_user.resource_id,
            Project.is_deleted == False
        ).all()
    else:
        projects = db.query(Project).filter(Project.is_deleted == False).all()
    return [_project_response(db, p) for p in projects]

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: UUID,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_current_user),
):
    project = db.query(Project).filter(Project.id == project_id, Project.is_deleted == False).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    
    if current_user.role.name == "resource":
        assignment = db.query(ProjectAssignment).filter(
            ProjectAssignment.project_id == project_id,
            ProjectAssignment.resource_id == current_user.resource_id
        ).first()
        if not assignment:
            raise HTTPException(status_code=403, detail="Access denied.")

    return _project_response(db, project)

@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    request: ProjectCreateRequest,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_privileged_user),
):
    # Resolve Client Name to Client ID
    client = db.query(Client).filter(
        func.lower(Client.name) == request.client.strip().lower(),
        Client.is_deleted == False
    ).first()
    if not client:
        raise HTTPException(status_code=400, detail=f"Client '{request.client}' does not exist.")

    # Resolve Status Name to Status ID
    status_val = request.status.strip().lower()
    status_rec = db.query(ProjectStatus).filter(ProjectStatus.name == status_val).first()
    if not status_rec:
        # Fallback to active status
        status_rec = db.query(ProjectStatus).filter(ProjectStatus.name == "active").first()
        if not status_rec:
            raise HTTPException(status_code=500, detail="Default project status 'active' is not configured.")

    start_date_obj = parse_date(request.start_date)
    end_date_obj = parse_date(request.end_date) if request.end_date else None

    try:
        project = Project(
            name=request.name,
            client_id=client.id,
            start_date=start_date_obj,
            end_date=end_date_obj,
            status_id=status_rec.id,
            description=request.description,
            is_deleted=False
        )
        db.add(project)
        db.flush()

        _audit(
            db,
            current_user,
            project.id,
            "project_created",
            new_value=_snapshot(project),
            changed_fields={"created": True}
        )
        db.commit()
    except Exception as e:
        db.rollback()
        raise e

    db.refresh(project)
    return _project_response(db, project)

@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: UUID,
    request: ProjectUpdateRequest,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_privileged_user),
):
    project = db.query(Project).filter(Project.id == project_id, Project.is_deleted == False).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    old = _snapshot(project)
    changed: Dict[str, Any] = {}

    if request.name is not None and request.name != project.name:
        changed["name"] = {"old": project.name, "new": request.name}
        project.name = request.name

    if request.client is not None:
        client = db.query(Client).filter(
            func.lower(Client.name) == request.client.strip().lower(),
            Client.is_deleted == False
        ).first()
        if not client:
            raise HTTPException(status_code=400, detail=f"Client '{request.client}' does not exist.")
        if client.id != project.client_id:
            changed["client_id"] = {"old": str(project.client_id), "new": str(client.id)}
            project.client_id = client.id

    if request.status is not None:
        status_val = request.status.strip().lower()
        status_rec = db.query(ProjectStatus).filter(ProjectStatus.name == status_val).first()
        if not status_rec:
            raise HTTPException(status_code=400, detail=f"Project status '{request.status}' does not exist.")
        if status_rec.id != project.status_id:
            changed["status_id"] = {"old": str(project.status_id), "new": str(status_rec.id)}
            project.status_id = status_rec.id

    if request.start_date is not None:
        start_date_obj = parse_date(request.start_date)
        if start_date_obj != project.start_date:
            changed["start_date"] = {
                "old": project.start_date.isoformat() if project.start_date else None,
                "new": start_date_obj.isoformat()
            }
            project.start_date = start_date_obj

    if request.end_date is not None:
        end_date_obj = parse_date(request.end_date) if request.end_date else None
        if end_date_obj != project.end_date:
            changed["end_date"] = {
                "old": project.end_date.isoformat() if project.end_date else None,
                "new": end_date_obj.isoformat() if end_date_obj else None
            }
            project.end_date = end_date_obj

    if request.description is not None and request.description != project.description:
        changed["description"] = {"old": project.description, "new": request.description}
        project.description = request.description

    if not changed:
        return _project_response(db, project)

    try:
        db.add(project)
        db.flush()

        _audit(
            db,
            current_user,
            project.id,
            "project_updated",
            old_value=old,
            new_value=_snapshot(project),
            changed_fields=changed
        )
        db.commit()
    except Exception as e:
        db.rollback()
        raise e

    db.refresh(project)
    return _project_response(db, project)

@router.delete("/{project_id}")
def delete_project(
    project_id: UUID,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_privileged_user),
):
    project = db.query(Project).filter(Project.id == project_id, Project.is_deleted == False).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    old = _snapshot(project)
    try:
        project.is_deleted = True
        project.deleted_at = datetime.utcnow()
        project.deleted_by = current_user.id
        db.add(project)
        db.flush()

        _audit(
            db,
            current_user,
            project.id,
            "project_deleted",
            old_value=old,
            changed_fields={"deleted": True}
        )
        db.commit()
    except Exception as e:
        db.rollback()
        raise e

    return {"status": "success", "message": "Project soft-deleted successfully."}


# ==========================================
# AI PLANNER TASKS BREAKDOWN ENDPOINTS
# ==========================================

@router.post("/{id}/generate-tasks")
async def generate_tasks_for_project(id: UUID, db: Session = Depends(get_db_session), current_user: User = Depends(require_privileged_user)):
    """
    Triggers the AI/Mock engine to generate tasks and subtasks for a project based on assigned modules.
    """
    project = db.query(Project).filter(Project.id == id, Project.is_deleted == False).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    # Fetch requirements and assignments
    requirements = db.query(ProjectRequirement).filter(ProjectRequirement.project_id == id).all()
    if not requirements:
        raise HTTPException(status_code=400, detail="No modules/requirements found for this project. Please analyze the project first.")

    assignments = db.query(ProjectAssignment).filter(ProjectAssignment.project_id == id).all()
    # Map requirements to resources (dictionary of requirement_id -> resource_id)
    req_to_resource = {a.requirement_id: a.resource_id for a in assignments}

    # Format requirements for planner
    req_dicts = []
    for r in requirements:
        req_dicts.append({
            "id": r.id,
            "module_name": r.module_name,
            "description": r.description,
            "estimated_hours": r.estimated_hours,
            "priority": r.priority
        })

    # Call AI Task Planner
    planned = await TaskPlanner.plan_tasks(project.name, req_dicts, project.end_date)
    
    # Sort tasks topologically
    sorted_tasks = DependencyAnalyzer.topological_sort(planned.model_dump()["tasks"])

    try:
        # Clear previous tasks/dependencies/schedule entries for this project to start fresh
        db.query(ProjectTask).filter(ProjectTask.project_id == id).delete()
        db.flush()

        # Map to track generated task temp_id -> ProjectTask DB model instance
        temp_id_map = {}
        saved_tasks_list = []

        # Insert tasks and subtasks
        for t in sorted_tasks:
            # Resolve target module/requirement ID by matching names
            req_id = None
            for r in requirements:
                if r.module_name.lower().strip() in t["task_name"].lower() or t["task_name"].lower() in r.module_name.lower().strip() or "generic" in r.module_name.lower():
                    req_id = r.id
                    break
            if not req_id:
                req_id = requirements[0].id

            # Resolve assigned resource
            resource_id = req_to_resource.get(req_id)

            # Create parent task
            db_task = ProjectTask(
                project_id=id,
                requirement_id=req_id,
                resource_id=resource_id,
                parent_task_id=None,
                task_name=t["task_name"],
                description=t.get("description"),
                estimated_hours=t["estimated_hours"],
                priority=t.get("priority", "Medium"),
                status="pending"
            )
            db.add(db_task)
            db.flush() # populated db_task.id

            temp_id_map[t["temp_id"]] = db_task
            saved_tasks_list.append(db_task)

            # Create subtasks if any
            for sub in t.get("subtasks", []):
                db_sub = ProjectTask(
                    project_id=id,
                    requirement_id=req_id,
                    resource_id=resource_id,
                    parent_task_id=db_task.id,
                    task_name=sub["task_name"],
                    description=sub.get("description"),
                    estimated_hours=sub["estimated_hours"],
                    priority=sub.get("priority", "Medium"),
                    status="pending"
                )
                db.add(db_sub)

        # Insert dependencies
        for t in sorted_tasks:
            current_db_task = temp_id_map.get(t["temp_id"])
            if not current_db_task:
                continue

            for dep_temp_id in t.get("depends_on", []):
                dep_db_task = temp_id_map.get(dep_temp_id)
                if dep_db_task:
                    dependency = TaskDependency(
                        task_id=current_db_task.id,
                        depends_on_task_id=dep_db_task.id
                    )
                    db.add(dependency)

        db.flush()

        # Re-run DailyTaskScheduler to assign schedule dates and entries
        DailyTaskScheduler.schedule_tasks(db, str(id), project.start_date, saved_tasks_list)

        db.commit()
    except Exception as e:
        db.rollback()
        raise e

    return {"status": "success", "message": "Tasks planned and calendar scheduled successfully."}


@router.get("/{id}/tasks")
def get_project_tasks(id: UUID, db: Session = Depends(get_db_session), current_user: User = Depends(require_current_user)):
    """
    Returns the task breakdown list for a project.
    """
    if current_user.role.name == "resource":
        assignment = db.query(ProjectAssignment).filter(
            ProjectAssignment.project_id == id,
            ProjectAssignment.resource_id == current_user.resource_id
        ).first()
        if not assignment:
            raise HTTPException(status_code=403, detail="Access denied.")

    tasks = db.query(ProjectTask).filter(ProjectTask.project_id == id).all()
    
    # Format and return tasks
    result = []
    for t in tasks:
        # Load resource name
        resource_name = "Unassigned"
        if t.resource_id:
            res = db.query(Resource).filter(Resource.id == t.resource_id).first()
            if res:
                resource_name = res.full_name

        # Fetch dependency task names
        deps = db.query(TaskDependency).filter(TaskDependency.task_id == t.id).all()
        dep_task_ids = [str(d.depends_on_task_id) for d in deps]

        result.append({
            "id": str(t.id),
            "project_id": str(t.project_id),
            "requirement_id": t.requirement_id,
            "resource_id": str(t.resource_id) if t.resource_id else None,
            "resource_name": resource_name,
            "parent_task_id": str(t.parent_task_id) if t.parent_task_id else None,
            "task_name": t.task_name,
            "description": t.description,
            "estimated_hours": t.estimated_hours,
            "actual_hours": t.actual_hours,
            "priority": t.priority,
            "status": t.status,
            "start_date": t.start_date.isoformat() if t.start_date else None,
            "end_date": t.end_date.isoformat() if t.end_date else None,
            "depends_on": dep_task_ids
        })

    return result
