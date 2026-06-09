from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator


class AdminCreateRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=150)
    role: str = Field(..., description="Role: admin or super_admin")
    username: Optional[str] = Field(None, min_length=3, max_length=100)
    email: str = Field(..., max_length=255)
    password: Optional[str] = Field(None, min_length=8)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        if not value or "@" not in value or "." not in value.split("@")[-1]:
            raise ValueError("Enter a valid email address.")
        return value.lower()

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, value: Optional[str]) -> Optional[str]:
        if value is None or value == "":
            return None
        checks = [
            any(ch.isupper() for ch in value),
            any(ch.islower() for ch in value),
            any(ch.isdigit() for ch in value),
            any(not ch.isalnum() for ch in value),
        ]
        if not all(checks):
            raise ValueError("Password must include uppercase, lowercase, number, and special character.")
        return value

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str) -> str:
        if value not in ["admin", "super_admin"]:
            raise ValueError("Role must be 'admin' or 'super_admin'.")
        return value

    @model_validator(mode="after")
    def validate_conditional_fields(self) -> "AdminCreateRequest":
        if self.role == "super_admin":
            if not self.username:
                raise ValueError("Username is required for super_admin role.")
            if not self.password:
                raise ValueError("Password is required for super_admin role.")
        return self


class AdminUpdateRequest(BaseModel):
    email: Optional[str] = Field(None, max_length=255)
    full_name: Optional[str] = Field(None, min_length=2, max_length=150)

    @field_validator("email")
    @classmethod
    def validate_optional_email(cls, value: Optional[str]) -> Optional[str]:
        if value is None or value == "":
            return None
        if "@" not in value or "." not in value.split("@")[-1]:
            raise ValueError("Enter a valid email address.")
        return value.lower()


class AdminStatusRequest(BaseModel):
    is_active: bool


class AdminResponse(BaseModel):
    id: UUID
    username: str
    email: str
    full_name: Optional[str] = None
    role: str
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    generated_password: Optional[str] = None


class AuditLogResponse(BaseModel):
    id: UUID
    actor_user_id: Optional[UUID] = None
    actor_username: Optional[str] = None
    action: str
    entity_type: str
    entity_id: UUID
    target_username: Optional[str] = None
    old_value: Optional[Dict[str, Any]] = None
    new_value: Optional[Dict[str, Any]] = None
    changed_fields: Optional[Dict[str, Any]] = None
    created_at: datetime
