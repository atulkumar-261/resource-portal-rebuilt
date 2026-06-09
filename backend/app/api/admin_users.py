from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.core.config import get_db_session
from backend.app.core.security import hash_password, require_super_admin
from backend.app.models.database import AuditLog, Role, User
from backend.app.schemas.admin_users import (
    AdminCreateRequest,
    AdminResponse,
    AdminStatusRequest,
    AdminUpdateRequest,
    AuditLogResponse,
)

router = APIRouter(prefix="/admin", tags=["System Admin Management"])


def _admin_response(user: User) -> AdminResponse:
    return AdminResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role=user.role.name if user.role else "unknown",
        is_active=user.is_active,
        created_at=user.created_at,
        last_login=user.last_login,
    )


def _snapshot(user: User) -> Dict[str, Any]:
    return {
        "id": str(user.id),
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role.name if user.role else None,
        "is_active": user.is_active,
    }


def _get_role(db: Session, name: str) -> Role:
    role = db.query(Role).filter(Role.name == name).first()
    if not role:
        raise HTTPException(status_code=500, detail=f"Required role '{name}' is not configured.")
    return role


def _get_privileged_user(db: Session, user_id: UUID) -> User:
    user = db.query(User).join(Role).filter(
        User.id == user_id,
        Role.name.in_(["super_admin", "admin"]),
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="Admin user not found.")
    return user


def _active_super_admin_count(db: Session, exclude_user_id: Optional[UUID] = None) -> int:
    query = db.query(func.count(User.id)).join(Role).filter(
        Role.name == "super_admin",
        User.is_active == True,
    )
    if exclude_user_id:
        query = query.filter(User.id != exclude_user_id)
    return int(query.scalar() or 0)


def _ensure_not_last_active_super_admin(db: Session, target_user: User):
    if target_user.role and target_user.role.name == "super_admin" and target_user.is_active:
        if _active_super_admin_count(db, exclude_user_id=target_user.id) < 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one active super admin must remain.",
            )


import secrets
import string


def _generate_password(first_name: str) -> str:
    clean_first = "".join(c for c in first_name if c.isalpha())
    first = clean_first.capitalize() if clean_first else "Admin"
    # generate random string of 8 characters containing at least 1 upper, 1 lower, 1 digit, 1 special
    uppers = "".join(secrets.choice(string.ascii_uppercase) for _ in range(2))
    lowers = "".join(secrets.choice(string.ascii_lowercase) for _ in range(2))
    digits = "".join(secrets.choice(string.digits) for _ in range(2))
    specials = "".join(secrets.choice("!@#$^*%&") for _ in range(2))
    char_list = list(uppers + lowers + digits + specials)
    secrets.SystemRandom().shuffle(char_list)
    random_str = "".join(char_list)
    return f"{first}@{random_str}"


def _generate_admin_username(db: Session, full_name: str) -> str:
    # Split full name by space
    parts = [p.strip().lower() for p in full_name.split() if p.strip()]
    if len(parts) >= 2:
        firstname = "".join(c for c in parts[0] if c.isalnum())
        lastname = "".join(c for c in parts[-1] if c.isalnum())
    elif len(parts) == 1:
        firstname = "".join(c for c in parts[0] if c.isalnum())
        lastname = "admin"
    else:
        firstname = "admin"
        lastname = "user"
        
    base_uname = f"{firstname}.{lastname}"
    # Check duplicate in username to be completely unique
    exists = db.query(User).filter(User.username == base_uname).first()
    if not exists:
        return base_uname
    
    counter = 2
    while True:
        test_uname = f"{firstname}.{lastname}{counter}"
        exists = db.query(User).filter(User.username == test_uname).first()
        if not exists:
            return test_uname
        counter += 1


def _audit(
    db: Session,
    actor: User,
    target: User,
    action: str,
    old_value: Optional[Dict[str, Any]] = None,
    new_value: Optional[Dict[str, Any]] = None,
    changed_fields: Optional[Dict[str, Any]] = None,
):
    db.add(
        AuditLog(
            module="user_management",
            action=action,
            table_name="users",
            record_id=target.id,
            old_value=old_value,
            new_value=new_value,
            changed_fields=changed_fields,
            user_id=actor.id,
        )
    )


@router.get("/users", response_model=List[AdminResponse])
def list_admin_users(
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_super_admin),
):
    users = db.query(User).join(Role).filter(Role.name.in_(["super_admin", "admin"])).order_by(User.created_at.desc()).all()
    return [_admin_response(user) for user in users]


@router.post("/users", response_model=AdminResponse, status_code=status.HTTP_201_CREATED)
def create_admin_user(
    request: AdminCreateRequest,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_super_admin),
):
    # Email must be entered manually and must be unique
    email = request.email.lower()
    email_exists = db.query(User).filter(User.email == email).first()
    if email_exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists.")

    if request.role == "super_admin":
        username = request.username
        password_raw = request.password
        
        # Check uniqueness
        username_exists = db.query(User).filter(User.username == username).first()
        if username_exists:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists.")
            
    else: # role == "admin"
        username = request.username if request.username else _generate_admin_username(db, request.full_name)
        password_raw = request.password if request.password else _generate_password(request.full_name)
        
        # Check uniqueness
        username_exists = db.query(User).filter(User.username == username).first()
        if username_exists:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists.")

    role_record = _get_role(db, request.role)
    password_hash = hash_password(password_raw)
    
    user = User(
        username=username,
        email=email,
        full_name=request.full_name,
        password_hash=password_hash,
        role_id=role_record.id,
        is_active=True,
    )
    db.add(user)
    db.flush()
    db.refresh(user)
    
    action = "super_admin_created" if request.role == "super_admin" else "admin_created"
    _audit(
        db,
        current_user,
        user,
        action,
        new_value=_snapshot(user),
        changed_fields={"created": True},
    )
    db.commit()
    db.refresh(user)
    
    resp = _admin_response(user)
    resp.generated_password = password_raw
    return resp


@router.patch("/users/{user_id}", response_model=AdminResponse)
def update_admin_user(
    user_id: UUID,
    request: AdminUpdateRequest,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_super_admin),
):
    target = _get_privileged_user(db, user_id)
    old = _snapshot(target)
    changed: Dict[str, Any] = {}

    if request.email is not None and request.email.lower() != target.email:
        req_email = request.email.lower()
        email_exists = db.query(User).filter(User.email == req_email, User.id != target.id).first()
        if email_exists:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists.")
        changed["email"] = {"old": target.email, "new": req_email}
        target.email = req_email

    if request.full_name is not None and request.full_name != target.full_name:
        changed["full_name"] = {"old": target.full_name, "new": request.full_name}
        target.full_name = request.full_name

    if not changed:
        return _admin_response(target)

    target.updated_at = datetime.utcnow()
    db.add(target)
    db.flush()
    _audit(db, current_user, target, "admin_updated", old_value=old, new_value=_snapshot(target), changed_fields=changed)
    db.commit()
    db.refresh(target)
    return _admin_response(target)


@router.patch("/users/{user_id}/status", response_model=AdminResponse)
def update_admin_status(
    user_id: UUID,
    request: AdminStatusRequest,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_super_admin),
):
    target = _get_privileged_user(db, user_id)
    old = _snapshot(target)
    if not request.is_active:
        _ensure_not_last_active_super_admin(db, target)

    if target.is_active == request.is_active:
        return _admin_response(target)

    target.is_active = request.is_active
    target.updated_at = datetime.utcnow()
    db.add(target)
    db.flush()
    
    action = "user_activated" if request.is_active else "user_deactivated"
    _audit(
        db,
        current_user,
        target,
        action,
        old_value=old,
        new_value=_snapshot(target),
        changed_fields={"is_active": {"old": old["is_active"], "new": request.is_active}},
    )
    db.commit()
    db.refresh(target)
    return _admin_response(target)


@router.post("/users/{user_id}/reset-password", response_model=AdminResponse)
def reset_admin_password(
    user_id: UUID,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_super_admin),
):
    target = _get_privileged_user(db, user_id)
    # Generate new password
    new_password_raw = _generate_password(target.full_name or target.username)
    old = _snapshot(target)
    
    target.password_hash = hash_password(new_password_raw)
    target.updated_at = datetime.utcnow()
    db.add(target)
    db.flush()
    
    _audit(
        db,
        current_user,
        target,
        "admin_password_reset",
        old_value=old,
        new_value=_snapshot(target),
        changed_fields={"password_reset": True},
    )
    db.commit()
    db.refresh(target)
    
    resp = _admin_response(target)
    resp.generated_password = new_password_raw
    return resp


@router.delete("/users/{user_id}")
def delete_admin_user(
    user_id: UUID,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_super_admin),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete your own account.")

    target = _get_privileged_user(db, user_id)
    _ensure_not_last_active_super_admin(db, target)
    old = _snapshot(target)
    _audit(
        db,
        current_user,
        target,
        "admin_deleted",
        old_value=old,
        changed_fields={"deleted": True},
    )
    db.delete(target)
    db.commit()
    return {"status": "success", "message": "Admin deleted successfully."}


@router.get("/audit-logs", response_model=List[AuditLogResponse])
def list_admin_audit_logs(
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_super_admin),
):
    logs = db.query(AuditLog).filter(AuditLog.module == "admin_users").order_by(AuditLog.created_at.desc()).limit(100).all()
    actor_ids = {log.user_id for log in logs if log.user_id}
    actors = {
        user.id: user.username
        for user in db.query(User).filter(User.id.in_(actor_ids)).all()
    } if actor_ids else {}

    result = []
    for log in logs:
        new_value = log.new_value or {}
        old_value = log.old_value or {}
        target_username = new_value.get("username") or old_value.get("username")
        result.append(
            AuditLogResponse(
                id=log.id,
                actor_user_id=log.user_id,
                actor_username=actors.get(log.user_id),
                action=log.action,
                entity_type=log.table_name,
                entity_id=log.record_id,
                target_username=target_username,
                old_value=log.old_value,
                new_value=log.new_value,
                changed_fields=log.changed_fields,
                created_at=log.created_at,
            )
        )
    return result
