from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from backend.app.models.database import Resource, Task, Leave, Timesheet, TimesheetEntry, Project, TaskStatus, ResourceStatus, ProjectStatus
from backend.app.core.config import get_db_session

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/dashboard-kpis")
def get_dashboard_kpis(db: Session = Depends(get_db_session)):
    # 1. Total active resources count
    active_status = db.query(ResourceStatus).filter(ResourceStatus.name == "active").first()
    active_resources = db.query(Resource).filter(
        Resource.status_id == active_status.id if active_status else None,
        Resource.is_deleted == False
    ).count()

    # 2. Total tasks count
    total_tasks = db.query(Task).filter(Task.is_deleted == False).count()

    # 3. Pending leave requests count
    pending_leaves = db.query(Leave).filter(Leave.status == "pending", Leave.is_deleted == False).count()

    # 4. Total active projects count
    active_proj_status = db.query(ProjectStatus).filter(ProjectStatus.name == "active").first()
    active_projects = db.query(Project).filter(
        Project.status_id == active_proj_status.id if active_proj_status else None,
        Project.is_deleted == False
    ).count()

    return {
        "active_resources": active_resources,
        "total_tasks": total_tasks,
        "pending_leaves": pending_leaves,
        "active_projects": active_projects
    }


@router.get("/task-status-distribution")
def get_task_status_distribution(db: Session = Depends(get_db_session)):
    results = db.query(
        TaskStatus.name,
        func.count(Task.id)
    ).join(Task, Task.status_id == TaskStatus.id).filter(Task.is_deleted == False).group_by(TaskStatus.name).all()
    
    return [{"name": r[0], "value": r[1]} for r in results]


@router.get("/weekly-logged-hours")
def get_weekly_hours_trend(db: Session = Depends(get_db_session)):
    results = db.query(
        Timesheet.week_end_date,
        func.sum(TimesheetEntry.hours)
    ).join(TimesheetEntry, TimesheetEntry.timesheet_id == Timesheet.id).filter(
        Timesheet.status == "approved",
        Timesheet.is_deleted == False
    ).group_by(Timesheet.week_end_date).order_by(Timesheet.week_end_date.asc()).all()

    return [{"week": f"W{r[0].strftime('%V')}", "hours": float(r[1])} for r in results]
