from datetime import date, datetime, timedelta
from uuid import UUID
from sqlalchemy.orm import Session
from backend.app.models.database import (
    Notification,
    User,
    Role,
    Project,
    ProjectAssignment,
    DailyReport,
    ReportFlag,
    Resource
)


class ReportNotificationService:
    @staticmethod
    def generate_report_alerts(db: Session):
        """
        Scans projects and resources to generate notifications for:
        - Developers who missed submitting today's daily report.
        - Admins when high-risk blocker flags are raised.
        - Admins when submission delays or volume gaps occur.
        """
        today = date.today()
        # Reminders are only relevant on weekdays
        if today.weekday() >= 5:
            return

        # Fetch admin users to send manager/auditor alerts
        admins = db.query(User).join(Role).filter(Role.name == "admin").all()
        admin_ids = [a.id for a in admins]

        active_projects = db.query(Project).filter(Project.is_deleted == False, Project.status_id != None).all()
        
        for project in active_projects:
            # 1. Fetch assigned developers
            assignments = db.query(ProjectAssignment).filter(ProjectAssignment.project_id == project.id).all()
            for assign in assignments:
                resource = db.query(Resource).filter(Resource.id == assign.resource_id, Resource.is_deleted == False).first()
                if not resource:
                    continue

                # Check if report was submitted for today
                report = db.query(DailyReport).filter(
                    DailyReport.project_id == project.id,
                    DailyReport.resource_id == resource.id,
                    DailyReport.work_date == today
                ).first()

                if not report:
                    # Notify the developer user directly
                    dev_user = db.query(User).filter(User.resource_id == resource.id).first()
                    if dev_user:
                        # Check if a reminder was already created today to avoid duplicates
                        exists = db.query(Notification).filter(
                            Notification.recipient_id == dev_user.id,
                            Notification.module_name == "reports",
                            Notification.title == "Missing Daily Report Reminder",
                            Notification.created_at >= datetime.combine(today, datetime.min.time())
                        ).first()

                        if not exists:
                            reminder = Notification(
                                recipient_id=dev_user.id,
                                module_name="reports",
                                record_id=project.id,
                                title="Missing Daily Report Reminder",
                                message=f"Hi {resource.full_name}, you haven't submitted today's daily report for project '{project.name}'. Please log your tasks.",
                                priority="medium",
                                is_read=False
                            )
                            db.add(reminder)

                    # Notify admins of the developer's missing report
                    for admin_id in admin_ids:
                        exists_admin = db.query(Notification).filter(
                            Notification.recipient_id == admin_id,
                            Notification.module_name == "reports",
                            Notification.title == "Developer Missing Report Alert",
                            Notification.message.like(f"%{resource.full_name}%"),
                            Notification.created_at >= datetime.combine(today, datetime.min.time())
                        ).first()

                        if not exists_admin:
                            admin_alert = Notification(
                                recipient_id=admin_id,
                                module_name="reports",
                                record_id=project.id,
                                title="Developer Missing Report Alert",
                                message=f"Developer '{resource.full_name}' has not logged a daily report today for project '{project.name}'.",
                                priority="low",
                                is_read=False
                            )
                            db.add(admin_alert)

            # 2. Check for newly generated critical/blocker flags on this project today
            new_flags = db.query(ReportFlag).join(DailyReport).filter(
                DailyReport.project_id == project.id,
                DailyReport.work_date == today,
                ReportFlag.flag_type == "blocker_detected"
            ).all()

            for flag in new_flags:
                report_obj = db.query(DailyReport).filter(DailyReport.id == flag.report_id).first()
                dev_name = "A developer"
                if report_obj and report_obj.resource:
                    dev_name = report_obj.resource.full_name

                # Alert admins of critical blocker
                for admin_id in admin_ids:
                    exists_blocker = db.query(Notification).filter(
                        Notification.recipient_id == admin_id,
                        Notification.module_name == "reports",
                        Notification.record_id == flag.report_id,
                        Notification.title == "Project Blocker Warning"
                    ).first()

                    if not exists_blocker:
                        blocker_alert = Notification(
                            recipient_id=admin_id,
                            module_name="reports",
                            record_id=flag.report_id,
                            title="Project Blocker Warning",
                            message=f"High risk blocker logged on project '{project.name}' by {dev_name}: '{flag.message}'",
                            priority="high",
                            is_read=False
                        )
                        db.add(blocker_alert)

        db.commit()
