import base64
import hashlib
import hmac
import json
import time
from datetime import timedelta
from typing import Any, Dict
from uuid import UUID

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.config import ACCESS_TOKEN_EXPIRE_MINUTES, JWT_SECRET, get_db_session
from backend.app.models.database import User


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def _b64encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def _b64decode(data: str) -> bytes:
    return base64.urlsafe_b64decode(data + "=" * (-len(data) % 4))


def create_access_token(user: User, expires_delta: timedelta | None = None) -> str:
    expires_in = expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "user_id": str(user.id),
        "exp": int(time.time() + expires_in.total_seconds()),
    }
    payload_part = _b64encode(json.dumps(payload, separators=(",", ":")).encode())
    signature = hmac.new(JWT_SECRET.encode(), payload_part.encode(), hashlib.sha256).digest()
    return f"{payload_part}.{_b64encode(signature)}"


def decode_access_token(token: str) -> Dict[str, Any]:
    try:
        payload_part, signature_part = token.split(".", 1)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token.") from exc

    expected = hmac.new(JWT_SECRET.encode(), payload_part.encode(), hashlib.sha256).digest()
    provided = _b64decode(signature_part)
    if not hmac.compare_digest(expected, provided):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token.")

    try:
        payload = json.loads(_b64decode(payload_part).decode())
    except (ValueError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token.") from exc

    if int(payload.get("exp", 0)) < int(time.time()):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired.")
    return payload


def get_current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db_session),
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")

    token = authorization.split(" ", 1)[1].strip()
    payload = decode_access_token(token)
    try:
        user_id = UUID(payload["user_id"])
    except (KeyError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token.") from exc

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User is inactive or missing.")
    return user


def require_super_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.role or current_user.role.name != "super_admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Super admin access required.")
    return current_user


def require_privileged_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.role or current_user.role.name not in ["super_admin", "admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Privileged admin access required.")
    return current_user


def require_current_user(current_user: User = Depends(get_current_user)) -> User:
    """Any authenticated user — used for self-service endpoints (profile update, etc.)."""
    return current_user


def require_admin_or_super_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.role or current_user.role.name not in ["super_admin", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Admin or Super Admin access is required to modify organizational metadata."
        )
    return current_user

