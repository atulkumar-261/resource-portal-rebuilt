from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field

class TaskCreateRequest(BaseModel):
    subject: str = Field(..., max_length=255)
    start_date: str = Field(..., alias="startDate")
    resource_id: UUID = Field(..., alias="resourceId")
    project: str = Field(..., description="Project name")
    notes: Optional[str] = None

    class Config:
        populate_by_name = True

class TaskUpdateRequest(BaseModel):
    subject: Optional[str] = Field(None, max_length=255)
    start_date: Optional[str] = Field(None, alias="startDate")
    resource_id: Optional[UUID] = Field(None, alias="resourceId")
    project: Optional[str] = Field(None, description="Project name")
    notes: Optional[str] = None
    status: Optional[str] = None

    class Config:
        populate_by_name = True

class TaskResponse(BaseModel):
    id: UUID
    subject: str
    start_date: str = Field(..., alias="startDate")
    resource_id: UUID = Field(..., alias="resourceId")
    resource_name: str = Field(..., alias="resourceName")
    project: str  # Project name
    project_id: UUID
    notes: Optional[str] = None
    status: str

    class Config:
        from_attributes = True
        populate_by_name = True
