from datetime import date, timedelta
from typing import List, Dict, Any
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.app.models.database import Resource, TaskScheduleEntry, ProjectTask, Project


class WorkloadService:
    @staticmethod
    def get_resources_workload_summary(db: Session, start_date: date, end_date: date) -> List[Dict[str, Any]]:
        """
        Computes workload metrics (assigned hours, capacity, utilization, warnings) for all resources in a date range.
        Useful for building the admin workload heatmap.
        """
        resources = db.query(Resource).filter(Resource.is_deleted == False).all()
        
        # Calculate number of weekdays in range to determine capacity
        num_weekdays = 0
        curr = start_date
        while curr <= end_date:
            if curr.weekday() < 5:
                num_weekdays += 1
            curr += timedelta(days=1)

        summary = []
        for res in resources:
            weekly_limit = res.weekly_allowed_hours if res.weekly_allowed_hours else 35
            daily_limit = weekly_limit / 5
            total_capacity = daily_limit * num_weekdays

            # Sum up planned hours in this date range
            planned_hours_sum = db.query(func.coalesce(func.sum(TaskScheduleEntry.planned_hours), 0)).filter(
                TaskScheduleEntry.resource_id == res.id,
                TaskScheduleEntry.work_date >= start_date,
                TaskScheduleEntry.work_date <= end_date
            ).scalar()

            # Determine if there is any daily overload (i.e. planned hours exceeds daily limit on any day)
            daily_overload_days = db.query(TaskScheduleEntry.work_date).filter(
                TaskScheduleEntry.resource_id == res.id,
                TaskScheduleEntry.work_date >= start_date,
                TaskScheduleEntry.work_date <= end_date
            ).group_by(TaskScheduleEntry.work_date).having(func.sum(TaskScheduleEntry.planned_hours) > daily_limit).all()

            overloaded = len(daily_overload_days) > 0 or (total_capacity > 0 and planned_hours_sum > total_capacity)
            utilization = round((planned_hours_sum / total_capacity) * 100, 2) if total_capacity > 0 else 0.0

            # Gather day-by-day detail
            day_details = []
            curr = start_date
            while curr <= end_date:
                daily_planned = db.query(func.coalesce(func.sum(TaskScheduleEntry.planned_hours), 0)).filter(
                    TaskScheduleEntry.resource_id == res.id,
                    TaskScheduleEntry.work_date == curr
                ).scalar()
                
                day_details.append({
                    "date": curr.isoformat(),
                    "planned_hours": int(daily_planned),
                    "is_overloaded": daily_planned > daily_limit
                })
                curr += timedelta(days=1)

            summary.append({
                "resource_id": str(res.id),
                "fullName": res.full_name,
                "jobTitle": res.designation.title if res.designation else "Software Engineer",
                "assigned_hours": float(planned_hours_sum),
                "capacity_hours": float(total_capacity),
                "utilization_rate": utilization,
                "is_overloaded": overloaded,
                "daily_details": day_details
            })

        return summary

    @staticmethod
    def get_resource_schedule(db: Session, resource_id: UUID, start_date: date, end_date: date) -> List[Dict[str, Any]]:
        """
        Retrieves detailed schedule entries for a specific resource including task info and project names.
        """
        entries = db.query(TaskScheduleEntry, ProjectTask, Project).join(
            ProjectTask, TaskScheduleEntry.task_id == ProjectTask.id
        ).join(
            Project, ProjectTask.project_id == Project.id
        ).filter(
            TaskScheduleEntry.resource_id == resource_id,
            TaskScheduleEntry.work_date >= start_date,
            TaskScheduleEntry.work_date <= end_date
        ).all()

        schedule = []
        for entry, task, project in entries:
            schedule.append({
                "schedule_id": str(entry.id),
                "task_id": str(task.id),
                "task_name": task.task_name,
                "project_id": str(project.id),
                "project_name": project.name,
                "work_date": entry.work_date.isoformat(),
                "planned_hours": entry.planned_hours,
                "status": entry.status
            })

        return schedule
