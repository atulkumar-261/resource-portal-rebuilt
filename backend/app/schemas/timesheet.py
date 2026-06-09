from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, Field, UUID4, field_validator


class DailyEntrySchema(BaseModel):
    work_date: date
    hours: float = Field(..., ge=0.0, le=24.0, description="Hours worked on this date. Must be between 0 and 24.")
    remarks: Optional[str] = Field(None, max_length=500)


class TimesheetRowSchema(BaseModel):
    project_id: UUID4
    daily_entries: List[DailyEntrySchema] = Field(..., min_items=1, description="List of hours per day.")


class TimesheetSubmitRequest(BaseModel):
    week_end_date: date = Field(..., description="Sunday Week Ending date.")
    rows: List[TimesheetRowSchema] = Field(..., min_items=1, description="List of project row entries.")

    @field_validator("week_end_date")
    def validate_is_sunday(cls, v: date) -> date:
        # 6 is Sunday in python's date.weekday() (Monday is 0, Sunday is 6)
        if v.weekday() != 6:
            raise ValueError("The week_end_date must fall on a Sunday.")
        return v

    @field_validator("rows")
    def validate_weekly_hours_cap(cls, v: List[TimesheetRowSchema]) -> List[TimesheetRowSchema]:
        total_weekly_hours = 0.0
        for row in v:
            for entry in row.daily_entries:
                total_weekly_hours += entry.hours
        
        # Default cap of 35 hours
        if total_weekly_hours > 35.0:
            raise ValueError(f"Total logged weekly hours ({total_weekly_hours}) exceeds the limit of 35.0 hours.")
        return v


class TimesheetEntryResponse(BaseModel):
    id: UUID4
    project_id: UUID4
    work_date: date
    hours: float
    remarks: Optional[str]

    class Config:
        from_attributes = True


class TimesheetHeaderResponse(BaseModel):
    id: UUID4
    resource_id: UUID4
    week_end_date: date
    status: str
    created_at: datetime
    entries: List[TimesheetEntryResponse] = []

    class Config:
        from_attributes = True


class TimesheetApprovalRequest(BaseModel):
    status: str = Field(..., description="Must be approved or rejected.")
    remarks: Optional[str] = Field(None, max_length=500)

    @field_validator("status")
    def validate_status_values(cls, v: str) -> str:
        val = v.lower().strip()
        if val not in ["approved", "rejected"]:
            raise ValueError("Status must be either 'approved' or 'rejected'.")
        return val
