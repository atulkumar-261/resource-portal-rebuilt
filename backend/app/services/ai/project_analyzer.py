import os
import json
import httpx
from datetime import date
from typing import Dict, Any, List
from backend.app.schemas.ai import ProjectAnalysisResponse, ModuleAnalysisSchema, ModuleSkillRequirement


class ProjectAnalyzer:
    @staticmethod
    async def analyze(project_name: str, description: str, deadline: date = None) -> ProjectAnalysisResponse:
        # Check for API keys
        openai_key = os.environ.get("OPENAI_API_KEY")
        deepseek_key = os.environ.get("DEEPSEEK_API_KEY")
        
        prompt = (
            f"Analyze the software project with Name: '{project_name}' and Description: '{description}'.\n"
            f"Expected Deadline: {deadline if deadline else 'Not specified'}.\n\n"
            "Return a strictly valid JSON document containing a structured breakdown of project modules, "
            "required skills, effort in estimated hours, and a suggested timeline summary.\n"
            "Return JSON only, with no markdown tags (e.g. do not wrap in ```json), no comments, and no explanation.\n\n"
            "JSON structure must match:\n"
            "{\n"
            "  \"modules\": [\n"
            "    {\n"
            "      \"module_name\": \"Frontend\",\n"
            "      \"description\": \"Frontend UI implementation\",\n"
            "      \"estimated_hours\": 120,\n"
            "      \"priority\": \"High\",\n"
            "      \"skills\": [\n"
            "        { \"skill_name\": \"React\", \"required_level\": \"Senior\", \"mandatory\": true },\n"
            "        { \"skill_name\": \"TypeScript\", \"required_level\": \"Intermediate\", \"mandatory\": true }\n"
            "      ]\n"
            "    }\n"
            "  ],\n"
            "  \"timeline\": \"Suggested weekly timeline description...\"\n"
            "}"
        )

        if openai_key:
            return await ProjectAnalyzer._call_openai(openai_key, prompt)
        elif deepseek_key:
            return await ProjectAnalyzer._call_deepseek(deepseek_key, prompt)
        else:
            return ProjectAnalyzer._run_mock_analysis(project_name, description, deadline)

    @staticmethod
    async def _call_openai(api_key: str, prompt: str) -> ProjectAnalysisResponse:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": "gpt-4o-mini",
                    "messages": [
                        {"role": "system", "content": "You are a software architect AI. Return valid JSON only."},
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
                return ProjectAnalysisResponse(**parsed)
        except Exception as e:
            # Log error and fallback to mock
            print(f"Error calling OpenAI API: {e}. Falling back to mock analysis.")
            return ProjectAnalyzer._run_mock_analysis("Failed OpenAI - " + prompt[:20], "Fallback mock logic triggered due to api error.", None)

    @staticmethod
    async def _call_deepseek(api_key: str, prompt: str) -> ProjectAnalysisResponse:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": "deepseek-chat",
                    "messages": [
                        {"role": "system", "content": "You are a software architect AI. Return valid JSON only."},
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
                return ProjectAnalysisResponse(**parsed)
        except Exception as e:
            print(f"Error calling DeepSeek API: {e}. Falling back to mock analysis.")
            return ProjectAnalyzer._run_mock_analysis("Failed DeepSeek - " + prompt[:20], "Fallback mock logic triggered due to api error.", None)

    @staticmethod
    def _run_mock_analysis(project_name: str, description: str, deadline: date = None) -> ProjectAnalysisResponse:
        desc_lower = description.lower() + " " + project_name.lower()
        
        # Build deterministic modules based on keywords in description
        modules = []
        
        # Frontend module is almost always required
        modules.append(
            ModuleAnalysisSchema(
                module_name="Frontend",
                description="User interface screens, dashboards, forms and navigation using React components.",
                estimated_hours=80 if "simple" in desc_lower else 140,
                priority="High",
                skills=[
                    ModuleSkillRequirement(skill_name="React", required_level="Senior", mandatory=True),
                    ModuleSkillRequirement(skill_name="TypeScript", required_level="Intermediate", mandatory=True),
                    ModuleSkillRequirement(skill_name="Tailwind", required_level="Intermediate", mandatory=False)
                ]
            )
        )
        
        # Backend / API Database management
        modules.append(
            ModuleAnalysisSchema(
                module_name="Backend",
                description="FastAPI service endpoints, database migrations, security middleware, and ORM schemas.",
                estimated_hours=95 if "simple" in desc_lower else 160,
                priority="High",
                skills=[
                    ModuleSkillRequirement(skill_name="Python", required_level="Senior", mandatory=True),
                    ModuleSkillRequirement(skill_name="FastAPI", required_level="Intermediate", mandatory=True),
                    ModuleSkillRequirement(skill_name="PostgreSQL", required_level="Intermediate", mandatory=True)
                ]
            )
        )

        # Optional: AI / Machine Learning Module
        if any(x in desc_lower for x in ["ai", "machine learning", "deep learning", "nlp", "llm", "predict", "analytics"]):
            modules.append(
                ModuleAnalysisSchema(
                    module_name="AI & Analytics",
                    description="Statistical modeling, recommendation match engines, predictive analysis, and LLM orchestration prompts.",
                    estimated_hours=120,
                    priority="Medium",
                    skills=[
                        ModuleSkillRequirement(skill_name="Python", required_level="Senior", mandatory=True),
                        ModuleSkillRequirement(skill_name="Machine Learning", required_level="Senior", mandatory=True),
                        ModuleSkillRequirement(skill_name="SQL", required_level="Intermediate", mandatory=False)
                    ]
                )
            )

        # Testing & QA
        modules.append(
            ModuleAnalysisSchema(
                module_name="Testing & QA",
                description="Unit testing integration, mock database testing, endpoint assertions, and coverage validation.",
                estimated_hours=40,
                priority="Medium",
                skills=[
                    ModuleSkillRequirement(skill_name="Python", required_level="Intermediate", mandatory=True),
                    ModuleSkillRequirement(skill_name="Jest", required_level="Intermediate", mandatory=False)
                ]
            )
        )

        timeline_desc = (
            "Week 1: Requirement gathering and setup.\n"
            "Week 2-4: Core Backend database structures and FastAPI routing implementation.\n"
            "Week 3-6: Frontend React forms, state, and dashboard views integration.\n"
            "Week 7: Automated unit testing and QA checks.\n"
            "Week 8: final deployment setup and handover."
        )

        return ProjectAnalysisResponse(modules=modules, timeline=timeline_desc)
