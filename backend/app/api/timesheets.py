from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.schemas.timesheet import (
    TimesheetSubmitRequest,
    TimesheetHeaderResponse,
    TimesheetApprovalRequest,
)
from backend.app.services.timesheet_service import TimesheetService
from backend.app.repositories.timesheet_repository import TimesheetRepository

# Placeholder dependencies for DB and Auth context (usually configured in core/dependencies.py)
def get_db() -> Session:
    # Yields DB session
    pass

class CurrentUser:
    def __init__(self, user_id: UUID, resource_id: UUID, role: str):
        self.id = user_id
        self.resource_id = resource_id
        self.role = role

def get_current_user() -> CurrentUser:
    # Extracts user context from JWT token
    pass

router = APIRouter(prefix="/timesheets", tags=["Timesheets"])


@router.post("/", response_model=TimesheetHeaderResponse, status_code=status.HTTP_201_CREATED)
def submit_weekly_timesheet(
    request: TimesheetSubmitRequest,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    if not user.resource_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only resource accounts are authorized to submit timesheets."
        )
    return TimesheetService.submit_timesheet(
        db=db,
        resource_id=user.resource_id,
        user_id=user.id,
        request=request
    )


@router.get("/my-history", response_model=List[TimesheetHeaderResponse])
def get_personal_timesheet_history(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    if not user.resource_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only resource accounts hold timesheet logs."
        )
    return TimesheetRepository.get_all_by_resource(db, user.resource_id)


@router.put("/{timesheet_id}/approve", response_model=TimesheetHeaderResponse)
def approve_or_reject_timesheet(
    timesheet_id: UUID,
    request: TimesheetApprovalRequest,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrative roles are authorized to approve timesheets."
        )
    return TimesheetService.approve_or_reject_timesheet(
        db=db,
        timesheet_id=timesheet_id,
        approved_by=user.id,
        approval_status=request.status,
        remarks=request.remarks
    )
