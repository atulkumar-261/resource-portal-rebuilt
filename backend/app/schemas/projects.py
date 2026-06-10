from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field

class ProjectCreateRequest(BaseModel):
    name: str = Field(..., max_length=150)
    client: str = Field(..., description="Client name")
    start_date: str = Field(..., alias="startDate")
    end_date: Optional[str] = Field(None, alias="endDate")
    status: str = Field("active", description="active, completed, or on-hold")
    description: Optional[str] = None

    class Config:
        populate_by_name = True

class ProjectUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, max_length=150)
    client: Optional[str] = Field(None, description="Client name")
    start_date: Optional[str] = Field(None, alias="startDate")
    end_date: Optional[str] = Field(None, alias="endDate")
    status: Optional[str] = Field(None, description="active, completed, or on-hold")
    description: Optional[str] = None

    class Config:
        populate_by_name = True

class ProjectResponse(BaseModel):
    id: UUID
    name: str
    client: str  # Client name
    client_id: UUID
    start_date: str = Field(..., alias="startDate")
    end_date: Optional[str] = Field(None, alias="endDate")
    status: str
    description: Optional[str] = None

    class Config:
        from_attributes = True
        populate_by_name = True
