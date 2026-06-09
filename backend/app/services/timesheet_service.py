from datetime import date
from typing import List, Optional
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from backend.app.models.database import Approval, Resource
from backend.app.repositories.timesheet_repository import TimesheetRepository
from backend.app.schemas.timesheet import TimesheetSubmitRequest


class TimesheetService:

    @staticmethod
    def submit_timesheet(
        db: Session,
        resource_id: UUID,
        user_id: UUID,
        request: TimesheetSubmitRequest
    ):
        # 1. Fetch resource and weekly hours allocation details
        resource = db.query(Resource).filter(Resource.id == resource_id, Resource.is_deleted == False).first()
        if not resource:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Resource profile not found."
            )

        # 2. Prevent duplicate timesheet entries for the same week ending
        existing = TimesheetRepository.get_by_resource_and_week(db, resource_id, request.week_end_date)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A timesheet has already been submitted for this week ending date."
            )

        # 3. Sum up and validate weekly hours cap limits (Resource specific)
        total_hours = 0.0
        for row in request.rows:
            for entry in row.daily_entries:
                total_hours += entry.hours

        if total_hours > resource.weekly_allowed_hours:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Log hours ({total_hours}) exceed weekly limit of {resource.weekly_allowed_hours}."
            )

        # 4. Create timesheet header
        db_timesheet = TimesheetRepository.create_timesheet(db, resource_id, request.week_end_date)

        # 5. Save individual entries
        for row in request.rows:
            for entry in row.daily_entries:
                TimesheetRepository.add_entry(
                    db=db,
                    timesheet_id=db_timesheet.id,
                    project_id=row.project_id,
                    work_date=entry.work_date,
                    hours=entry.hours,
                    remarks=entry.remarks
                )

        # 6. Submit task to the general Approvals workflow engine
        db_approval = Approval(
            module_name="timesheets",
            record_id=db_timesheet.id,
            submitted_by=user_id,
            status="pending"
        )
        db.add(db_approval)

        db.commit()
        db.refresh(db_timesheet)
        return db_timesheet

    @staticmethod
    def approve_or_reject_timesheet(
        db: Session,
        timesheet_id: UUID,
        approved_by: UUID,
        approval_status: str,
        remarks: Optional[str]
    ):
        db_timesheet = TimesheetRepository.get_by_id(db, timesheet_id)
        if not db_timesheet:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Timesheet not found."
            )

        # Update timesheet status
        TimesheetRepository.update_status(db, timesheet_id, approval_status)

        # Resolve workflow approval log
        db_approval = db.query(Approval).filter(
            Approval.module_name == "timesheets",
            Approval.record_id == timesheet_id,
            Approval.status == "pending"
        ).first()

        if db_approval:
            db_approval.status = approval_status
            db_approval.approved_by = approved_by
            db_approval.remarks = remarks
            db.add(db_approval)

        db.commit()
        db.refresh(db_timesheet)
        return db_timesheet
