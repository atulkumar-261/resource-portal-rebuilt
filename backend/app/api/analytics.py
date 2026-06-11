from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from backend.app.models.database import Resource, Task, Leave, Timesheet, TimesheetEntry, Project, TaskStatus, ResourceStatus, ProjectStatus, User
from backend.app.core.config import get_db_session
from backend.app.core.security import require_current_user
from backend.app.services.resource_eligibility import is_resource_assignable

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/dashboard-kpis")
def get_dashboard_kpis(db: Session = Depends(get_db_session), current_user: User = Depends(require_current_user)):
    from sqlalchemy.orm import joinedload
    base_query = db.query(Resource).options(
        joinedload(Resource.status),
        joinedload(Resource.user)
    ).filter(Resource.is_deleted == False)
    resources = base_query.all()

    total_resources = len(resources)
    assignable_resources = sum(1 for r in resources if is_resource_assignable(r))
    pending_resources = db.query(Resource).filter(
        (Resource.approval_status == "pending") | (Resource.onboarding_status != "completed"),
        Resource.is_deleted == False
    ).count()
    rejected_resources = db.query(Resource).filter(
        Resource.approval_status == "rejected",
        Resource.is_deleted == False
    ).count()

    return {
        "total_resources": total_resources,
        "assignable_resources": assignable_resources,
        "pending_resources": pending_resources,
        "rejected_resources": rejected_resources
    }


@router.get("/task-status-distribution")
def get_task_status_distribution(db: Session = Depends(get_db_session), current_user: User = Depends(require_current_user)):
    results = db.query(
        TaskStatus.name,
        func.count(Task.id)
    ).join(Task, Task.status_id == TaskStatus.id).filter(Task.is_deleted == False).group_by(TaskStatus.name).all()
    
    return [{"name": r[0], "value": r[1]} for r in results]


@router.get("/weekly-logged-hours")
def get_weekly_hours_trend(db: Session = Depends(get_db_session), current_user: User = Depends(require_current_user)):
    results = db.query(
        Timesheet.week_end_date,
        func.sum(TimesheetEntry.hours)
    ).join(TimesheetEntry, TimesheetEntry.timesheet_id == Timesheet.id).filter(
        Timesheet.status == "approved",
        Timesheet.is_deleted == False
    ).group_by(Timesheet.week_end_date).order_by(Timesheet.week_end_date.asc()).all()

    return [{"week": f"W{r[0].strftime('%V')}", "hours": float(r[1])} for r in results]
