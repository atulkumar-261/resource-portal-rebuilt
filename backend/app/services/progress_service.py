from datetime import date, timedelta
from typing import Dict, List, Any
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.app.models.database import (
    Project,
    ProjectTask,
    ProjectRequirement,
    ReportFlag,
    DailyReport,
    DailyReportItem,
    TaskScheduleEntry,
    ProjectAssignment,
    Resource,
    ResourceAddress,
    ResourceEmergencyContact,
    ResourceBankDetails,
    ResourceDocument,
)
from backend.app.services.ai.risk_classifier import RiskClassifier


class ProgressService:
    @staticmethod
    def get_task_completion_percent(task: ProjectTask, db: Session) -> int:
        """
        Determines current task completion percentage (0-100) based on status and daily report inputs.
        """
        if task.status == "completed":
            return 100
        if task.status == "pending":
            return 0
        
        # Look for the latest logged progress percentage from daily reports
        latest_item = db.query(DailyReportItem).join(DailyReport).filter(
            DailyReportItem.task_id == task.id
        ).order_by(DailyReport.work_date.desc(), DailyReport.created_at.desc()).first()
        
        if latest_item:
            return latest_item.completion_percent
        
        # Fallback to actual effort ratio
        if task.estimated_hours > 0:
            return min(95, int((task.actual_hours / task.estimated_hours) * 100))
        return 10

    @staticmethod
    def calculate_project_progress(project_id: UUID, db: Session) -> dict:
        """
        Main engine computing weighted progress, module breakdown, burndown data, and alerts.
        """
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return {}

        tasks = db.query(ProjectTask).filter(ProjectTask.project_id == project_id).all()
        
        # 1. Weighted task completion calculation
        total_est = sum(t.estimated_hours for t in tasks)
        weighted_sum = 0
        actual_hours = 0
        for t in tasks:
            pct = ProgressService.get_task_completion_percent(t, db)
            weighted_sum += (pct / 100.0) * t.estimated_hours
            actual_hours += t.actual_hours

        overall_progress = (weighted_sum / total_est * 100.0) if total_est > 0 else 0.0
        overall_progress = min(100.0, max(0.0, overall_progress))

        # 2. Module progress calculation
        requirements = db.query(ProjectRequirement).filter(ProjectRequirement.project_id == project_id).all()
        module_progress = []
        for req in requirements:
            req_tasks = [t for t in tasks if t.requirement_id == req.id]
            req_est = sum(t.estimated_hours for t in req_tasks)
            req_weighted = 0
            req_actual = 0
            for t in req_tasks:
                pct = ProgressService.get_task_completion_percent(t, db)
                req_weighted += (pct / 100.0) * t.estimated_hours
                req_actual += t.actual_hours
            
            req_progress = (req_weighted / req_est * 100.0) if req_est > 0 else 0.0
            module_progress.append({
                "module_id": req.id,
                "module_name": req.module_name,
                "progress": min(100.0, max(0.0, req_progress)),
                "estimated_hours": float(req_est),
                "completed_hours": float(req_actual)
            })

        # 3. Burndown chart generation
        start_date = project.start_date
        end_date = project.end_date or (date.today() + timedelta(weeks=4))
        
        # Sum actual hours spent per work_date
        actual_by_date = {}
        reports = db.query(DailyReport).filter(DailyReport.project_id == project_id).all()
        for r in reports:
            actual_by_date[r.work_date] = actual_by_date.get(r.work_date, 0.0) + float(r.hours_worked)

        burndown_data = []
        current_date = start_date
        
        # Calculate stepped intervals (max 15 dates in burndown chart)
        step_days = max(1, (end_date - start_date).days // 15)
        
        while current_date <= end_date:
            # Planned remaining hours: total planned hours in schedule entries *after* current_date
            planned_after_date = db.query(func.sum(TaskScheduleEntry.planned_hours)).join(ProjectTask).filter(
                ProjectTask.project_id == project_id,
                TaskScheduleEntry.work_date > current_date
            ).scalar() or 0
            
            # Actual remaining hours: Total estimated minus sum of hours logged up to current_date
            actual_logged = sum(val for dt, val in actual_by_date.items() if dt <= current_date)
            act_remaining = max(0.0, float(total_est) - float(actual_logged))
            
            burndown_data.append({
                "work_date": current_date,
                "planned_remaining_hours": float(planned_after_date),
                "actual_remaining_hours": float(act_remaining)
            })
            
            current_date += timedelta(days=step_days)

        # 4. Risk and active alert flags
        risk_level = RiskClassifier.classify_project_risk(project_id, db)
        flags = db.query(ReportFlag).join(DailyReport).filter(
            DailyReport.project_id == project_id
        ).all()
        risk_warnings = list(set(f.message for f in flags))

        return {
            "project_id": project_id,
            "overall_progress": overall_progress,
            "module_progress": module_progress,
            "estimated_hours": float(total_est),
            "actual_hours": float(actual_hours),
            "burndown_data": burndown_data,
            "risk_level": risk_level,
            "risk_warnings": risk_warnings
        }

    @staticmethod
    def get_resource_reporting_streak(resource_id: UUID, db: Session) -> int:
        """
        Calculates consecutive weekdays where the resource submitted a daily report.
        """
        reports = db.query(DailyReport.work_date).filter(
            DailyReport.resource_id == resource_id
        ).order_by(DailyReport.work_date.desc()).all()
        
        if not reports:
            return 0
            
        unique_dates = sorted(list(set(d[0] for d in reports)), reverse=True)
        
        # Allow a 3-day grace period for recent submissions (e.g. over weekend)
        if unique_dates[0] < date.today() - timedelta(days=3):
            return 0
            
        streak = 0
        current_check = unique_dates[0]
        idx = 0
        while idx < len(unique_dates):
            if unique_dates[idx] == current_check:
                streak += 1
                idx += 1
                current_check -= timedelta(days=1)
                # Skip weekends
                while current_check.weekday() >= 5:
                    current_check -= timedelta(days=1)
            else:
                break
                
        return streak

    @staticmethod
    def get_resource_productivity(resource_id: UUID, db: Session) -> dict:
        """
        Gathers stats representing developer productivity.
        """
        res = db.query(Resource).filter(Resource.id == resource_id, Resource.is_deleted == False).first()
        name = res.full_name if res else "Developer"
        
        # Reports count
        reports_count = db.query(DailyReport).filter(DailyReport.resource_id == resource_id).count()
        
        # Total logged hours
        total_hours = db.query(func.sum(DailyReport.hours_worked)).filter(
            DailyReport.resource_id == resource_id
        ).scalar() or 0.0
        
        # Tasks completed
        tasks = db.query(ProjectTask).filter(ProjectTask.resource_id == resource_id).all()
        tasks_completed = sum(1 for t in tasks if t.status == "completed")
        
        # Average completion progress
        weighted_sum = 0
        total_est = sum(t.estimated_hours for t in tasks)
        for t in tasks:
            pct = ProgressService.get_task_completion_percent(t, db)
            weighted_sum += (pct / 100.0) * t.estimated_hours
        avg_progress = (weighted_sum / total_est * 100.0) if total_est > 0 else 0.0
        
        streak = ProgressService.get_resource_reporting_streak(resource_id, db)
        
        # Calculate warnings generated for developer
        warnings_count = db.query(ReportFlag).join(DailyReport).filter(
            DailyReport.resource_id == resource_id
        ).count()
        
        efficiency = 100.0 - (warnings_count * 10)
        efficiency = max(20.0, min(100.0, efficiency))
        
        return {
            "id": resource_id,
            "name": name,
            "reports_submitted": reports_count,
            "hours_logged": float(total_hours),
            "tasks_completed": tasks_completed,
            "current_progress": round(avg_progress, 1),
            "reporting_streak": streak,
            "efficiency_metrics": {
                "efficiency_score": efficiency,
                "audits_failed": warnings_count
            }
        }

    @staticmethod
    def get_project_productivity(project_id: UUID, db: Session) -> dict:
        """
        Compiles aggregate productivity statistics across a project team.
        """
        proj = db.query(Project).filter(Project.id == project_id).first()
        name = proj.name if proj else "Project"

        reports_count = db.query(DailyReport).filter(DailyReport.project_id == project_id).count()
        total_hours = db.query(func.sum(DailyReport.hours_worked)).filter(
            DailyReport.project_id == project_id
        ).scalar() or 0.0
        
        tasks = db.query(ProjectTask).filter(ProjectTask.project_id == project_id).all()
        tasks_completed = sum(1 for t in tasks if t.status == "completed")
        
        progress_data = ProgressService.calculate_project_progress(project_id, db)
        overall_progress = progress_data.get("overall_progress", 0.0)
        
        # Average developer streak
        assignments = db.query(ProjectAssignment).filter(ProjectAssignment.project_id == project_id).all()
        streaks = []
        for a in assignments:
            streaks.append(ProgressService.get_resource_reporting_streak(a.resource_id, db))
        avg_streak = int(sum(streaks) / len(streaks)) if streaks else 0
        
        return {
            "id": project_id,
            "name": name,
            "reports_submitted": reports_count,
            "hours_logged": float(total_hours),
            "tasks_completed": tasks_completed,
            "current_progress": round(overall_progress, 1),
            "reporting_streak": avg_streak,
            "efficiency_metrics": {
                "active_developers": len(assignments),
                "tasks_total": len(tasks)
            }
        }

    # ==========================================================
    # PROFILE COMPLETION ENGINE
    # ==========================================================

    # Weight Map: field_label -> (weight, check_function)
    # Total adds up to 100.

    PROFILE_WEIGHTS: List[Dict[str, Any]] = [
        # ─── Basic Details (30%) ───
        {"field": "full_name",   "label": "Full Name",   "weight": 5, "group": "basic"},
        {"field": "email",       "label": "Email",       "weight": 5, "group": "basic"},
        {"field": "phone",       "label": "Phone",       "weight": 5, "group": "basic"},
        {"field": "dob",         "label": "Date of Birth","weight": 5, "group": "basic"},
        {"field": "ni_number",   "label": "NI Number",   "weight": 5, "group": "basic"},
        {"field": "nationality", "label": "Nationality", "weight": 5, "group": "basic"},
        # ─── Address & Emergency Contact (20%) ───
        {"field": "_address_exists",       "label": "Current Address",       "weight": 5, "group": "address"},
        {"field": "_emergency_name",       "label": "Emergency Contact Name","weight": 5, "group": "address"},
        {"field": "_emergency_phone",      "label": "Emergency Contact Phone","weight": 5, "group": "address"},
        {"field": "_emergency_extra",      "label": "Emergency Email/Address","weight": 5, "group": "address"},
        # ─── Bank Details (20%) ───
        {"field": "_bank_name",    "label": "Bank Name",       "weight": 5,  "group": "bank"},
        {"field": "_bank_account", "label": "Account Number",  "weight": 10, "group": "bank"},
        {"field": "_bank_sort",    "label": "Sort Code",       "weight": 5,  "group": "bank"},
        # ─── Skills & Documents (30%) ───
        {"field": "skillset",      "label": "Skillset",        "weight": 10, "group": "skills"},
        {"field": "_doc_cv",       "label": "CV Uploaded",     "weight": 10, "group": "skills"},
        {"field": "_doc_passport", "label": "Passport Uploaded","weight": 5, "group": "skills"},
        {"field": "_doc_visa",     "label": "Visa Uploaded",   "weight": 5,  "group": "skills"},
    ]

    @staticmethod
    def _check_field(resource: Resource, field_key: str, db: Session,
                     address: Any = None, emergency: Any = None,
                     bank: Any = None, doc_types: set = None) -> bool:
        """Returns True if the given profile field is populated."""
        # Direct resource columns
        if not field_key.startswith("_"):
            val = getattr(resource, field_key, None)
            if val is None:
                return False
            if isinstance(val, str) and not val.strip():
                return False
            return True

        # Address related
        if field_key == "_address_exists":
            return address is not None and bool(getattr(address, "current_address", None))
        # Emergency contact
        if field_key == "_emergency_name":
            return emergency is not None and bool(getattr(emergency, "contact_name", None))
        if field_key == "_emergency_phone":
            return emergency is not None and bool(getattr(emergency, "phone", None))
        if field_key == "_emergency_extra":
            if emergency is None:
                return False
            return bool(getattr(emergency, "email", None)) or bool(getattr(emergency, "address", None))
        # Bank details
        if field_key == "_bank_name":
            return bank is not None and bool(getattr(bank, "bank_name", None))
        if field_key == "_bank_account":
            return bank is not None and bool(getattr(bank, "account_number", None))
        if field_key == "_bank_sort":
            return bank is not None and bool(getattr(bank, "sort_code", None))
        # Document uploads (from resource_documents table)
        if field_key == "_doc_cv":
            return "cv" in (doc_types or set())
        if field_key == "_doc_passport":
            return "passport" in (doc_types or set())
        if field_key == "_doc_visa":
            return "visa" in (doc_types or set())

        return False

    @staticmethod
    def calculate_profile_completion(resource: Resource, db: Session) -> Dict[str, Any]:
        """
        Calculates dynamic profile completion percentage based on weighted field checks.
        Updates resource.profile_completion_percentage and resource.onboarding_status in DB.
        Returns: {"completion_percentage": int, "missing_fields": List[str], "onboarding_status": str}
        """
        # Preload related records once for efficiency
        address = db.query(ResourceAddress).filter(
            ResourceAddress.resource_id == resource.id
        ).first()
        emergency = db.query(ResourceEmergencyContact).filter(
            ResourceEmergencyContact.resource_id == resource.id
        ).first()
        bank = db.query(ResourceBankDetails).filter(
            ResourceBankDetails.resource_id == resource.id
        ).first()

        # Fetch uploaded document types
        docs = db.query(ResourceDocument.document_type).filter(
            ResourceDocument.resource_id == resource.id
        ).all()
        doc_types = {d[0].lower().strip() for d in docs} if docs else set()

        earned = 0
        missing_fields: List[str] = []

        for entry in ProgressService.PROFILE_WEIGHTS:
            filled = ProgressService._check_field(
                resource, entry["field"], db,
                address=address, emergency=emergency,
                bank=bank, doc_types=doc_types
            )
            if filled:
                earned += entry["weight"]
            else:
                missing_fields.append(entry["label"])

        completion = min(100, max(0, earned))

        # Derive onboarding status
        if completion >= 80:
            onboarding = "completed"
        else:
            onboarding = "pending"

        # Persist to resource record
        resource.profile_completion_percentage = completion
        resource.onboarding_status = onboarding
        db.add(resource)
        db.flush()

        return {
            "completion_percentage": completion,
            "missing_fields": missing_fields,
            "onboarding_status": onboarding,
        }
