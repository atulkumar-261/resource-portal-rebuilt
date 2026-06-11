from typing import List, Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.app.core.config import get_db_session
from backend.app.core.security import require_current_user
from backend.app.models.database import Notification, User
from backend.app.services.transaction_service import transactional

router = APIRouter(prefix="/notifications", tags=["Notifications"])


class NotificationResponse(BaseModel):
    id: UUID
    recipient_id: UUID
    module_name: str
    record_id: UUID
    action_url: Optional[str] = None
    priority: str
    title: str
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UnreadCountResponse(BaseModel):
    unread_count: int


@router.get("", response_model=List[NotificationResponse])
def get_my_notifications(
    limit: int = 50,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_current_user)
):
    """
    Retrieve in-app notifications list for the authenticated user.
    """
    notifications = db.query(Notification).filter(
        Notification.recipient_id == current_user.id
    ).order_by(Notification.created_at.desc()).limit(limit).all()
    return notifications


@router.get("/unread-count", response_model=UnreadCountResponse)
def get_unread_count(
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_current_user)
):
    """
    Get the total count of unread notifications for the current user.
    """
    count = db.query(Notification).filter(
        Notification.recipient_id == current_user.id,
        Notification.is_read == False
    ).count()
    return {"unread_count": count}


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def mark_as_read(
    notification_id: UUID,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_current_user)
):
    """
    Mark a specific notification as read.
    """
    notification = db.query(Notification).filter(
        Notification.id == notification_id
    ).first()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found.")

    if notification.recipient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this notification.")

    with transactional(db):
        notification.is_read = True
        db.add(notification)

    db.refresh(notification)
    return notification


@router.post("/mark-all-read")
def mark_all_as_read(
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_current_user)
):
    """
    Mark all unread notifications for the current user as read.
    """
    unread_notifications = db.query(Notification).filter(
        Notification.recipient_id == current_user.id,
        Notification.is_read == False
    ).all()

    with transactional(db):
        for notification in unread_notifications:
            notification.is_read = True
            db.add(notification)

    return {"status": "success", "message": f"Marked {len(unread_notifications)} notifications as read."}
