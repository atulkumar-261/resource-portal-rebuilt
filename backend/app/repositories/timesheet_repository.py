from datetime import date
from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from backend.app.models.database import Timesheet, TimesheetEntry


class TimesheetRepository:

    @staticmethod
    def get_by_id(db: Session, timesheet_id: UUID) -> Optional[Timesheet]:
        return db.query(Timesheet).filter(
            Timesheet.id == timesheet_id,
            Timesheet.is_deleted == False
        ).first()

    @staticmethod
    def get_by_resource_and_week(db: Session, resource_id: UUID, week_end_date: date) -> Optional[Timesheet]:
        return db.query(Timesheet).filter(
            Timesheet.resource_id == resource_id,
            Timesheet.week_end_date == week_end_date,
            Timesheet.is_deleted == False
        ).first()

    @staticmethod
    def get_all_by_resource(db: Session, resource_id: UUID) -> List[Timesheet]:
        return db.query(Timesheet).filter(
            Timesheet.resource_id == resource_id,
            Timesheet.is_deleted == False
        ).order_by(Timesheet.week_end_date.desc()).all()

    @staticmethod
    def create_timesheet(db: Session, resource_id: UUID, week_end_date: date) -> Timesheet:
        db_timesheet = Timesheet(
            resource_id=resource_id,
            week_end_date=week_end_date,
            status="pending"
        )
        db.add(db_timesheet)
        db.flush()  # Populates db_timesheet.id
        return db_timesheet

    @staticmethod
    def add_entry(
        db: Session,
        timesheet_id: UUID,
        project_id: UUID,
        work_date: date,
        hours: float,
        remarks: Optional[str]
    ) -> TimesheetEntry:
        db_entry = TimesheetEntry(
            timesheet_id=timesheet_id,
            project_id=project_id,
            work_date=work_date,
            hours=hours,
            remarks=remarks
        )
        db.add(db_entry)
        return db_entry

    @staticmethod
    def update_status(db: Session, timesheet_id: UUID, status: str) -> Optional[Timesheet]:
        db_timesheet = TimesheetRepository.get_by_id(db, timesheet_id)
        if db_timesheet:
            db_timesheet.status = status
            db.add(db_timesheet)
            db.flush()
        return db_timesheet

    @staticmethod
    def soft_delete(db: Session, timesheet_id: UUID, user_id: UUID) -> bool:
        db_timesheet = TimesheetRepository.get_by_id(db, timesheet_id)
        if db_timesheet:
            db_timesheet.is_deleted = True
            db_timesheet.deleted_at = date.today()
            db_timesheet.deleted_by = user_id
            db.add(db_timesheet)
            db.flush()
            return True
        return False
