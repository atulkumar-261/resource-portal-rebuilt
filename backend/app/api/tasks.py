from uuid import UUID
from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.models.database import (
    Project,
    ProjectRequirement,
    ProjectAssignment,
    ProjectTask,
    TaskDependency,
    TaskActivityLog,
    TaskScheduleEntry,
    TaskTimeLog,
    Resource,
    Task
)
from backend.app.core.config import get_db_session
from backend.app.schemas.ai import (
    TaskPlanResponse,
    TaskScheduleRequest,
    TaskLogTimeRequest,
    TaskReassignRequest
)
from backend.app.services.ai.task_planner import TaskPlanner
from backend.app.services.ai.dependency_analyzer import DependencyAnalyzer
from backend.app.services.ai.daily_task_scheduler import DailyTaskScheduler
from backend.app.services.ai.workload_service import WorkloadService

# Root APIRouters
router = APIRouter(prefix="/tasks", tags=["Tasks"])
projects_router = APIRouter(prefix="/projects", tags=["Projects"])
task_resources_router = APIRouter(prefix="/resources", tags=["Resources Overrides"])


# Legacy status request validation
class TaskStatusUpdateRequest(BaseModel):
    status: str = Field(..., description="Must be pending, in-progress, completed, or wanting-requirements.")


# ==========================================
# LEGACY TASKS SUPPORT
# ==========================================

@router.get("/assigned/{resource_id}")
def get_assigned_tasks(resource_id: UUID, db: Session = Depends(get_db_session)):
    return db.query(Task).filter(Task.resource_id == resource_id, Task.is_deleted == False).all()


@router.put("/{task_id}/status")
def update_task_status(task_id: UUID, request: TaskStatusUpdateRequest, db: Session = Depends(get_db_session)):
    task = db.query(Task).filter(Task.id == task_id, Task.is_deleted == False).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task ticket not found.")

    status_val = request.status.lower().strip()
    valid_statuses = ["pending", "in-progress", "completed", "wanting-requirements"]
    if status_val not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status state. Choose from {valid_statuses}")

    from backend.app.models.database import TaskStatus
    status_rec = db.query(TaskStatus).filter(TaskStatus.name == status_val).first()
    
    if status_rec:
        task.status_id = status_rec.id
        db.add(task)
        db.commit()
        db.refresh(task)

    return {"task_id": task.id, "status": status_val, "message": "Task status updated successfully."}


# ==========================================
# MILESTONE 2: AI TASK PLANNER ENDPOINTS
# ==========================================

@projects_router.post("/{id}/generate-tasks")
async def generate_tasks_for_project(id: UUID, db: Session = Depends(get_db_session)):
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

    # Clear previous tasks/dependencies/schedule entries for this project to start fresh
    db.query(ProjectTask).filter(ProjectTask.project_id == id).delete()
    db.commit()

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

    db.commit()

    # Re-run DailyTaskScheduler to assign schedule dates and entries
    # Reload saved tasks to get relationships
    all_saved_tasks = db.query(ProjectTask).filter(ProjectTask.project_id == id).all()
    # Sort them topologically in python using DB dependencies
    # To keep it simple, we process the list in the order we saved them (which was already topological sorted)
    topological_db_tasks = [temp_id_map[t["temp_id"]] for t in sorted_tasks if t["temp_id"] in temp_id_map]

    DailyTaskScheduler.schedule_tasks(db, str(id), project.start_date, topological_db_tasks)

    return {"status": "success", "message": "Tasks planned and calendar scheduled successfully."}


@projects_router.get("/{id}/tasks")
def get_project_tasks(id: UUID, db: Session = Depends(get_db_session)):
    """
    Returns the task breakdown list for a project.
    """
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


# ==========================================
# RESOURCE TASK ACTIONS & SCHEDULING
# ==========================================

@router.post("/assign")
def reassign_task(request: TaskReassignRequest, db: Session = Depends(get_db_session)):
    """
    Reassigns a task to a different resource and recalculates scheduling.
    """
    task = db.query(ProjectTask).filter(ProjectTask.id == request.task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    task.resource_id = request.resource_id
    db.commit()

    # Recalculate schedule entries for the project
    project = db.query(Project).filter(Project.id == task.project_id).first()
    project_tasks = db.query(ProjectTask).filter(ProjectTask.project_id == task.project_id).all()
    # Sort them in creation order (already topological)
    DailyTaskScheduler.schedule_tasks(db, str(task.project_id), project.start_date, project_tasks)

    return {"status": "success", "message": "Task reassigned and project schedule updated successfully."}


@router.post("/{id}/start")
def start_project_task(id: UUID, db: Session = Depends(get_db_session)):
    """
    Transition project task status to in_progress and log activity.
    """
    task = db.query(ProjectTask).filter(ProjectTask.id == id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    task.status = "in_progress"
    log = TaskActivityLog(
        task_id=task.id,
        resource_id=task.resource_id,
        action="started"
    )
    db.add(log)
    db.commit()

    return {"status": "success", "message": "Task started.", "task_id": str(task.id), "status_state": "in_progress"}


@router.post("/{id}/pause")
def pause_project_task(id: UUID, db: Session = Depends(get_db_session)):
    """
    Transition project task status to paused and log activity.
    """
    task = db.query(ProjectTask).filter(ProjectTask.id == id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    task.status = "paused"
    log = TaskActivityLog(
        task_id=task.id,
        resource_id=task.resource_id,
        action="paused"
    )
    db.add(log)
    db.commit()

    return {"status": "success", "message": "Task paused.", "task_id": str(task.id), "status_state": "paused"}


@router.post("/{id}/complete")
def complete_project_task(id: UUID, db: Session = Depends(get_db_session)):
    """
    Transition project task status to completed and log activity.
    """
    task = db.query(ProjectTask).filter(ProjectTask.id == id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    task.status = "completed"
    log = TaskActivityLog(
        task_id=task.id,
        resource_id=task.resource_id,
        action="completed"
    )
    db.add(log)
    db.commit()

    return {"status": "success", "message": "Task completed.", "task_id": str(task.id), "status_state": "completed"}


@router.post("/{id}/log-time")
def log_task_time(id: UUID, request: TaskLogTimeRequest, db: Session = Depends(get_db_session)):
    """
    Logs effort hours for a project task, updates actual_hours, and records activity.
    """
    task = db.query(ProjectTask).filter(ProjectTask.id == id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    # Create log entry
    time_log = TaskTimeLog(
        task_id=task.id,
        resource_id=task.resource_id if task.resource_id else UUID("00000000-0000-0000-0000-000000000000"), # fallback if unassigned
        hours_logged=request.hours_logged,
        notes=request.notes
    )
    db.add(time_log)
    db.flush()

    # Sum total actual hours for this task
    total_hours = db.query(func.coalesce(func.sum(TaskTimeLog.hours_logged), 0)).filter(
        TaskTimeLog.task_id == task.id
    ).scalar()

    task.actual_hours = int(total_hours)
    db.commit()

    return {"status": "success", "message": "Time logged successfully.", "actual_hours": task.actual_hours}


@task_resources_router.get("/{id}/schedule")
def get_resource_calendar_schedule(
    id: UUID,
    start_date: date,
    end_date: date,
    db: Session = Depends(get_db_session)
):
    """
    Retrieves daily tasks scheduled for a resource in a date range.
    """
    return WorkloadService.get_resource_schedule(db, id, start_date, end_date)


@task_resources_router.get("/workload")
def get_all_resources_workload(
    start_date: date,
    end_date: date,
    db: Session = Depends(get_db_session)
):
    """
    Retrieves workload loading percentages and overload flags for heatmaps.
    """
    return WorkloadService.get_resources_workload_summary(db, start_date, end_date)
