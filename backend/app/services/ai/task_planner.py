import os
import json
import httpx
from datetime import date
from typing import List, Optional, Dict
from uuid import UUID
from backend.app.schemas.ai import TaskPlanResponse, TaskPlan, SubTaskPlan


class TaskPlanner:
    @staticmethod
    async def plan_tasks(
        project_name: str,
        requirements: List[Dict],
        deadline: Optional[date] = None
    ) -> TaskPlanResponse:
        openai_key = os.environ.get("OPENAI_API_KEY")
        deepseek_key = os.environ.get("DEEPSEEK_API_KEY")

        # Convert requirements to string representation for LLM prompt
        req_str = "\n".join([
            f"- {r['module_name']} (Estimated Hours: {r.get('estimated_hours', 'N/A')}, Priority: {r.get('priority', 'Medium')})"
            for r in requirements
        ])

        prompt = (
            f"Given the project '{project_name}' and its module requirements:\n"
            f"{req_str}\n"
            f"Project deadline: {deadline if deadline else 'Not specified'}.\n\n"
            "Please break down each module requirement into detailed tasks and subtasks.\n"
            "Generate logical dependencies between these tasks. For example, database setups must happen before API controller writing.\n"
            "Return a strictly valid JSON document containing a list of tasks. Do not include markdown wraps (e.g. no ```json), no explanations.\n\n"
            "JSON structure must match:\n"
            "{\n"
            "  \"tasks\": [\n"
            "    {\n"
            "      \"temp_id\": \"T1\",\n"
            "      \"task_name\": \"Setup DB Schema\",\n"
            "      \"description\": \"Write SQLAlchemy schemas and migrations\",\n"
            "      \"estimated_hours\": 20,\n"
            "      \"priority\": \"High\",\n"
            "      \"depends_on\": [],\n"
            "      \"subtasks\": [\n"
            "        { \"task_name\": \"Define User and Session models\", \"description\": \"Setup user tables\", \"estimated_hours\": 10, \"priority\": \"High\" },\n"
            "        { \"task_name\": \"Define Project models\", \"description\": \"Setup projects tables\", \"estimated_hours\": 10, \"priority\": \"High\" }\n"
            "      ]\n"
            "    },\n"
            "    {\n"
            "      \"temp_id\": \"T2\",\n"
            "      \"task_name\": \"Implement API controllers\",\n"
            "      \"description\": \"Write FastAPI endpoints\",\n"
            "      \"estimated_hours\": 30,\n"
            "      \"priority\": \"High\",\n"
            "      \"depends_on\": [\"T1\"],\n"
            "      \"subtasks\": []\n"
            "    }\n"
            "  ]\n"
            "}"
        )

        if openai_key:
            return await TaskPlanner._call_openai(openai_key, prompt)
        elif deepseek_key:
            return await TaskPlanner._call_deepseek(deepseek_key, prompt)
        else:
            return TaskPlanner._run_mock_planning(project_name, requirements)

    @staticmethod
    async def _call_openai(api_key: str, prompt: str) -> TaskPlanResponse:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": "gpt-4o-mini",
                    "messages": [
                        {"role": "system", "content": "You are a software planner AI. Return valid JSON only matching the schema requested."},
                        {"role": "user", "content": prompt}
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.2
                }
                response = await client.post("https://api.openai.com/v1/chat/completions", json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                parsed = json.loads(content)
                return TaskPlanResponse(**parsed)
        except Exception as e:
            print(f"Error calling OpenAI API for tasks: {e}. Falling back to mock planner.")
            return TaskPlanner._run_mock_planning("Failed LLM", [])

    @staticmethod
    async def _call_deepseek(api_key: str, prompt: str) -> TaskPlanResponse:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": "deepseek-chat",
                    "messages": [
                        {"role": "system", "content": "You are a software planner AI. Return valid JSON only matching the schema requested."},
                        {"role": "user", "content": prompt}
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.2
                }
                response = await client.post("https://api.deepseek.com/v1/chat/completions", json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                parsed = json.loads(content)
                return TaskPlanResponse(**parsed)
        except Exception as e:
            print(f"Error calling DeepSeek API for tasks: {e}. Falling back to mock planner.")
            return TaskPlanner._run_mock_planning("Failed LLM", [])

    @staticmethod
    def _run_mock_planning(project_name: str, requirements: List[Dict]) -> TaskPlanResponse:
        tasks = []
        counter = 1

        # We need a way to build dependencies between modules. For example:
        # Backend setup should complete before Frontend dashboard integration.
        # Let's map temp_ids. Let's record the db setup task id.
        db_setup_id = None
        api_setup_id = None
        ui_layout_id = None

        for req in requirements:
            m_name = req["module_name"].lower()
            m_hours = req.get("estimated_hours", 100)
            
            if "backend" in m_name:
                db_setup_id = f"T{counter}"
                tasks.append(TaskPlan(
                    temp_id=db_setup_id,
                    task_name="Backend Database Schema and Migration setup",
                    description="Define core SQLAlchemy ORM database models, write alembic migrations, and setup seed files.",
                    estimated_hours=max(10, int(m_hours * 0.25)),
                    priority="High",
                    depends_on=[],
                    subtasks=[
                        SubTaskPlan(task_name="Define SQLAlchemy models", description="Setup tables and fields", estimated_hours=max(5, int(m_hours * 0.12)), priority="High"),
                        SubTaskPlan(task_name="Configure Migration scripts", description="Prepare DDL migration updates", estimated_hours=max(5, int(m_hours * 0.13)), priority="High")
                    ]
                ))
                counter += 1

                api_setup_id = f"T{counter}"
                tasks.append(TaskPlan(
                    temp_id=api_setup_id,
                    task_name="Develop FastAPI REST controllers and auth logic",
                    description="Implement FastAPI router endpoints, write request/response validation schemas, and integrate security JWT handlers.",
                    estimated_hours=max(15, int(m_hours * 0.75)),
                    priority="High",
                    depends_on=[db_setup_id],
                    subtasks=[
                        SubTaskPlan(task_name="Create APIRouters", description="Register endpoint controllers", estimated_hours=max(5, int(m_hours * 0.35)), priority="High"),
                        SubTaskPlan(task_name="Write validation schemas", description="Define Pydantic input models", estimated_hours=max(5, int(m_hours * 0.20)), priority="Medium"),
                        SubTaskPlan(task_name="Add JWT Authentication middleware", description="Ensure safe api routes", estimated_hours=max(5, int(m_hours * 0.20)), priority="High")
                    ]
                ))
                counter += 1

            elif "frontend" in m_name:
                ui_layout_id = f"T{counter}"
                tasks.append(TaskPlan(
                    temp_id=ui_layout_id,
                    task_name="Frontend UI Theme, Layout, and Router config",
                    description="Initialize Tailwind CSS configurations, setup global app shells, and wire TanStack Router paths.",
                    estimated_hours=max(10, int(m_hours * 0.30)),
                    priority="High",
                    depends_on=[],
                    subtasks=[
                        SubTaskPlan(task_name="Install layout components", description="Create Shells and menus", estimated_hours=max(5, int(m_hours * 0.15)), priority="High"),
                        SubTaskPlan(task_name="Write TanStack Router mappings", description="Configure frontend route tables", estimated_hours=max(5, int(m_hours * 0.15)), priority="Medium")
                    ]
                ))
                counter += 1

                dashboard_task_id = f"T{counter}"
                # If backend API setup was done, we depend on it
                deps = [api_setup_id] if api_setup_id else []
                if ui_layout_id:
                    deps.append(ui_layout_id)

                tasks.append(TaskPlan(
                    temp_id=dashboard_task_id,
                    task_name="Develop Interactive Dashboard screens & CRUD Forms",
                    description="Implement dashboard data visualization grids, detail cards, and modal input forms using React 19.",
                    estimated_hours=max(20, int(m_hours * 0.70)),
                    priority="High",
                    depends_on=deps,
                    subtasks=[
                        SubTaskPlan(task_name="Implement State Store", description="Configure Zustand state and actions", estimated_hours=max(5, int(m_hours * 0.20)), priority="Medium"),
                        SubTaskPlan(task_name="Develop Forms and Inputs", description="Validate inputs before sending requests", estimated_hours=max(10, int(m_hours * 0.30)), priority="High"),
                        SubTaskPlan(task_name="Connect to backend API", description="Fetch endpoints asynchronously", estimated_hours=max(5, int(m_hours * 0.20)), priority="High")
                    ]
                ))
                counter += 1

            elif "ai" in m_name or "analytics" in m_name:
                ai_core_id = f"T{counter}"
                deps = [api_setup_id] if api_setup_id else []
                tasks.append(TaskPlan(
                    temp_id=ai_core_id,
                    task_name="AI Planning Engine and prompt template configuration",
                    description="Configure LLM client integrations, compose granular orchestration prompt structures, and establish cache databases.",
                    estimated_hours=max(15, int(m_hours * 0.60)),
                    priority="Medium",
                    depends_on=deps,
                    subtasks=[
                        SubTaskPlan(task_name="Build prompt wrapper", description="Establish system instructions", estimated_hours=max(5, int(m_hours * 0.30)), priority="Medium"),
                        SubTaskPlan(task_name="Setup local fallback planner", description="Deterministic code fallback", estimated_hours=max(10, int(m_hours * 0.30)), priority="High")
                    ]
                ))
                counter += 1

                ai_api_id = f"T{counter}"
                tasks.append(TaskPlan(
                    temp_id=ai_api_id,
                    task_name="Integrate recommendation endpoints and matching scoring",
                    description="Establish FastAPI routers for AI models, configure matcher heuristics, and verify json responses.",
                    estimated_hours=max(10, int(m_hours * 0.40)),
                    priority="Medium",
                    depends_on=[ai_core_id],
                    subtasks=[]
                ))
                counter += 1

            elif "testing" in m_name or "qa" in m_name:
                test_task_id = f"T{counter}"
                # QA depends on core developers finishing backend and frontend tasks
                deps = []
                if api_setup_id:
                    deps.append(api_setup_id)
                if ui_layout_id:
                    deps.append(ui_layout_id)

                tasks.append(TaskPlan(
                    temp_id=test_task_id,
                    task_name="Write Unit and Integration test scripts",
                    description="Setup PyTest assertion suites, write mock database tests, and implement Playwright frontend checks.",
                    estimated_hours=m_hours,
                    priority="Medium",
                    depends_on=deps,
                    subtasks=[
                        SubTaskPlan(task_name="Prepare backend pytest scripts", description="Validate API status codes and responses", estimated_hours=max(5, int(m_hours * 0.50)), priority="Medium"),
                        SubTaskPlan(task_name="Implement frontend unit tests", description="Verify React component mounting", estimated_hours=max(5, int(m_hours * 0.50)), priority="Low")
                    ]
                ))
                counter += 1

            else:
                # Fallback task mapping for generic modules
                generic_task_id = f"T{counter}"
                tasks.append(TaskPlan(
                    temp_id=generic_task_id,
                    task_name=f"Develop and deploy module: {req['module_name']}",
                    description=req.get("description", "Standard implementation tasks."),
                    estimated_hours=m_hours,
                    priority=req.get("priority", "Medium"),
                    depends_on=[],
                    subtasks=[]
                ))
                counter += 1

        return TaskPlanResponse(tasks=tasks)
