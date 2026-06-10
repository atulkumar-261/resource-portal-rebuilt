from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import func

from backend.app.core.config import get_db_session
from backend.app.core.security import require_privileged_user, require_current_user
from backend.app.models.database import Timesheet, TimesheetEntry, Resource, User, AuditLog, Project, Approval
from backend.app.schemas.timesheet import (
    TimesheetSubmitRequest,
    TimesheetApprovalRequest,
)
from backend.app.services.timesheet_service import TimesheetService
from backend.app.repositories.timesheet_repository import TimesheetRepository

router = APIRouter(prefix="/timesheets", tags=["Timesheets"])

def _snapshot(ts: Timesheet) -> Dict[str, Any]:
    return {
        "id": str(ts.id),
        "resource_id": str(ts.resource_id),
        "week_end_date": ts.week_end_date.isoformat() if ts.week_end_date else None,
        "status": ts.status,
    }

def _audit(
    db: Session,
    actor: User,
    ts_id: UUID,
    action: str,
    old_value: Optional[Dict[str, Any]] = None,
    new_value: Optional[Dict[str, Any]] = None,
    changed_fields: Optional[Dict[str, Any]] = None,
):
    try:
        db.begin_nested()
        db.add(
            AuditLog(
                module="timesheets",
                action=action,
                table_name="timesheets",
                record_id=ts_id,
                old_value=old_value,
                new_value=new_value,
                changed_fields=changed_fields,
                user_id=actor.id,
            )
        )
        db.flush()
    except Exception:
        db.rollback()
        import logging
        logger = logging.getLogger(__name__)
        logger.exception("Audit log failure")

def _timesheet_response(db: Session, ts: Timesheet) -> Dict[str, Any]:
    res_name = ts.resource.full_name if ts.resource else "Unknown Resource"
    
    # Use preloaded entries to sum total hours and extract projects
    entries = ts.entries or []
    total_hours = sum(float(e.hours) for e in entries)

    # Get unique project names from entries' project relationship
    proj_names = ", ".join(list({e.project.name for e in entries if e.project}))

    # Build dailyHours (7 days of the week starting Mon to Sun)
    mon_date = ts.week_end_date - timedelta(days=6)
    daily_map = {mon_date + timedelta(days=i): 0.0 for i in range(7)}
    for e in entries:
        if e.work_date in daily_map:
            daily_map[e.work_date] += float(e.hours)
    daily_hours = [daily_map[ts.week_end_date - timedelta(days=6-i)] for i in range(7)]

    # Calculate week number of year
    week_number = ts.week_end_date.isocalendar()[1]

    return {
        "id": str(ts.id),
        "resourceId": str(ts.resource_id),
        "resourceName": res_name,
        "weekNumber": week_number,
        "weekEndDate": ts.week_end_date.isoformat(),
        "totalHours": float(total_hours),
        "status": ts.status,
        "projectName": proj_names,
        "dailyHours": daily_hours,
        "entries": [
            {
                "id": str(e.id),
                "projectId": str(e.project_id),
                "projectName": e.project.name if e.project else "Unknown Project",
                "workDate": e.work_date.isoformat(),
                "hours": float(e.hours),
                "remarks": e.remarks
            } for e in entries
        ]
    }

@router.get("")
def list_timesheets(
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_current_user),
):
    query = db.query(Timesheet).options(
        joinedload(Timesheet.resource),
        selectinload(Timesheet.entries).joinedload(TimesheetEntry.project)
    ).filter(Timesheet.is_deleted == False)
    # Filter by resource unless they are admin/superadmin
    if current_user.role.name not in ["super_admin", "admin"]:
        if not current_user.resource_id:
            raise HTTPException(status_code=403, detail="Not authorized.")
        query = query.filter(Timesheet.resource_id == current_user.resource_id)

    timesheets = query.order_by(Timesheet.week_end_date.desc()).all()
    return [_timesheet_response(db, ts) for ts in timesheets]

@router.get("/{timesheet_id}")
def get_timesheet(
    timesheet_id: UUID,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_current_user),
):
    ts = db.query(Timesheet).filter(Timesheet.id == timesheet_id, Timesheet.is_deleted == False).first()
    if not ts:
        raise HTTPException(status_code=404, detail="Timesheet not found.")
        
    # Security check: must be admin or own timesheet
    if current_user.role.name == "resource":
        if ts.resource_id != current_user.resource_id:
            raise HTTPException(
                status_code=403,
                detail="Access denied."
            )
        
    return _timesheet_response(db, ts)

@router.post("/", status_code=status.HTTP_201_CREATED)
def submit_weekly_timesheet(
    request: TimesheetSubmitRequest,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_current_user),
):
    if not current_user.resource_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only resource accounts are authorized to submit timesheets."
        )

    # Re-verify resource exists and isn't deleted
    res = db.query(Resource).filter(Resource.id == current_user.resource_id, Resource.is_deleted == False).first()
    if not res:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource profile not found.")

    ts = TimesheetService.submit_timesheet(
        db=db,
        resource_id=current_user.resource_id,
        user_id=current_user.id,
        request=request
    )

    _audit(
        db,
        current_user,
        ts.id,
        "timesheet_submitted",
        new_value=_snapshot(ts),
        changed_fields={"submitted": True}
    )
    db.commit()
    db.refresh(ts)

    return _timesheet_response(db, ts)

@router.get("/my-history")
def get_personal_timesheet_history(
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_current_user),
):
    if not current_user.resource_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only resource accounts hold timesheet logs."
        )
    timesheets = TimesheetRepository.get_all_by_resource(db, current_user.resource_id)
    return [_timesheet_response(db, ts) for ts in timesheets]

@router.put("/{timesheet_id}/approve")
def approve_or_reject_timesheet(
    timesheet_id: UUID,
    request: TimesheetApprovalRequest,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_privileged_user),
):
    ts = db.query(Timesheet).filter(Timesheet.id == timesheet_id, Timesheet.is_deleted == False).first()
    if not ts:
        raise HTTPException(status_code=404, detail="Timesheet not found.")

    old = _snapshot(ts)
    new_status = request.status.lower().strip()

    ts = TimesheetService.approve_or_reject_timesheet(
        db=db,
        timesheet_id=timesheet_id,
        approved_by=current_user.id,
        approval_status=new_status,
        remarks=request.remarks
    )

    _audit(
        db,
        current_user,
        ts.id,
        f"timesheet_{new_status}",
        old_value=old,
        new_value=_snapshot(ts),
        changed_fields={"status": {"old": old["status"], "new": new_status}}
    )
    db.commit()
    db.refresh(ts)

    return _timesheet_response(db, ts)

@router.delete("/{timesheet_id}")
def delete_timesheet(
    timesheet_id: UUID,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_current_user),
):
    ts = db.query(Timesheet).filter(Timesheet.id == timesheet_id, Timesheet.is_deleted == False).first()
    if not ts:
        raise HTTPException(status_code=404, detail="Timesheet not found.")

    # Privilege check: must be admin or the owner
    if current_user.role.name == "resource":
        if ts.resource_id != current_user.resource_id:
            raise HTTPException(
                status_code=403,
                detail="Access denied."
            )

    if current_user.role.name not in ["super_admin", "admin"] and ts.status != "pending":
        raise HTTPException(status_code=400, detail="Cannot delete a timesheet that is already approved or rejected.")

    old = _snapshot(ts)
    
    # Soft delete via repository helper
    TimesheetRepository.soft_delete(db, timesheet_id, current_user.id)
    
    _audit(
        db,
        current_user,
        ts.id,
        "timesheet_deleted",
        old_value=old,
        changed_fields={"deleted": True}
    )
    db.commit()
    return {"status": "success", "message": "Timesheet soft-deleted successfully."}
