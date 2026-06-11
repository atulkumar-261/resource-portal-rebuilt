import os
import uuid
import shutil
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from datetime import datetime

from backend.app.core.config import get_db_session
from backend.app.core.security import require_current_user
from backend.app.models.database import ResourceDocument, User, Resource

router = APIRouter(prefix="/resources/documents", tags=["Resource Documents"])

UPLOAD_DIR = Path("backend/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    document_type: str = Form(...),
    resource_id: uuid.UUID = Form(...),
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_current_user),
):
    """
    Upload a document (CV, Passport Copy, Visa Copy, etc.) for a specific resource.
    """
    if current_user.role.name not in ["super_admin", "admin"] and resource_id != current_user.resource_id:
        raise HTTPException(status_code=403, detail="Access denied.")

    from backend.app.core.file_security import validate_and_sanitize_file, validate_upload_file, verify_path_traversal, ALLOWED_DOCUMENT_TYPES

    # Apply file security validations
    await validate_upload_file(file, ALLOWED_DOCUMENT_TYPES)
    sanitized_filename = validate_and_sanitize_file(file)

    # Verify resource exists and isn't deleted
    resource = db.query(Resource).filter(Resource.id == resource_id, Resource.is_deleted == False).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
        
    # Generate a unique filename to prevent collisions
    file_ext = os.path.splitext(sanitized_filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = UPLOAD_DIR / unique_filename

    # Path traversal validation
    verify_path_traversal(file_path, UPLOAD_DIR)

    # Save to local filesystem
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {str(e)}")
        
    from backend.app.services.transaction_service import transactional

    try:
        with transactional(db):
            doc = ResourceDocument(
                resource_id=resource_id,
                document_type=document_type,
                file_name=sanitized_filename,
                file_path=str(file_path.as_posix()), # Store relative posix path
                uploaded_by=current_user.id
            )
            db.add(doc)
            db.flush()
    except Exception as e:
        # Clean up the saved file
        if file_path.exists():
            try:
                file_path.unlink()
            except Exception:
                pass
        raise HTTPException(status_code=500, detail=f"Database transaction failed: {str(e)}")
    
    db.refresh(doc)
    
    return {
        "id": doc.id,
        "document_type": doc.document_type,
        "file_name": doc.file_name,
        "file_path": doc.file_path,
        "uploaded_at": doc.uploaded_at
    }


@router.get("/{resource_id}")
def get_resource_documents(
    resource_id: uuid.UUID,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_current_user),
):
    """
    Get all documents for a specific resource.
    """
    if current_user.role.name not in ["super_admin", "admin"] and resource_id != current_user.resource_id:
        raise HTTPException(status_code=403, detail="Access denied.")

    documents = db.query(ResourceDocument).filter(ResourceDocument.resource_id == resource_id).order_by(ResourceDocument.uploaded_at.desc()).all()
    
    result = []
    for d in documents:
        result.append({
            "id": d.id,
            "document_type": d.document_type,
            "file_name": d.file_name,
            "file_path": d.file_path,
            "uploaded_at": d.uploaded_at
        })
    return result


@router.delete("/{document_id}")
def delete_document(
    document_id: uuid.UUID,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_current_user),
):
    """
    Delete a document.
    """
    doc = db.query(ResourceDocument).filter(ResourceDocument.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if current_user.role.name not in ["super_admin", "admin"] and doc.resource_id != current_user.resource_id:
        raise HTTPException(status_code=403, detail="Access denied.")

    # Remove from filesystem
    from backend.app.core.file_security import verify_path_traversal

    try:
        path = Path(doc.file_path)
        verify_path_traversal(path, UPLOAD_DIR)
        if path.exists():
            path.unlink()
    except Exception as e:
        print(f"Failed to delete file {doc.file_path}: {e}")
        
    from backend.app.services.transaction_service import transactional

    with transactional(db):
        db.delete(doc)
    
    return {"status": "success", "message": "Document deleted successfully"}
