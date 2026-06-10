from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field

class ClientCreateRequest(BaseModel):
    name: str = Field(..., max_length=150)
    contact_person: Optional[str] = Field(None, max_length=150)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=25)
    address: Optional[str] = None

class ClientUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, max_length=150)
    contact_person: Optional[str] = Field(None, max_length=150)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=25)
    address: Optional[str] = None

class ClientResponse(BaseModel):
    id: UUID
    name: str
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

    class Config:
        from_attributes = True
