from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from backend.app.models.database import User, Role, Resource, LoginActivity
from backend.app.schemas.auth import LoginRequestSchema, TokenResponseSchema, UserLoginResponse
from backend.app.core.config import get_db_session
from backend.app.core.security import create_access_token, hash_password, require_current_user
from backend.app.services.transaction_service import transactional

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponseSchema)
def login(request: LoginRequestSchema, req: Request, db: Session = Depends(get_db_session)):
    ip_address = req.client.host if req.client else None
    user_agent = req.headers.get("user-agent")

    # 1. Fetch user by username
    user = db.query(User).filter(User.username == request.username).first()
    if not user or user.password_hash != hash_password(request.password):
        with transactional(db):
            activity = LoginActivity(
                username=request.username,
                status="failed",
                ip_address=ip_address,
                user_agent=user_agent
            )
            db.add(activity)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password."
        )

    if not user.is_active:
        with transactional(db):
            activity = LoginActivity(
                username=request.username,
                status="failed",
                ip_address=ip_address,
                user_agent=user_agent
            )
            db.add(activity)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended."
        )

    # 2. Fetch role string representation
    role = db.query(Role).filter(Role.id == user.role_id).first()
    role_name = role.name if role else "user"

    with transactional(db):
        user.last_login = datetime.utcnow()
        db.add(user)

        activity = LoginActivity(
            username=request.username,
            status="success",
            ip_address=ip_address,
            user_agent=user_agent
        )
        db.add(activity)

    db.refresh(user)

    token = create_access_token(user)

    # 3. Lookup onboarding_status from linked Resource (if any)
    onboarding_status = None
    if user.resource_id:
        linked_resource = db.query(Resource).filter(
            Resource.id == user.resource_id,
            Resource.is_deleted == False,
        ).first()
        if linked_resource:
            onboarding_status = linked_resource.onboarding_status

    return TokenResponseSchema(
        token=token,
        user=UserLoginResponse(
            id=user.id,
            username=user.username,
            full_name=user.full_name,
            email=user.email,
            role=role_name
        ),
        resource_id=user.resource_id,
        onboarding_status=onboarding_status,
    )


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., description="Current password for verification.")
    new_password: str = Field(..., min_length=6, description="New password (min 6 chars).")


@router.post("/change-password")
def change_password(
    request: ChangePasswordRequest,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_current_user),
):
    """Authenticated user changes their own password."""
    if current_user.password_hash != hash_password(request.current_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")

    current_user.password_hash = hash_password(request.new_password)
    current_user.updated_at = datetime.utcnow()
    db.add(current_user)
    db.commit()
    return {"status": "success", "message": "Password changed successfully."}
