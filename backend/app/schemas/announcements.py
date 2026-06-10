from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field

class AnnouncementCreateRequest(BaseModel):
    subject: str = Field(..., max_length=255)
    message: str
    date: str

class AnnouncementResponse(BaseModel):
    id: UUID
    subject: str
    message: str
    date: str
    attachment_name: Optional[str] = None
    attachment_key: Optional[str] = None

    class Config:
        from_attributes = True
