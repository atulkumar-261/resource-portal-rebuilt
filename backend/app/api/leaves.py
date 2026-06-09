from datetime import date
from typing import Optional
from uuid import UUID
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.models.database import Leave, LeaveBalance, LeaveType, Approval
from backend.app.core.config import get_db_session

router = APIRouter(prefix="/leaves", tags=["Leaves"])

class LeaveApplyRequest(BaseModel):
    leave_type_id: UUID
    from_date: date
    to_date: date
    reason: Optional[str] = None


@router.post("/apply")
def apply_leave(request: LeaveApplyRequest, resource_id: UUID, user_id: UUID, db: Session = Depends(get_db_session)):
    # Calculate leave duration
    total_days = (request.to_date - request.from_date).days + 1
    if total_days <= 0:
        raise HTTPException(status_code=400, detail="Invalid date range selected.")

    # Check leave type balance
    balance_record = db.query(LeaveBalance).filter(
        LeaveBalance.resource_id == resource_id,
        LeaveBalance.leave_type_id == request.leave_type_id
    ).first()

    if balance_record and balance_record.balance < total_days:
        raise HTTPException(status_code=400, detail="Insufficient leave balance.")

    # Create Leave Request
    db_leave = Leave(
        resource_id=resource_id,
        leave_type_id=request.leave_type_id,
        from_date=request.from_date,
        to_date=request.to_date,
        total_days=total_days,
        reason=request.reason,
        status="pending"
    )
    db.add(db_leave)
    db.flush()

    # Register approval workflow
    db_approval = Approval(
        module_name="leaves",
        record_id=db_leave.id,
        submitted_by=user_id,
        status="pending"
    )
    db.add(db_approval)
    db.commit()

    return {"leave_id": db_leave.id, "total_days": total_days, "status": "pending"}


@router.get("/my-history/{resource_id}")
def get_resource_leaves(resource_id: UUID, db: Session = Depends(get_db_session)):
    return db.query(Leave).filter(Leave.resource_id == resource_id, Leave.is_deleted == False).all()


@router.get("/balances/{resource_id}")
def get_resource_balances(resource_id: UUID, db: Session = Depends(get_db_session)):
    return db.query(LeaveBalance).filter(LeaveBalance.resource_id == resource_id).all()
