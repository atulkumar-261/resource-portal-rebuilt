import os
import re
from pathlib import Path
from fastapi import HTTPException, UploadFile, status

MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg", ".xlsx", ".xls"}
BLOCKED_EXTENSIONS = {".exe", ".js", ".sh", ".bat", ".ps1", ".dll"}

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}

def sanitize_filename(filename: str) -> str:
    # Remove path traversal characters
    filename = filename.replace("../", "").replace("..\\", "").replace("/", "").replace("\\", "")
    # Keep only alphanumeric, dot, dash, underscore
    name, ext = os.path.splitext(filename)
    name = re.sub(r"[^\w\-_]", "", name)
    ext = re.sub(r"[^\w.]", "", ext)
    return f"{name}{ext}"

def validate_and_sanitize_file(file: UploadFile) -> str:
    # 1. Filename sanitization
    filename = sanitize_filename(file.filename or "uploaded_file")
    
    # 2. Extension check
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS or ext in BLOCKED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File extension '{ext}' is not allowed."
        )

    # 3. MIME type check
    mime_type = file.content_type
    if mime_type and mime_type.lower() not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"MIME type '{mime_type}' is not allowed."
        )

    return filename

def check_file_size(file: UploadFile):
    # Get file size by seeking
    file.file.seek(0, os.SEEK_END)
    size = file.file.tell()
    file.file.seek(0)
    
    if size > MAX_UPLOAD_SIZE:
         raise HTTPException(
             status_code=status.HTTP_400_BAD_REQUEST,
             detail=f"File size exceeds the limit of 10MB."
         )

def verify_path_traversal(target_path: Path, root_dir: Path):
    try:
        # resolve target and root directories
        # Note: if target_path doesn't exist yet, resolve() still resolves its absolute form,
        # but calling resolve() on non-existing path might not resolve symlinks correctly,
        # however resolve() is fine for path traversal checking as long as the parent exists.
        target_abs = target_path.resolve()
        root_abs = root_dir.resolve()
        if not str(target_abs).startswith(str(root_abs)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file path configuration (path traversal attempt detected)."
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error validating file path: {str(e)}"
        )
