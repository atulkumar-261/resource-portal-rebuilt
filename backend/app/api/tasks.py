from uuid import UUID
from datetime import date, datetime
from typing import List, Optional, Dict, Any
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
    Task,
    TaskStatus,
    User
)
from backend.app.core.config import get_db_session
from backend.app.core.security import require_privileged_user, require_current_user
from backend.app.schemas.ai import (
    TaskPlanResponse,
    TaskScheduleRequest,
    TaskLogTimeRequest,
    TaskReassignRequest
)
from backend.app.schemas.tasks import TaskCreateRequest, TaskUpdateRequest, TaskResponse
from backend.app.services.ai.task_planner import TaskPlanner
from backend.app.services.ai.dependency_analyzer import DependencyAnalyzer
from backend.app.services.ai.daily_task_scheduler import DailyTaskScheduler
from backend.app.services.ai.workload_service import WorkloadService
from backend.app.services.resource_eligibility import validate_resource_assignable

# APIRouters
router = APIRouter(prefix="/tasks", tags=["Tasks"])
task_resources_router = APIRouter(prefix="/resources", tags=["Resources Overrides"])


# Legacy status request validation
class TaskStatusUpdateRequest(BaseModel):
    status: str = Field(..., description="Must be pending, in-progress, completed, or wanting-requirements.")


def parse_date(date_str: Optional[str]) -> Optional[date]:
    if not date_str:
        return None
    for fmt in ("%Y-%m-%d", "%d-%m-%Y"):
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    raise HTTPException(status_code=400, detail=f"Invalid date format: {date_str}. Expected YYYY-MM-DD or DD-MM-YYYY.")


def _snapshot(task: Task) -> Dict[str, Any]:
    return {
        "id": str(task.id),
        "subject": task.subject,
        "start_date": task.start_date.isoformat() if task.start_date else None,
        "resource_id": str(task.resource_id),
        "project_id": str(task.project_id),
        "notes": task.notes,
        "status_id": str(task.status_id),
    }


from backend.app.services.audit_service import AuditService


def _audit(
    db: Session,
    actor: User,
    task_id: UUID,
    action: str,
    old_value: Optional[Dict[str, Any]] = None,
    new_value: Optional[Dict[str, Any]] = None,
    changed_fields: Optional[Dict[str, Any]] = None,
):
    AuditService.record(
        db=db,
        actor_id=actor.id,
        module="tasks",
        action=action,
        table_name="tasks",
        record_id=task_id,
        old_value=old_value,
        new_value=new_value,
        changed_fields=changed_fields
    )


def _task_response(db: Session, task: Task) -> TaskResponse:
    # Resolve resource name
    if task.resource:
        res_name = task.resource.full_name
    else:
        res = db.query(Resource).filter(Resource.id == task.resource_id).first()
        res_name = res.full_name if res else "Unknown Resource"

    # Resolve project name
    if task.project:
        proj_name = task.project.name
    else:
        proj = db.query(Project).filter(Project.id == task.project_id).first()
        proj_name = proj.name if proj else "Unknown Project"

    # Resolve status name
    if task.status:
        status_name = task.status.name
    else:
        status_rec = db.query(TaskStatus).filter(TaskStatus.id == task.status_id).first()
        status_name = status_rec.name if status_rec else "pending"

    return TaskResponse(
        id=task.id,
        subject=task.subject,
        startDate=task.start_date.isoformat() if task.start_date else "",
        resourceId=task.resource_id,
        resourceName=res_name,
        project=proj_name,
        project_id=task.project_id,
        notes=task.notes,
        status=status_name
    )


# ==========================================
# ADMINISTRATIVE CRUD ENDPOINTS
# ==========================================

@router.get("", response_model=List[TaskResponse])
def get_tasks(
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_current_user),
):
    from sqlalchemy.orm import joinedload
    tasks = db.query(Task).options(
        joinedload(Task.resource),
        joinedload(Task.project),
        joinedload(Task.status)
    ).filter(Task.is_deleted == False).order_by(Task.created_at.desc()).all()
    return [_task_response(db, t) for t in tasks]


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    request: TaskCreateRequest,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_privileged_user),
):
    # Resolve Resource ID
    resource = db.query(Resource).filter(Resource.id == request.resource_id, Resource.is_deleted == False).first()
    if not resource:
        raise HTTPException(status_code=400, detail="Resource not found or deleted.")
    validate_resource_assignable(resource)

    # Resolve Project Name
    proj = db.query(Project).filter(
        func.lower(Project.name) == request.project.strip().lower(),
        Project.is_deleted == False
    ).first()
    if not proj:
        raise HTTPException(status_code=400, detail=f"Project '{request.project}' does not exist.")

    # Resolve Default Task Status ('pending')
    status_rec = db.query(TaskStatus).filter(TaskStatus.name == "pending").first()
    if not status_rec:
        raise HTTPException(status_code=500, detail="Default task status 'pending' is not configured.")

    start_date_obj = parse_date(request.start_date)

    try:
        task = Task(
            subject=request.subject,
            start_date=start_date_obj,
            resource_id=resource.id,
            project_id=proj.id,
            notes=request.notes,
            status_id=status_rec.id,
            is_deleted=False
        )
        db.add(task)
        db.flush()

        _audit(
            db,
            current_user,
            task.id,
            "task_created",
            new_value=_snapshot(task),
            changed_fields={"created": True}
        )
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database transaction failed: {str(e)}")

    db.refresh(task)
    return _task_response(db, task)


@router.put("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: UUID,
    request: TaskUpdateRequest,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_privileged_user),
):
    task = db.query(Task).filter(Task.id == task_id, Task.is_deleted == False).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    old = _snapshot(task)
    changed: Dict[str, Any] = {}

    if request.subject is not None and request.subject != task.subject:
        changed["subject"] = {"old": task.subject, "new": request.subject}
        task.subject = request.subject

    if request.start_date is not None:
        start_date_obj = parse_date(request.start_date)
        if start_date_obj != task.start_date:
            changed["start_date"] = {
                "old": task.start_date.isoformat() if task.start_date else None,
                "new": start_date_obj.isoformat()
            }
            task.start_date = start_date_obj

    if request.resource_id is not None and request.resource_id != task.resource_id:
        res = db.query(Resource).filter(Resource.id == request.resource_id, Resource.is_deleted == False).first()
        if not res:
            raise HTTPException(status_code=400, detail="Resource not found.")
        validate_resource_assignable(res)
        changed["resource_id"] = {"old": str(task.resource_id), "new": str(res.id)}
        task.resource_id = res.id

    if request.project is not None:
        proj = db.query(Project).filter(
            func.lower(Project.name) == request.project.strip().lower(),
            Project.is_deleted == False
        ).first()
        if not proj:
            raise HTTPException(status_code=400, detail=f"Project '{request.project}' does not exist.")
        if proj.id != task.project_id:
            changed["project_id"] = {"old": str(task.project_id), "new": str(proj.id)}
            task.project_id = proj.id

    if request.notes is not None and request.notes != task.notes:
        changed["notes"] = {"old": task.notes, "new": request.notes}
        task.notes = request.notes

    if request.status is not None:
        status_val = request.status.strip().lower()
        status_rec = db.query(TaskStatus).filter(TaskStatus.name == status_val).first()
        if not status_rec:
            raise HTTPException(status_code=400, detail=f"Task status '{request.status}' does not exist.")
        if status_rec.id != task.status_id:
            changed["status_id"] = {"old": str(task.status_id), "new": str(status_rec.id)}
            task.status_id = status_rec.id

    if not changed:
        return _task_response(db, task)

    task.created_at = datetime.utcnow()
    try:
        db.add(task)
        db.flush()

        _audit(
            db,
            current_user,
            task.id,
            "task_updated",
            old_value=old,
            new_value=_snapshot(task),
            changed_fields=changed
        )
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database transaction failed: {str(e)}")

    db.refresh(task)
    return _task_response(db, task)


@router.delete("/{task_id}")
def delete_task(
    task_id: UUID,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_privileged_user),
):
    task = db.query(Task).filter(Task.id == task_id, Task.is_deleted == False).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    old = _snapshot(task)
    try:
        task.is_deleted = True
        task.deleted_at = datetime.utcnow()
        task.deleted_by = current_user.id
        db.add(task)
        db.flush()

        _audit(
            db,
            current_user,
            task.id,
            "task_deleted",
            old_value=old,
            changed_fields={"deleted": True}
        )
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database transaction failed: {str(e)}")

    return {"status": "success", "message": "Task soft-deleted successfully."}


# ==========================================
# LEGACY TASKS SUPPORT
# ==========================================

@router.get("/assigned/{resource_id}")
def get_assigned_tasks(
    resource_id: UUID,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_current_user)
):
    if current_user.role.name not in ["super_admin", "admin"] and resource_id != current_user.resource_id:
        raise HTTPException(status_code=403, detail="Access denied.")
    return db.query(Task).filter(Task.resource_id == resource_id, Task.is_deleted == False).all()


@router.put("/{task_id}/status")
def update_task_status(
    task_id: UUID,
    request: TaskStatusUpdateRequest,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_current_user)
):
    task = db.query(Task).filter(Task.id == task_id, Task.is_deleted == False).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task ticket not found.")

    if current_user.role.name not in ["super_admin", "admin"] and task.resource_id != current_user.resource_id:
        raise HTTPException(status_code=403, detail="Access denied.")

    status_val = request.status.lower().strip()
    valid_statuses = ["pending", "in-progress", "completed", "wanting-requirements"]
    if status_val not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status state. Choose from {valid_statuses}")

    status_rec = db.query(TaskStatus).filter(TaskStatus.name == status_val).first()
    
    if status_rec:
        task.status_id = status_rec.id
        try:
            db.add(task)
            db.commit()
            db.refresh(task)
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Database transaction failed: {str(e)}")

    return {"task_id": task.id, "status": status_val, "message": "Task status updated successfully."}


# ==========================================
# RESOURCE TASK ACTIONS & SCHEDULING
# ==========================================

@router.post("/assign")
def reassign_task(
    request: TaskReassignRequest,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_privileged_user)
):
    """
    Reassigns a task to a different resource and recalculates scheduling.
    """
    task = db.query(ProjectTask).filter(ProjectTask.id == request.task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    if request.resource_id:
        res = db.query(Resource).filter(Resource.id == request.resource_id, Resource.is_deleted == False).first()
        if not res:
            raise HTTPException(status_code=400, detail="Resource not found or deleted.")
        validate_resource_assignable(res)

    from backend.app.services.transaction_service import transactional

    with transactional(db):
        task.resource_id = request.resource_id
        db.flush()

        # Recalculate schedule entries for the project
        project = db.query(Project).filter(Project.id == task.project_id).first()
        project_tasks = db.query(ProjectTask).filter(ProjectTask.project_id == task.project_id).all()
        DailyTaskScheduler.schedule_tasks(db, str(task.project_id), project.start_date, project_tasks)

    return {"status": "success", "message": "Task reassigned and project schedule updated successfully."}


@router.post("/{id}/start")
def start_project_task(
    id: UUID,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_current_user)
):
    """
    Transition project task status to in_progress and log activity.
    """
    task = db.query(ProjectTask).filter(ProjectTask.id == id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    if current_user.role.name not in ["super_admin", "admin"] and task.resource_id != current_user.resource_id:
        raise HTTPException(status_code=403, detail="Access denied.")

    task.status = "in_progress"
    log = TaskActivityLog(
        task_id=task.id,
        resource_id=task.resource_id,
        action="started"
    )
    try:
        db.add(log)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database transaction failed: {str(e)}")

    return {"status": "success", "message": "Task started.", "task_id": str(task.id), "status_state": "in_progress"}


@router.post("/{id}/pause")
def pause_project_task(
    id: UUID,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_current_user)
):
    """
    Transition project task status to paused and log activity.
    """
    task = db.query(ProjectTask).filter(ProjectTask.id == id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    if current_user.role.name not in ["super_admin", "admin"] and task.resource_id != current_user.resource_id:
        raise HTTPException(status_code=403, detail="Access denied.")

    task.status = "paused"
    log = TaskActivityLog(
        task_id=task.id,
        resource_id=task.resource_id,
        action="paused"
    )
    try:
        db.add(log)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database transaction failed: {str(e)}")

    return {"status": "success", "message": "Task paused.", "task_id": str(task.id), "status_state": "paused"}


@router.post("/{id}/complete")
def complete_project_task(
    id: UUID,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_current_user)
):
    """
    Transition project task status to completed and log activity.
    """
    task = db.query(ProjectTask).filter(ProjectTask.id == id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    if current_user.role.name not in ["super_admin", "admin"] and task.resource_id != current_user.resource_id:
        raise HTTPException(status_code=403, detail="Access denied.")

    task.status = "completed"
    log = TaskActivityLog(
        task_id=task.id,
        resource_id=task.resource_id,
        action="completed"
    )
    try:
        db.add(log)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database transaction failed: {str(e)}")

    return {"status": "success", "message": "Task completed.", "task_id": str(task.id), "status_state": "completed"}


@router.post("/{id}/log-time")
def log_task_time(
    id: UUID,
    request: TaskLogTimeRequest,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_current_user)
):
    """
    Logs effort hours for a project task, updates actual_hours, and records activity.
    """
    task = db.query(ProjectTask).filter(ProjectTask.id == id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    if current_user.role.name not in ["super_admin", "admin"] and task.resource_id != current_user.resource_id:
        raise HTTPException(status_code=403, detail="Access denied.")

    # Create log entry
    time_log = TaskTimeLog(
        task_id=task.id,
        resource_id=task.resource_id if task.resource_id else UUID("00000000-0000-0000-0000-000000000000"),
        hours_logged=request.hours_logged,
        notes=request.notes
    )
    try:
        db.add(time_log)
        db.flush()

        # Sum total actual hours for this task
        total_hours = db.query(func.coalesce(func.sum(TaskTimeLog.hours_logged), 0)).filter(
            TaskTimeLog.task_id == task.id
        ).scalar()

        task.actual_hours = int(total_hours)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database transaction failed: {str(e)}")

    return {"status": "success", "message": "Time logged successfully.", "actual_hours": task.actual_hours}


@task_resources_router.get("/{id}/schedule")
def get_resource_calendar_schedule(
    id: UUID,
    start_date: date,
    end_date: date,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_current_user)
):
    """
    Retrieves daily tasks scheduled for a resource in a date range.
    """
    if current_user.role.name not in ["super_admin", "admin"] and id != current_user.resource_id:
        raise HTTPException(status_code=403, detail="Access denied.")
    return WorkloadService.get_resource_schedule(db, id, start_date, end_date)


@task_resources_router.get("/workload")
def get_all_resources_workload(
    start_date: date,
    end_date: date,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_current_user)
):
    """
    Retrieves workload loading percentages and overload flags for heatmaps.
    """
    return WorkloadService.get_resources_workload_summary(db, start_date, end_date)
