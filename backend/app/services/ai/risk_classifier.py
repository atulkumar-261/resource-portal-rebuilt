from datetime import date, timedelta
from uuid import UUID
from sqlalchemy.orm import Session
from backend.app.models.database import DailyReport, ReportFlag, ProjectTask, ProjectAssignment


class RiskClassifier:
    @staticmethod
    def classify_project_risk(project_id: UUID, db: Session) -> str:
        """
        Calculates cumulative risk level ('low', 'medium', 'high') by checking:
        - Blockers and critical severity flags logged.
        - Mismatch flags raised.
        - Delayed tasks (past due date and incomplete).
        - Submission gaps for assigned developers.
        """
        # 1. Count blockers
        blocker_count = db.query(ReportFlag).join(DailyReport).filter(
            DailyReport.project_id == project_id,
            ReportFlag.flag_type == "blocker_detected"
        ).count()

        # 2. Count critical severity alerts
        critical_count = db.query(ReportFlag).join(DailyReport).filter(
            DailyReport.project_id == project_id,
            ReportFlag.severity == "critical"
        ).count()

        # 3. Count completion mismatch warnings
        mismatch_count = db.query(ReportFlag).join(DailyReport).filter(
            DailyReport.project_id == project_id,
            ReportFlag.flag_type == "completion_mismatch"
        ).count()

        # 4. Count overdue incomplete tasks
        today = date.today()
        overdue_count = db.query(ProjectTask).filter(
            ProjectTask.project_id == project_id,
            ProjectTask.end_date < today,
            ProjectTask.status != "completed"
        ).count()

        # 5. Check reporting compliance (missing reports in last 5 weekdays)
        assignments = db.query(ProjectAssignment).filter(ProjectAssignment.project_id == project_id).all()
        resource_ids = [a.resource_id for a in assignments]
        
        missing_count = 0
        if resource_ids:
            check_date = today - timedelta(days=7)
            weekdays = []
            while check_date <= today:
                if check_date.weekday() < 5:  # Monday to Friday
                    weekdays.append(check_date)
                check_date += timedelta(days=1)
            
            # Take last 5 weekdays
            weekdays = weekdays[-5:]
            
            for res_id in resource_ids:
                for day in weekdays:
                    has_report = db.query(DailyReport).filter(
                        DailyReport.project_id == project_id,
                        DailyReport.resource_id == res_id,
                        DailyReport.work_date == day
                    ).first()
                    if not has_report:
                        missing_count += 1

        # Calculate weighted risk score
        risk_score = 0
        risk_score += blocker_count * 15
        risk_score += critical_count * 30
        risk_score += mismatch_count * 10
        risk_score += overdue_count * 20
        risk_score += missing_count * 5

        # Classify based on thresholds
        if risk_score >= 50 or critical_count >= 1 or overdue_count >= 3:
            return "high"
        elif risk_score >= 20 or blocker_count >= 2 or missing_count >= 3:
            return "medium"
        else:
            return "low"
