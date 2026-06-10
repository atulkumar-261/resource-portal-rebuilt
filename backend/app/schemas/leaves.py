from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field

class LeaveApplyRequest(BaseModel):
    leave_type_id: UUID = Field(..., alias="leaveTypeId")
    from_date: str = Field(..., alias="fromDate")
    to_date: str = Field(..., alias="toDate")
    reason: Optional[str] = None

    class Config:
        populate_by_name = True

class LeaveResponse(BaseModel):
    id: UUID
    resource_id: UUID = Field(..., alias="resourceId")
    resource_name: str = Field(..., alias="resourceName")
    from_date: str = Field(..., alias="fromDate")
    to_date: str = Field(..., alias="toDate")
    total_days: int = Field(..., alias="totalDays")
    type: str  # Annual, Sick, Unpaid, Casual
    reason: Optional[str] = None
    status: str

    class Config:
        from_attributes = True
        populate_by_name = True
