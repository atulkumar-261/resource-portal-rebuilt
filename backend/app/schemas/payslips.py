from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field

class PayslipResponse(BaseModel):
    id: UUID
    resource_id: UUID = Field(..., alias="resourceId")
    resource_name: str = Field(..., alias="resourceName")
    month: str
    days: int
    notes: Optional[str] = None
    amount: float
    file_attachment_id: Optional[UUID] = Field(None, alias="fileAttachmentId")

    class Config:
        from_attributes = True
        populate_by_name = True
