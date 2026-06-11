from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from backend.app.core.config import get_db_session
from backend.app.core.security import require_privileged_user
from backend.app.models.database import Setting, User
from backend.app.services.transaction_service import transactional
from backend.app.services.audit_service import AuditService

router = APIRouter(prefix="/settings", tags=["Settings"])


class SettingResponse(BaseModel):
    key: str
    value: str
    description: Optional[str] = None

    class Config:
        from_attributes = True


class SettingCreateUpdate(BaseModel):
    value: str = Field(..., description="The value of the setting")
    description: Optional[str] = Field(None, description="Optional description of the setting")


def _audit_setting(
    db: Session,
    actor: User,
    key: str,
    action: str,
    old_value: Optional[dict] = None,
    new_value: Optional[dict] = None,
    changed_fields: Optional[dict] = None
):
    AuditService.record(
        db=db,
        actor_id=actor.id,
        module="system_settings",
        action=action,
        table_name="settings",
        record_id=None, # Mapped via natural key 'key'
        old_value=old_value,
        new_value=new_value,
        changed_fields=changed_fields
    )


@router.get("", response_model=List[SettingResponse])
def get_all_settings(
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_privileged_user)
):
    """
    Get all global application settings (Admin-only).
    """
    return db.query(Setting).all()


@router.get("/{key}", response_model=SettingResponse)
def get_setting(
    key: str,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_privileged_user)
):
    """
    Retrieve a specific setting by key.
    """
    setting = db.query(Setting).filter(Setting.key == key).first()
    if not setting:
        raise HTTPException(status_code=404, detail=f"Setting '{key}' not found.")
    return setting


@router.put("/{key}", response_model=SettingResponse)
def update_or_create_setting(
    key: str,
    request: SettingCreateUpdate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_privileged_user)
):
    """
    Create or update a configuration setting.
    """
    setting = db.query(Setting).filter(Setting.key == key).first()
    old_val_dict = None
    action = "setting_updated"

    if setting:
        old_val_dict = {"value": setting.value, "description": setting.description}
        with transactional(db):
            setting.value = request.value
            if request.description is not None:
                setting.description = request.description
            db.add(setting)
            _audit_setting(
                db=db,
                actor=current_user,
                key=key,
                action=action,
                old_value=old_val_dict,
                new_value={"value": setting.value, "description": setting.description},
                changed_fields={"value": request.value}
            )
    else:
        action = "setting_created"
        with transactional(db):
            setting = Setting(
                key=key,
                value=request.value,
                description=request.description
            )
            db.add(setting)
            _audit_setting(
                db=db,
                actor=current_user,
                key=key,
                action=action,
                new_value={"value": setting.value, "description": setting.description},
                changed_fields={"created": True}
            )

    db.refresh(setting)
    return setting


@router.delete("/{key}", status_code=status.HTTP_200_OK)
def delete_setting(
    key: str,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_privileged_user)
):
    """
    Delete a configuration setting.
    """
    setting = db.query(Setting).filter(Setting.key == key).first()
    if not setting:
        raise HTTPException(status_code=404, detail=f"Setting '{key}' not found.")

    old_val_dict = {"value": setting.value, "description": setting.description}

    with transactional(db):
        db.delete(setting)
        _audit_setting(
            db=db,
            actor=current_user,
            key=key,
            action="setting_deleted",
            old_value=old_val_dict,
            changed_fields={"deleted": True}
        )

    return {"status": "success", "message": f"Setting '{key}' deleted successfully."}
