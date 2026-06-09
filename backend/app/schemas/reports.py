from datetime import date, datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field


class DailyReportItemCreate(BaseModel):
    task_id: UUID = Field(..., description="ID of the task")
    hours_spent: float = Field(..., ge=0.0, le=24.0, description="Hours spent on task")
    completion_percent: int = Field(..., ge=0, le=100, description="Completion percentage (0-100)")
    comments: Optional[str] = Field(None, description="Developer comments on this task")


class DailyReportCreate(BaseModel):
    project_id: UUID = Field(..., description="Project ID")
    work_date: date = Field(..., description="Date of the work logged")
    work_done: Optional[str] = Field(None, description="Text description of work completed")
    blockers: Optional[str] = Field(None, description="Text description of blockers")
    tomorrow_plan: Optional[str] = Field(None, description="Text description of plan for tomorrow")
    hours_worked: float = Field(..., ge=0.0, le=24.0, description="Total daily hours worked")
    items: List[DailyReportItemCreate] = Field(default=[], description="List of task-level reporting items")


class DailyReportItemResponse(BaseModel):
    id: UUID
    report_id: UUID
    task_id: UUID
    task_name: Optional[str] = None
    hours_spent: float
    completion_percent: int
    comments: Optional[str] = None

    class Config:
        from_attributes = True


class ReportFlagResponse(BaseModel):
    id: UUID
    report_id: UUID
    flag_type: str
    severity: str
    message: str
    created_at: datetime

    class Config:
        from_attributes = True


class ReportAnalysisResponse(BaseModel):
    summary: Optional[str] = None
    progress_score: int
    risk_level: str
    warnings: List[str] = []


class DailyReportResponse(BaseModel):
    id: UUID
    resource_id: UUID
    resource_name: Optional[str] = None
    project_id: UUID
    project_name: Optional[str] = None
    work_date: date
    work_done: Optional[str] = None
    blockers: Optional[str] = None
    tomorrow_plan: Optional[str] = None
    hours_worked: float
    status: str
    created_at: datetime
    submitted_at: datetime
    items: List[DailyReportItemResponse] = []
    analysis_result: Optional[ReportAnalysisResponse] = None
    flags: List[ReportFlagResponse] = []

    class Config:
        from_attributes = True


class ModuleProgressSchema(BaseModel):
    module_id: int
    module_name: str
    progress: float = Field(..., ge=0.0, le=100.0, description="Module weighted progress percent")
    estimated_hours: float
    completed_hours: float


class BurndownPoint(BaseModel):
    work_date: date
    planned_remaining_hours: float
    actual_remaining_hours: float


class ProjectProgressResponse(BaseModel):
    project_id: UUID
    overall_progress: float = Field(..., ge=0.0, le=100.0)
    module_progress: List[ModuleProgressSchema] = []
    estimated_hours: float
    actual_hours: float
    burndown_data: List[BurndownPoint] = []
    risk_level: str = "low"
    risk_warnings: List[str] = []


class ProductivityResponse(BaseModel):
    id: UUID  # project_id or resource_id
    name: str  # project name or resource name
    reports_submitted: int
    hours_logged: float
    tasks_completed: int
    current_progress: float
    reporting_streak: int = 0
    efficiency_metrics: Optional[dict] = None
