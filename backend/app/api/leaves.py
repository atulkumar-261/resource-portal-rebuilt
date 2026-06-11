from datetime import datetime, date
from typing import Optional, List, Dict, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.config import get_db_session
from backend.app.core.security import require_privileged_user, require_current_user
from backend.app.models.database import Leave, LeaveBalance, LeaveType, Approval, User, Resource
from backend.app.schemas.leaves import LeaveApplyRequest, LeaveResponse
from backend.app.services.resource_eligibility import validate_resource_assignable

router = APIRouter(prefix="/leaves", tags=["Leaves"])

def parse_date(date_str: Optional[str]) -> Optional[date]:
    if not date_str:
        return None
    for fmt in ("%Y-%m-%d", "%d-%m-%Y"):
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    raise HTTPException(status_code=400, detail=f"Invalid date format: {date_str}. Expected YYYY-MM-DD or DD-MM-YYYY.")

def _snapshot(leave: Leave) -> Dict[str, Any]:
    return {
        "id": str(leave.id),
        "resource_id": str(leave.resource_id),
        "leave_type_id": str(leave.leave_type_id),
        "from_date": leave.from_date.isoformat() if leave.from_date else None,
        "to_date": leave.to_date.isoformat() if leave.to_date else None,
        "total_days": leave.total_days,
        "reason": leave.reason,
        "status": leave.status,
    }

from backend.app.services.audit_service import AuditService


def _audit(
    db: Session,
    actor: User,
    leave_id: UUID,
    action: str,
    old_value: Optional[Dict[str, Any]] = None,
    new_value: Optional[Dict[str, Any]] = None,
    changed_fields: Optional[Dict[str, Any]] = None,
):
    AuditService.record(
        db=db,
        actor_id=actor.id,
        module="leaves",
        action=action,
        table_name="leaves",
        record_id=leave_id,
        old_value=old_value,
        new_value=new_value,
        changed_fields=changed_fields
    )

def _leave_response(db: Session, leave: Leave) -> LeaveResponse:
    # Resolve resource name
    res = db.query(Resource).filter(Resource.id == leave.resource_id).first()
    res_name = res.full_name if res else "Unknown Resource"

    # Resolve leave type name
    ltype = db.query(LeaveType).filter(LeaveType.id == leave.leave_type_id).first()
    ltype_name = ltype.name if ltype else "Annual"

    return LeaveResponse(
        id=leave.id,
        resourceId=leave.resource_id,
        resourceName=res_name,
        fromDate=leave.from_date.isoformat() if leave.from_date else "",
        toDate=leave.to_date.isoformat() if leave.to_date else "",
        totalDays=leave.total_days,
        type=ltype_name,
        reason=leave.reason,
        status=leave.status
    )

@router.get("", response_model=List[LeaveResponse])
def list_leaves(
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_current_user),
):
    # Admin gets all; regular user gets their own
    query = db.query(Leave).filter(Leave.is_deleted == False)
    if current_user.role.name not in ["super_admin", "admin"]:
        if not current_user.resource_id:
            raise HTTPException(status_code=403, detail="Only resource accounts hold leave records.")
        query = query.filter(Leave.resource_id == current_user.resource_id)
        
    leaves = query.order_by(Leave.created_at.desc()).all()
    return [_leave_response(db, l) for l in leaves]

@router.post("/apply", response_model=LeaveResponse)
def apply_leave(
    request: LeaveApplyRequest,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_current_user)
):
    if not current_user.resource_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only resource accounts are authorized to apply for leaves."
        )

    # Re-verify resource exists, isn't deleted, and is active & approved
    res = db.query(Resource).filter(Resource.id == current_user.resource_id, Resource.is_deleted == False).first()
    if not res:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource profile not found.")
    try:
        validate_resource_assignable(res)
    except HTTPException:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only active, approved, and fully onboarded resources can apply for leaves."
        )

    from_date_obj = parse_date(request.from_date)
    to_date_obj = parse_date(request.to_date)

    total_days = (to_date_obj - from_date_obj).days + 1
    if total_days <= 0:
        raise HTTPException(status_code=400, detail="Invalid date range selected.")

    # Check leave type balance
    balance_record = db.query(LeaveBalance).filter(
        LeaveBalance.resource_id == current_user.resource_id,
        LeaveBalance.leave_type_id == request.leave_type_id
    ).first()

    if balance_record and balance_record.balance < total_days:
        raise HTTPException(status_code=400, detail="Insufficient leave balance.")

    # Create Leave Request
    db_leave = Leave(
        resource_id=current_user.resource_id,
        leave_type_id=request.leave_type_id,
        from_date=from_date_obj,
        to_date=to_date_obj,
        total_days=total_days,
        reason=request.reason,
        status="pending",
        is_deleted=False
    )
    db.add(db_leave)
    db.flush()

    # Register approval workflow log
    db_approval = Approval(
        module_name="leaves",
        record_id=db_leave.id,
        submitted_by=current_user.id,
        status="pending"
    )
    db.add(db_approval)

    _audit(
        db,
        current_user,
        db_leave.id,
        "leave_applied",
        new_value=_snapshot(db_leave),
        changed_fields={"created": True}
    )
    db.commit()
    db.refresh(db_leave)

    return _leave_response(db, db_leave)

@router.get("/my-history/{resource_id}", response_model=List[LeaveResponse])
def get_resource_leaves(
    resource_id: UUID, 
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_current_user)
):
    # Verify authorization
    if current_user.role.name == "resource":
        if resource_id != current_user.resource_id:
            raise HTTPException(status_code=403, detail="Access denied.")
    elif current_user.role.name not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied.")
        
    leaves = db.query(Leave).filter(Leave.resource_id == resource_id, Leave.is_deleted == False).order_by(Leave.from_date.desc()).all()
    return [_leave_response(db, l) for l in leaves]

@router.get("/balances/{resource_id}")
def get_resource_balances(
    resource_id: UUID, 
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_current_user)
):
    # Verify authorization
    if current_user.role.name == "resource":
        if resource_id != current_user.resource_id:
            raise HTTPException(status_code=403, detail="Access denied.")
    elif current_user.role.name not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied.")
        
    balances = db.query(LeaveBalance).filter(LeaveBalance.resource_id == resource_id).all()
    result = []
    for bal in balances:
        ltype = db.query(LeaveType).filter(LeaveType.id == bal.leave_type_id).first()
        result.append({
            "id": str(bal.id),
            "leave_type_id": str(bal.leave_type_id),
            "leave_type_name": ltype.name if ltype else "Annual",
            "balance": bal.balance
        })
    return result

@router.patch("/{id}/status", response_model=LeaveResponse)
def approve_or_reject_leave(
    id: UUID,
    payload: Dict[str, str], # {"status": "approved" / "rejected", "remarks": "..."}
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_privileged_user)
):
    leave = db.query(Leave).filter(Leave.id == id, Leave.is_deleted == False).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found.")

    new_status = payload.get("status", "").lower().strip()
    if new_status not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status. Must be approved or rejected.")

    if leave.status != "pending":
        raise HTTPException(status_code=400, detail=f"Leave request is already {leave.status}.")

    old = _snapshot(leave)

    # If approved, commit leave balance deduction
    if new_status == "approved":
        balance_record = db.query(LeaveBalance).filter(
            LeaveBalance.resource_id == leave.resource_id,
            LeaveBalance.leave_type_id == leave.leave_type_id
        ).first()
        if balance_record:
            if balance_record.balance < leave.total_days:
                raise HTTPException(status_code=400, detail="Insufficient leave balance to approve.")
            balance_record.balance -= leave.total_days
            db.add(balance_record)

    leave.status = new_status
    db.add(leave)

    # Update approvals step
    app = db.query(Approval).filter(
        Approval.module_name == "leaves",
        Approval.record_id == id,
        Approval.status == "pending"
    ).first()
    if app:
        app.status = new_status
        app.approved_by = current_user.id
        app.remarks = payload.get("remarks")
        db.add(app)

    db.flush()
    _audit(
        db,
        current_user,
        leave.id,
        f"leave_{new_status}",
        old_value=old,
        new_value=_snapshot(leave),
        changed_fields={"status": {"old": old["status"], "new": new_status}}
    )
    db.commit()
    db.refresh(leave)

    return _leave_response(db, leave)

@router.delete("/{leave_id}")
def delete_leave(
    leave_id: UUID,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_current_user)
):
    leave = db.query(Leave).filter(Leave.id == leave_id, Leave.is_deleted == False).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found.")

    # Check privilege: Admins or the requesting Resource
    if current_user.role.name == "resource":
        if leave.resource_id != current_user.resource_id:
            raise HTTPException(status_code=403, detail="Access denied.")
    elif current_user.role.name not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied.")

    if current_user.role.name not in ["super_admin", "admin"] and leave.status != "pending":
        raise HTTPException(status_code=400, detail="Cannot delete a leave request that is already approved or rejected.")

    old = _snapshot(leave)
    leave.is_deleted = True
    leave.deleted_at = datetime.utcnow()
    leave.deleted_by = current_user.id
    db.add(leave)
    db.flush()

    _audit(
        db,
        current_user,
        leave.id,
        "leave_deleted",
        old_value=old,
        changed_fields={"deleted": True}
    )
    db.commit()
    return {"status": "success", "message": "Leave request soft-deleted successfully."}
