import os
import shutil
from pathlib import Path
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session

from backend.app.core.config import get_db_session
from backend.app.core.security import require_privileged_user, require_current_user
from backend.app.models.database import Payslip, DocumentAttachment, Resource, AuditLog, User
from backend.app.schemas.payslips import PayslipResponse

router = APIRouter(prefix="/payslips", tags=["Payslips"])

UPLOAD_DIR = Path("backend/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

def _snapshot(payslip: Payslip) -> Dict[str, Any]:
    return {
        "id": str(payslip.id),
        "resource_id": str(payslip.resource_id),
        "month": payslip.month,
        "days": payslip.days,
        "notes": payslip.notes,
        "amount": float(payslip.amount),
        "file_attachment_id": str(payslip.file_attachment_id) if payslip.file_attachment_id else None,
    }

def _audit(
    db: Session,
    actor: User,
    payslip_id: UUID,
    action: str,
    old_value: Optional[Dict[str, Any]] = None,
    new_value: Optional[Dict[str, Any]] = None,
    changed_fields: Optional[Dict[str, Any]] = None,
):
    savepoint = db.begin_nested()
    try:
        db.add(
            AuditLog(
                module="payroll",
                action=action,
                table_name="payslips",
                record_id=payslip_id,
                old_value=old_value,
                new_value=new_value,
                changed_fields=changed_fields,
                user_id=actor.id,
            )
        )
        db.flush()
    except Exception:
        savepoint.rollback()
        import logging
        logging.getLogger(__name__).exception("Audit log failure")

def _payslip_response(db: Session, payslip: Payslip) -> PayslipResponse:
    # Resolve resource name
    res = db.query(Resource).filter(Resource.id == payslip.resource_id).first()
    res_name = res.full_name if res else "Unknown Resource"

    return PayslipResponse(
        id=payslip.id,
        resourceId=payslip.resource_id,
        resourceName=res_name,
        month=payslip.month,
        days=payslip.days,
        notes=payslip.notes,
        amount=float(payslip.amount),
        fileAttachmentId=payslip.file_attachment_id
    )

@router.get("", response_model=List[PayslipResponse])
def get_payslips(
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_current_user),
):
    # Admins get all; normal resource gets their own
    query = db.query(Payslip).filter(Payslip.is_deleted == False)
    if current_user.role.name not in ["super_admin", "admin"]:
        if not current_user.resource_id:
            raise HTTPException(status_code=403, detail="Not authorized to access payslips.")
        query = query.filter(Payslip.resource_id == current_user.resource_id)
        
    payslips = query.order_by(Payslip.created_at.desc()).all()
    return [_payslip_response(db, p) for p in payslips]

@router.post("", response_model=PayslipResponse, status_code=status.HTTP_201_CREATED)
def create_payslip(
    month: str = Form(...),
    days: int = Form(...),
    notes: Optional[str] = Form(None),
    resource_id: UUID = Form(...),
    amount: float = Form(0.0),
    file: UploadFile = File(...),
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_privileged_user),
):
    # Validate resource exists
    res = db.query(Resource).filter(Resource.id == resource_id, Resource.is_deleted == False).first()
    if not res:
        raise HTTPException(status_code=400, detail="Resource not found or deleted.")

    from backend.app.core.file_security import validate_and_sanitize_file, check_file_size, verify_path_traversal

    # Apply file security validations
    check_file_size(file)
    sanitized_filename = validate_and_sanitize_file(file)

    # Save uploaded file
    file_ext = os.path.splitext(sanitized_filename)[1]
    storage_key = f"payslip_{uuid4()}{file_ext}"
    file_path = UPLOAD_DIR / storage_key

    # Validate file path
    verify_path_traversal(file_path, UPLOAD_DIR)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {str(e)}")

    file_size = file_path.stat().st_size

    try:
        # Create document attachment record
        attachment = DocumentAttachment(
            filename=sanitized_filename,
            storage_key=storage_key,
            file_size=file_size,
            mime_type=file.content_type or "application/pdf",
            uploaded_by=current_user.id,
            entity_type="payslip"
        )
        db.add(attachment)
        db.flush()

        # Create payslip record
        payslip = Payslip(
            resource_id=resource_id,
            month=month,
            days=days,
            notes=notes,
            amount=amount,
            file_attachment_id=attachment.id,
            is_deleted=False
        )
        db.add(payslip)
        db.flush()

        # Link the attachment to the payslip entity ID
        attachment.entity_id = payslip.id
        db.add(attachment)
        db.flush()

        _audit(
            db,
            current_user,
            payslip.id,
            "payslip_created",
            new_value=_snapshot(payslip),
            changed_fields={"created": True}
        )
        db.commit()
    except Exception as e:
        db.rollback()
        # Clean up file on failure
        if file_path.exists():
            try:
                file_path.unlink()
            except Exception:
                pass
        raise HTTPException(status_code=500, detail=f"Database transaction failed: {str(e)}")

    db.refresh(payslip)
    return _payslip_response(db, payslip)

@router.delete("/{payslip_id}")
def delete_payslip(
    payslip_id: UUID,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_privileged_user),
):
    payslip = db.query(Payslip).filter(Payslip.id == payslip_id, Payslip.is_deleted == False).first()
    if not payslip:
        raise HTTPException(status_code=404, detail="Payslip not found.")

    old = _snapshot(payslip)
    payslip.is_deleted = True
    payslip.deleted_at = datetime.utcnow()
    payslip.deleted_by = current_user.id

    try:
        db.add(payslip)
        
        # Delete attachment if any
        if payslip.file_attachment_id:
            attachment = db.query(DocumentAttachment).filter(DocumentAttachment.id == payslip.file_attachment_id).first()
            if attachment:
                from backend.app.core.file_security import verify_path_traversal
                try:
                    old_path = UPLOAD_DIR / attachment.storage_key
                    verify_path_traversal(old_path, UPLOAD_DIR)
                    if old_path.exists():
                        old_path.unlink()
                except Exception:
                    pass
                db.delete(attachment)

        _audit(
            db,
            current_user,
            payslip.id,
            "payslip_deleted",
            old_value=old,
            changed_fields={"deleted": True}
        )
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database transaction failed: {str(e)}")

    return {"status": "success", "message": "Payslip soft-deleted successfully."}
