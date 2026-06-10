from datetime import date
from typing import List, Optional, Any, Dict
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import desc
import logging

from backend.app.core.config import get_db_session
from backend.app.models.database import (
    DailyReport,
    DailyReportItem,
    ProjectTask,
    Project,
    Resource,
    ProjectAssignment,
    ReportAnalysisResult,
    ReportFlag,
    AuditLog,
    User
)
from backend.app.schemas.reports import (
    DailyReportCreate,
    DailyReportResponse,
    ProjectProgressResponse,
    ProductivityResponse,
    DailyReportItemResponse,
    ReportAnalysisResponse,
    ReportFlagResponse
)
from backend.app.services.ai.report_analyzer import ReportAnalyzer
from backend.app.services.progress_service import ProgressService
from backend.app.services.report_notification_service import ReportNotificationService
from backend.app.core.security import require_current_user, require_privileged_user

logger = logging.getLogger(__name__)

def _audit(
    db: Session,
    actor: User,
    record_id: UUID,
    action: str,
    old_value: Optional[Dict[str, Any]] = None,
    new_value: Optional[Dict[str, Any]] = None,
    changed_fields: Optional[Dict[str, Any]] = None,
):
    try:
        db.begin_nested()
        db.add(
            AuditLog(
                module="reports",
                action=action,
                table_name="daily_reports",
                record_id=record_id,
                old_value=old_value,
                new_value=new_value,
                changed_fields=changed_fields,
                user_id=actor.id,
            )
        )
        db.flush()
    except Exception:
        db.rollback()
        logger.exception("Audit log failure")

router = APIRouter(prefix="/reports", tags=["Reports Audit & Progress"])
projects_router = APIRouter(prefix="/projects", tags=["Project Reports & Metrics"])
resources_router = APIRouter(prefix="/resources", tags=["Resource Productivity"])


def _map_report_orm_to_schema(report: DailyReport, db: Session) -> DailyReportResponse:
    """
    Helper to map DailyReport ORM model to DailyReportResponse schema,
    resolving resource and project names.
    """
    # Use preloaded resource and project names
    res_name = report.resource.full_name if report.resource else "Unknown Resource"
    proj_name = report.project.name if report.project else "Unknown Project"

    # Map report items
    items_schema = []
    for it in report.items:
        task_name = it.task.task_name if it.task else "Unknown Task"
        items_schema.append(
            DailyReportItemResponse(
                id=it.id,
                report_id=it.report_id,
                task_id=it.task_id,
                task_name=task_name,
                hours_spent=float(it.hours_spent),
                completion_percent=it.completion_percent,
                comments=it.comments
            )
        )

    # Map analysis result
    analysis_schema = None
    if report.analysis_result:
        # Get warnings list
        warnings_list = [f.message for f in report.flags]
        analysis_schema = ReportAnalysisResponse(
            summary=report.analysis_result.summary,
            progress_score=report.analysis_result.progress_score,
            risk_level=report.analysis_result.risk_level,
            warnings=warnings_list
        )

    # Map flags
    flags_schema = [
        ReportFlagResponse(
            id=f.id,
            report_id=f.report_id,
            flag_type=f.flag_type,
            severity=f.severity,
            message=f.message,
            created_at=f.created_at
        ) for f in report.flags
    ]

    return DailyReportResponse(
        id=report.id,
        resource_id=report.resource_id,
        resource_name=res_name,
        project_id=report.project_id,
        project_name=proj_name,
        work_date=report.work_date,
        work_done=report.work_done,
        blockers=report.blockers,
        tomorrow_plan=report.tomorrow_plan,
        hours_worked=float(report.hours_worked),
        status=report.status,
        created_at=report.created_at,
        submitted_at=report.submitted_at,
        items=items_schema,
        analysis_result=analysis_schema,
        flags=flags_schema
    )


# ==========================================
# POST /api/reports - SUBMIT REPORT
# ==========================================

@router.post("", response_model=DailyReportResponse)
async def submit_daily_report(
    request: DailyReportCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_current_user)
):
    """
    Submits developer's daily work report. Saves data instantly and runs AI analysis asynchronously.
    """
    if not current_user.resource_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only resource accounts are authorized to submit daily reports."
        )
    resource_id = current_user.resource_id

    # Verify resource exists
    res = db.query(Resource).filter(Resource.id == resource_id, Resource.is_deleted == False).first()
    if not res:
        raise HTTPException(status_code=404, detail="Resource developer not found.")

    # Create overall daily report log
    db_report = DailyReport(
        resource_id=resource_id,
        project_id=request.project_id,
        work_date=request.work_date,
        work_done=request.work_done,
        blockers=request.blockers,
        tomorrow_plan=request.tomorrow_plan,
        hours_worked=request.hours_worked,
        status="pending"
    )
    db.add(db_report)
    db.flush()

    # Create task breakdown items
    for it in request.items:
        # Verify task belongs to resource
        task = db.query(ProjectTask).filter(ProjectTask.id == it.task_id).first()
        if not task:
            raise HTTPException(status_code=404, detail=f"Task ticket {it.task_id} not found.")

        db_item = DailyReportItem(
            report_id=db_report.id,
            task_id=it.task_id,
            hours_spent=it.hours_spent,
            completion_percent=it.completion_percent,
            comments=it.comments
        )
        db.add(db_item)

    _audit(
        db,
        current_user,
        db_report.id,
        "daily_report_submitted",
        new_value={
            "id": str(db_report.id),
            "resource_id": str(db_report.resource_id),
            "project_id": str(db_report.project_id),
            "work_date": db_report.work_date.isoformat() if db_report.work_date else None,
            "hours_worked": float(db_report.hours_worked),
        },
        changed_fields={"submitted": True}
    )

    db.commit()
    db.refresh(db_report)

    # Queue background task to run AI auditing and compliance checking
    background_tasks.add_task(ReportAnalyzer.analyze_report, db_report.id)
    
    # Also trigger compliance checks for alerts
    background_tasks.add_task(ReportNotificationService.generate_report_alerts)

    return _map_report_orm_to_schema(db_report, db)


# ==========================================
# GET /api/reports/my - DEV REPORT HISTORY
# ==========================================

@router.get("/my", response_model=List[DailyReportResponse])
def get_my_reports(
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_current_user)
):
    """
    Retrieves report history list for authenticated developer.
    """
    if not current_user.resource_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only resource accounts hold report history."
        )
    reports = db.query(DailyReport).options(
        joinedload(DailyReport.resource),
        joinedload(DailyReport.project),
        selectinload(DailyReport.items).joinedload(DailyReportItem.task),
        selectinload(DailyReport.flags),
        joinedload(DailyReport.analysis_result)
    ).filter(
        DailyReport.resource_id == current_user.resource_id
    ).order_by(desc(DailyReport.work_date)).all()

    return [_map_report_orm_to_schema(r, db) for r in reports]


# ==========================================
# GET /api/reports/missing - TEAM GAPS AUDIT
# ==========================================

@router.get("/missing")
def get_missing_reports(
    work_date: Optional[date] = None,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_privileged_user)
):
    """
    Audits missing daily logs across all developers active on projects.
    """
    check_day = work_date or date.today()
    if check_day.weekday() >= 5:
        # Weekends have no mandatory reporting
        return []

    # Get active project assignments
    assignments = db.query(ProjectAssignment).join(Project).filter(Project.is_deleted == False).all()
    
    missing_list = []
    for assign in assignments:
        has_log = db.query(DailyReport).filter(
            DailyReport.project_id == assign.project_id,
            DailyReport.resource_id == assign.resource_id,
            DailyReport.work_date == check_day
        ).first()

        if not has_log:
            res = db.query(Resource).filter(Resource.id == assign.resource_id, Resource.is_deleted == False).first()
            proj = db.query(Project).filter(Project.id == assign.project_id).first()
            
            missing_list.append({
                "resource_id": assign.resource_id,
                "resource_name": res.full_name if res else "Unknown Resource",
                "project_id": assign.project_id,
                "project_name": proj.name if proj else "Unknown Project",
                "work_date": check_day
            })

    return missing_list


# ==========================================
# POST /api/reports/{id}/analyze - MANUAL AUDIT
# ==========================================

@router.post("/{id}/analyze", response_model=DailyReportResponse)
async def manual_analyze_report(
    id: UUID,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_privileged_user)
):
    """
    Allows manual recalculation and auditing of validation flags.
    """
    analysis_res = await ReportAnalyzer.analyze_report(id, db)
    if not analysis_res:
        raise HTTPException(status_code=404, detail="Daily report not found.")

    report = db.query(DailyReport).filter(DailyReport.id == id).first()

    _audit(
        db,
        current_user,
        report.id,
        "daily_report_analyzed",
        new_value={
            "id": str(report.id),
            "summary": report.analysis_result.summary if report.analysis_result else None,
            "progress_score": report.analysis_result.progress_score if report.analysis_result else None,
        },
        changed_fields={"analyzed": True}
    )
    db.commit()

    return _map_report_orm_to_schema(report, db)


# ==========================================
# GET /api/projects/{id}/reports - PROJECT AUDIT
# ==========================================

@projects_router.get("/{id}/reports", response_model=List[DailyReportResponse])
def get_project_reports(
    id: UUID,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_current_user)
):
    """
    Retrieves all submissions logged against a project.
    """
    reports = db.query(DailyReport).options(
        joinedload(DailyReport.resource),
        joinedload(DailyReport.project),
        selectinload(DailyReport.items).joinedload(DailyReportItem.task),
        selectinload(DailyReport.flags),
        joinedload(DailyReport.analysis_result)
    ).filter(
        DailyReport.project_id == id
    ).order_by(desc(DailyReport.work_date)).all()

    return [_map_report_orm_to_schema(r, db) for r in reports]


# ==========================================
# GET /api/projects/{id}/progress - PROGRESS AGGREGATES
# ==========================================

@projects_router.get("/{id}/progress", response_model=ProjectProgressResponse)
def get_project_progress(
    id: UUID,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_current_user)
):
    """
    Calculates overall project and module weighted task progress.
    """
    progress = ProgressService.calculate_project_progress(id, db)
    if not progress:
        raise HTTPException(status_code=404, detail="Project progress data could not be computed.")

    return progress


# ==========================================
# GET /api/projects/{id}/productivity - TEAM METRICS
# ==========================================

@projects_router.get("/{id}/productivity", response_model=ProductivityResponse)
def get_project_productivity(
    id: UUID,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_current_user)
):
    """
    Aggregates efficiency scores and streak metrics across a project team.
    """
    prod = ProgressService.get_project_productivity(id, db)
    if not prod:
        raise HTTPException(status_code=404, detail="Project productivity data could not be computed.")

    return prod


# ==========================================
# GET /api/resources/{id}/productivity - DEV METRICS
# ==========================================

@resources_router.get("/{id}/productivity", response_model=ProductivityResponse)
def get_resource_productivity(
    id: UUID,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_current_user)
):
    """
    Retrieves streak, tasks completed, and efficiency scores for a developer.
    """
    if current_user.role.name not in ["super_admin", "admin"] and id != current_user.resource_id:
        raise HTTPException(status_code=403, detail="Access denied.")

    prod = ProgressService.get_resource_productivity(id, db)
    if not prod:
        raise HTTPException(status_code=404, detail="Developer productivity metrics not found.")

    return prod
