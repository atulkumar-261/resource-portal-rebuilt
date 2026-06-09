from datetime import date, timedelta
from typing import List, Dict
from sqlalchemy.orm import Session
from backend.app.models.database import ProjectTask, TaskScheduleEntry, Resource


class DailyTaskScheduler:
    @staticmethod
    def schedule_tasks(db: Session, project_id: str, project_start_date: date, tasks: List[ProjectTask]):
        """
        Distributes estimated hours for tasks into daily schedule entries.
        Tasks are processed in their pre-sorted topological order.
        """
        # Maintain a lookup of task end dates to resolve dependency start dates
        task_end_dates: Dict[str, date] = {}

        # Maintain a temporary schedule lookup to compute resource daily capacity
        # Key: (resource_id, work_date), Value: planned_hours
        resource_daily_hours: Dict[tuple, int] = {}

        for task in tasks:
            # 1. Determine earliest start date based on dependencies
            earliest_start = project_start_date

            # If task depends on other tasks, it must start after they finish
            dependency_end_dates = []
            for dep in task.dependencies:
                dep_task_id = str(dep.depends_on_task_id)
                if dep_task_id in task_end_dates:
                    dependency_end_dates.append(task_end_dates[dep_task_id])

            if dependency_end_dates:
                # Earnest start date is the day after the latest dependency end date
                latest_dep_end = max(dependency_end_dates)
                earliest_start = latest_dep_end + timedelta(days=1)

            # If task is not assigned to a resource, just set tentative dates and skip schedule entries
            if not task.resource_id:
                task.start_date = earliest_start
                task.end_date = earliest_start + timedelta(days=max(0, (task.estimated_hours + 6) // 7 - 1))
                task_end_dates[str(task.id)] = task.end_date
                continue

            # Fetch resource to get daily capacity limit
            resource = db.query(Resource).filter(Resource.id == task.resource_id).first()
            weekly_limit = resource.weekly_allowed_hours if resource and resource.weekly_allowed_hours else 35
            daily_max = max(1, weekly_limit // 5)  # E.g. 35 -> 7 hours/day

            # 2. Schedule hours day-by-day skipping weekends and checking capacity
            current_date = earliest_start
            remaining_hours = task.estimated_hours
            task_start_date = None

            # Delete any existing schedule entries for this task first to avoid duplicates
            db.query(TaskScheduleEntry).filter(TaskScheduleEntry.task_id == task.id).delete()

            while remaining_hours > 0:
                # Skip weekends (Saturday = 5, Sunday = 6)
                if current_date.weekday() >= 5:
                    current_date += timedelta(days=1)
                    continue

                if task_start_date is None:
                    task_start_date = current_date

                # Check existing planned hours for this resource on this date
                # We check the database + our current run's cached hours
                db_planned = db.query(TaskScheduleEntry).filter(
                    TaskScheduleEntry.resource_id == task.resource_id,
                    TaskScheduleEntry.work_date == current_date
                ).all()
                already_planned = sum([e.planned_hours for e in db_planned])
                
                # Add hours scheduled in this scheduling session run
                cached_key = (str(task.resource_id), current_date)
                already_planned += resource_daily_hours.get(cached_key, 0)

                # Available capacity
                available_capacity = max(0, daily_max - already_planned)

                if available_capacity > 0:
                    hours_to_schedule = min(remaining_hours, available_capacity)
                    
                    # Create database entry
                    schedule_entry = TaskScheduleEntry(
                        task_id=task.id,
                        resource_id=task.resource_id,
                        work_date=current_date,
                        planned_hours=hours_to_schedule,
                        status="planned"
                    )
                    db.add(schedule_entry)

                    # Update remaining hours and cache
                    remaining_hours -= hours_to_schedule
                    resource_daily_hours[cached_key] = resource_daily_hours.get(cached_key, 0) + hours_to_schedule

                # Increment date
                if remaining_hours > 0:
                    current_date += timedelta(days=1)

            # Assign start and end dates to task
            task.start_date = task_start_date if task_start_date else earliest_start
            task.end_date = current_date
            
            # Flush changes and track the end date for subsequent dependency resolution
            db.flush()
            task_end_dates[str(task.id)] = task.end_date

        db.commit()
