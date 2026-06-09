from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field


class LoginRequestSchema(BaseModel):
    username: str = Field(..., description="Login username.")
    password: str = Field(..., description="Login password.")


class UserLoginResponse(BaseModel):
    id: UUID
    username: str
    full_name: Optional[str] = None
    email: Optional[str] = None
    role: str


class TokenResponseSchema(BaseModel):
    token: str
    token_type: str = "bearer"
    user: UserLoginResponse
    resource_id: Optional[UUID] = None
    onboarding_status: Optional[str] = None
