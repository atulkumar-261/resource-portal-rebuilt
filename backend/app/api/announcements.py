import os
import shutil
from pathlib import Path
from datetime import datetime, date
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session

from backend.app.core.config import get_db_session
from backend.app.core.security import require_privileged_user, require_current_user
from backend.app.models.database import Announcement, DocumentAttachment, User
from backend.app.schemas.announcements import AnnouncementCreateRequest, AnnouncementResponse

router = APIRouter(prefix="/announcements", tags=["Announcements"])

UPLOAD_DIR = Path("backend/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

def parse_date(date_str: Optional[str]) -> Optional[date]:
    if not date_str:
        return None
    for fmt in ("%d-%m-%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    raise HTTPException(status_code=400, detail=f"Invalid date format: {date_str}. Expected YYYY-MM-DD or DD-MM-YYYY.")

def _snapshot(announcement: Announcement) -> Dict[str, Any]:
    return {
        "id": str(announcement.id),
        "subject": announcement.subject,
        "message": announcement.message,
        "date": announcement.date.isoformat() if announcement.date else None,
        "created_by": str(announcement.created_by),
    }

from backend.app.services.audit_service import AuditService


def _audit(
    db: Session,
    actor: User,
    announcement_id: UUID,
    action: str,
    old_value: Optional[Dict[str, Any]] = None,
    new_value: Optional[Dict[str, Any]] = None,
    changed_fields: Optional[Dict[str, Any]] = None,
):
    AuditService.record(
        db=db,
        actor_id=actor.id,
        module="announcements",
        action=action,
        table_name="announcements",
        record_id=announcement_id,
        old_value=old_value,
        new_value=new_value,
        changed_fields=changed_fields
    )

def _announcement_response(db: Session, announcement: Announcement) -> AnnouncementResponse:
    # Resolve attachment if any
    attachment = db.query(DocumentAttachment).filter(
        DocumentAttachment.entity_type == "announcement",
        DocumentAttachment.entity_id == announcement.id
    ).first()
    
    return AnnouncementResponse(
        id=announcement.id,
        subject=announcement.subject,
        message=announcement.message,
        date=announcement.date.strftime("%d-%m-%Y") if announcement.date else "",
        attachment_name=attachment.filename if attachment else None,
        attachment_key=attachment.storage_key if attachment else None
    )

@router.get("", response_model=List[AnnouncementResponse])
def get_announcements(
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_current_user),
):
    announcements = db.query(Announcement).filter(Announcement.is_deleted == False).order_by(Announcement.date.desc()).all()
    return [_announcement_response(db, a) for a in announcements]

@router.post("", response_model=AnnouncementResponse, status_code=status.HTTP_201_CREATED)
def create_announcement(
    request: AnnouncementCreateRequest,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_privileged_user),
):
    date_obj = parse_date(request.date)
    
    from backend.app.services.transaction_service import transactional

    with transactional(db):
        announcement = Announcement(
            subject=request.subject,
            message=request.message,
            date=date_obj,
            created_by=current_user.id,
            is_deleted=False
        )
        db.add(announcement)
        db.flush()

        _audit(
            db,
            current_user,
            announcement.id,
            "announcement_created",
            new_value=_snapshot(announcement),
            changed_fields={"created": True}
        )

    db.refresh(announcement)
    return _announcement_response(db, announcement)

@router.post("/{id}/upload")
async def upload_announcement_file(
    id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_privileged_user),
):
    announcement = db.query(Announcement).filter(Announcement.id == id, Announcement.is_deleted == False).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found.")

    from backend.app.core.file_security import validate_and_sanitize_file, validate_upload_file, verify_path_traversal, ALLOWED_DOCUMENT_TYPES

    # Validate file size and types
    await validate_upload_file(file, ALLOWED_DOCUMENT_TYPES)
    sanitized_filename = validate_and_sanitize_file(file)

    import uuid
    file_ext = os.path.splitext(sanitized_filename)[1]
    storage_key = f"announcement_{id}_{uuid.uuid4()}{file_ext}"
    file_path = UPLOAD_DIR / storage_key

    # Validate target file path resolved doesn't try path traversal
    verify_path_traversal(file_path, UPLOAD_DIR)

    # Save to disk
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {str(e)}")

    # Get file size
    file_size = file_path.stat().st_size

    from backend.app.services.transaction_service import transactional

    try:
        with transactional(db):
            # Check if attachment already exists for this announcement and delete it
            existing_attachment = db.query(DocumentAttachment).filter(
                DocumentAttachment.entity_type == "announcement",
                DocumentAttachment.entity_id == id
            ).first()
            if existing_attachment:
                # Prepare AuditLog for replacement
                _audit(
                    db,
                    current_user,
                    id,
                    "announcement_file_replaced",
                    old_value={
                        "actor_id": str(current_user.id),
                        "announcement_id": str(id),
                        "filename": existing_attachment.filename,
                        "storage_key": existing_attachment.storage_key,
                        "timestamp": datetime.utcnow().isoformat()
                    },
                    new_value={
                        "actor_id": str(current_user.id),
                        "announcement_id": str(id),
                        "filename": sanitized_filename,
                        "storage_key": storage_key,
                        "timestamp": datetime.utcnow().isoformat()
                    },
                    changed_fields={"file": {"old": existing_attachment.filename, "new": sanitized_filename}}
                )
                # Remove old file
                try:
                    old_path = UPLOAD_DIR / existing_attachment.storage_key
                    verify_path_traversal(old_path, UPLOAD_DIR)
                    if old_path.exists():
                        old_path.unlink()
                except Exception:
                    pass
                db.delete(existing_attachment)
            else:
                # Prepare AuditLog for new upload
                _audit(
                    db,
                    current_user,
                    id,
                    "announcement_file_uploaded",
                    new_value={
                        "actor_id": str(current_user.id),
                        "announcement_id": str(id),
                        "filename": sanitized_filename,
                        "storage_key": storage_key,
                        "timestamp": datetime.utcnow().isoformat()
                    },
                    changed_fields={"file_uploaded": True}
                )

            doc = DocumentAttachment(
                filename=sanitized_filename,
                storage_key=storage_key,
                file_size=file_size,
                mime_type=file.content_type or "application/octet-stream",
                uploaded_by=current_user.id,
                entity_type="announcement",
                entity_id=id
            )
            db.add(doc)
    except Exception as e:
        # Clean up new file on failure
        if file_path.exists():
            try:
                file_path.unlink()
            except Exception:
                pass
        raise HTTPException(status_code=500, detail=f"Database transaction failed: {str(e)}")

    return {"status": "success", "filename": sanitized_filename, "storage_key": storage_key}

@router.delete("/{announcement_id}")
def delete_announcement(
    announcement_id: UUID,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_privileged_user),
):
    announcement = db.query(Announcement).filter(Announcement.id == announcement_id, Announcement.is_deleted == False).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found.")

    old = _snapshot(announcement)

    from backend.app.services.transaction_service import transactional

    with transactional(db):
        announcement.is_deleted = True
        announcement.deleted_at = datetime.utcnow()
        announcement.deleted_by = current_user.id
        db.add(announcement)
        db.flush()

        from backend.app.core.file_security import verify_path_traversal

        # Audit log
        attachment = db.query(DocumentAttachment).filter(
            DocumentAttachment.entity_type == "announcement",
            DocumentAttachment.entity_id == announcement_id
        ).first()
        if attachment:
            _audit(
                db,
                current_user,
                announcement_id,
                "announcement_file_removed",
                old_value={
                    "actor_id": str(current_user.id),
                    "announcement_id": str(announcement_id),
                    "filename": attachment.filename,
                    "storage_key": attachment.storage_key,
                    "timestamp": datetime.utcnow().isoformat()
                },
                changed_fields={"file_removed": True}
            )
            # Remove file on disk safely
            try:
                attachment_path = UPLOAD_DIR / attachment.storage_key
                verify_path_traversal(attachment_path, UPLOAD_DIR)
                if attachment_path.exists():
                    attachment_path.unlink()
            except Exception:
                pass
            # delete attachment record
            db.delete(attachment)

        _audit(
            db,
            current_user,
            announcement.id,
            "announcement_deleted",
            old_value=old,
            changed_fields={"deleted": True}
        )
        
    return {"status": "success", "message": "Announcement soft-deleted successfully."}
