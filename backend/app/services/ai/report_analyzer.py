import os
import json
import httpx
from datetime import datetime
from sqlalchemy.orm import Session
from backend.app.models.database import DailyReport, DailyReportItem, ReportAnalysisResult, ReportFlag, ProjectTask


class ReportAnalyzer:
    @staticmethod
    async def analyze_report(report_id: str, db: Session) -> dict:
        """
        Retrieves a report, runs AI analysis (or mock fallback), updates status to 'analyzed',
        and saves results (summary and flags) directly to the database.
        """
        report = db.query(DailyReport).filter(DailyReport.id == report_id).first()
        if not report:
            print(f"Report {report_id} not found for AI analysis.")
            return {}

        # Fetch report items and their associated tasks
        items = db.query(DailyReportItem).filter(DailyReportItem.report_id == report_id).all()
        
        # Prepare context payload for the LLM
        item_details = []
        for it in items:
            task = db.query(ProjectTask).filter(ProjectTask.id == it.task_id).first()
            task_name = task.task_name if task else "Unknown Task"
            est_hours = task.estimated_hours if task else 0
            item_details.append({
                "task_name": task_name,
                "estimated_hours": est_hours,
                "hours_spent": float(it.hours_spent),
                "completion_percent": it.completion_percent,
                "comments": it.comments or ""
            })

        report_data = {
            "work_done": report.work_done or "",
            "blockers": report.blockers or "",
            "tomorrow_plan": report.tomorrow_plan or "",
            "hours_worked": float(report.hours_worked),
            "items": item_details
        }

        # Check for API keys to delegate to OpenAI or DeepSeek
        openai_key = os.environ.get("OPENAI_API_KEY")
        deepseek_key = os.environ.get("DEEPSEEK_API_KEY")
        
        prompt = (
            f"Analyze the following software developer daily report details:\n"
            f"{json.dumps(report_data, indent=2)}\n\n"
            "Return a strictly valid JSON document containing an analysis result.\n"
            "Ensure the response matches this JSON format and nothing else:\n"
            "{\n"
            "  \"summary\": \"AI summary of what was accomplished\",\n"
            "  \"progress_score\": 85,\n"
            "  \"risk_level\": \"low\",\n"
            "  \"warnings\": [\n"
            "    {\n"
            "      \"flag_type\": \"vague_report\",\n"
            "      \"severity\": \"warning\",\n"
            "      \"message\": \"Detailed warning text description\"\n"
            "    }\n"
            "  ]\n"
            "}\n\n"
            "Flags guidelines:\n"
            "1. If 'work_done' is extremely short, generic, or vague (e.g. 'worked on tasks', 'completed work'), generate a 'vague_report' flag.\n"
            "2. If blockers are mentioned or contain blocking keywords, generate a 'blocker_detected' flag and increase 'risk_level' to medium or high.\n"
            "3. If completion_percent is marked very high (e.g. 100%) but hours_spent is tiny compared to a large estimated_hours, generate 'completion_mismatch' flag.\n"
        )

        analysis_dict = None
        if openai_key:
            analysis_dict = await ReportAnalyzer._call_openai(openai_key, prompt)
        elif deepseek_key:
            analysis_dict = await ReportAnalyzer._call_deepseek(deepseek_key, prompt)

        # Fallback to local rule-based deterministic parsing
        if not analysis_dict:
            analysis_dict = ReportAnalyzer._run_local_analysis(report_data)

        # Clean existing analysis/flags for safety if re-running
        db.query(ReportAnalysisResult).filter(ReportAnalysisResult.report_id == report.id).delete()
        db.query(ReportFlag).filter(ReportFlag.report_id == report.id).delete()

        # Save analysis result caching record
        analysis_res = ReportAnalysisResult(
            report_id=report.id,
            summary=analysis_dict.get("summary", "Daily report logged."),
            progress_score=analysis_dict.get("progress_score", 50),
            risk_level=analysis_dict.get("risk_level", "low"),
            ai_response=analysis_dict
        )
        db.add(analysis_res)

        # Save structured flags to database
        for warn in analysis_dict.get("warnings", []):
            flag = ReportFlag(
                report_id=report.id,
                flag_type=warn.get("flag_type", "other"),
                severity=warn.get("severity", "warning"),
                message=warn.get("message", "Validation flag raised.")
            )
            db.add(flag)

        # Update report status to show analysis finished
        report.status = "analyzed"
        db.commit()

        # Update actual hours logged on the task itself
        for it in items:
            task = db.query(ProjectTask).filter(ProjectTask.id == it.task_id).first()
            if task:
                # Add reported hours to task actual_hours
                task.actual_hours += int(it.hours_spent)
                # Update task status based on report items
                if it.completion_percent >= 100:
                    task.status = "completed"
                elif it.completion_percent > 0:
                    task.status = "in_progress"
                db.add(task)

        db.commit()
        return analysis_dict

    @staticmethod
    async def _call_openai(api_key: str, prompt: str) -> dict:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": "gpt-4o-mini",
                    "messages": [
                        {"role": "system", "content": "You are a software project auditor AI. Return valid JSON only."},
                        {"role": "user", "content": prompt}
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.2
                }
                response = await client.post("https://api.openai.com/v1/chat/completions", json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                return json.loads(content)
        except Exception as e:
            print(f"Error calling OpenAI in ReportAnalyzer: {e}. Falling back.")
            return None

    @staticmethod
    async def _call_deepseek(api_key: str, prompt: str) -> dict:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": "deepseek-chat",
                    "messages": [
                        {"role": "system", "content": "You are a software project auditor AI. Return valid JSON only."},
                        {"role": "user", "content": prompt}
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.2
                }
                response = await client.post("https://api.deepseek.com/v1/chat/completions", json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                return json.loads(content)
        except Exception as e:
            print(f"Error calling DeepSeek in ReportAnalyzer: {e}. Falling back.")
            return None

    @staticmethod
    def _run_local_analysis(report_data: dict) -> dict:
        """
        Deterministic fallback analysis checks for vague text, blocker keywords,
        and task completion mismatches.
        """
        work_done = report_data.get("work_done", "").strip()
        blockers = report_data.get("blockers", "").strip()
        items = report_data.get("items", [])

        warnings = []
        progress_score = 100
        risk_level = "low"

        # 1. Check Vague Report
        work_lower = work_done.lower()
        is_vague = False
        if len(work_done) < 15:
            is_vague = True
        elif any(phrase in work_lower for phrase in ["worked on project", "worked on tasks", "done some tasks", "completed work", "no work done"]):
            is_vague = True

        if is_vague:
            warnings.append({
                "flag_type": "vague_report",
                "severity": "warning",
                "message": "Report description is too short or generic. Please describe what code modules you updated."
            })
            progress_score -= 30

        # 2. Check Blocker Detected
        blocker_lower = blockers.lower()
        blocker_triggers = ["blocked", "waiting", "waiting for", "issue", "impediment", "delay", "blocker", "stuck", "api not ready"]
        if blockers and any(trig in blocker_lower for trig in blocker_triggers):
            warnings.append({
                "flag_type": "blocker_detected",
                "severity": "warning",
                "message": f"Blocker detected: '{blockers}'. Verify database schema dependencies or API roadblocks."
            })
            risk_level = "medium"
            if "api not ready" in blocker_lower or "db blocked" in blocker_lower or "critical" in blocker_lower:
                risk_level = "high"
                warnings.append({
                    "flag_type": "high_risk",
                    "severity": "critical",
                    "message": "Critical blocker detected. Project delivery might be compromised."
                })
            progress_score -= 20

        # 3. Check Task Completion Mismatch
        for it in items:
            comp_pct = it.get("completion_percent", 0)
            hours_spent = it.get("hours_spent", 0.0)
            est_hours = it.get("estimated_hours", 0)

            # E.g. marked 100% completed, but task estimation was > 10 hours and they spent less than 2 hours on it.
            if comp_pct >= 90 and est_hours >= 10 and hours_spent <= 2.0:
                warnings.append({
                    "flag_type": "completion_mismatch",
                    "severity": "warning",
                    "message": f"Task '{it.get('task_name')}' marked near-complete ({comp_pct}%) with only {hours_spent} hours logged against {est_hours} estimated hours."
                })
                progress_score -= 15
                if risk_level == "low":
                    risk_level = "medium"

        # Bounding progress score between 0 and 100
        progress_score = max(0, min(100, progress_score))

        # Generate summary
        if len(items) > 0:
            summary = f"Completed work on: {', '.join(it.get('task_name') for it in items[:2])}."
            if len(items) > 2:
                summary += f" Also touched {len(items) - 2} other task(s)."
        else:
            summary = work_done[:100] if work_done else "Logged administrative hours."

        return {
            "summary": summary,
            "progress_score": progress_score,
            "risk_level": risk_level,
            "warnings": warnings
        }
