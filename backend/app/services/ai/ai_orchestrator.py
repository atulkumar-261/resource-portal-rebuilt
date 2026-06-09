import json
from typing import List
from uuid import UUID
from datetime import date
from sqlalchemy.orm import Session
from backend.app.models.database import Project, ProjectRequirement, ProjectSkillRequirement, SkillMaster, AIAnalysisResult
from backend.app.schemas.ai import ProjectAnalysisResponse, ModuleRecommendationGroup
from backend.app.services.ai.project_analyzer import ProjectAnalyzer
from backend.app.services.ai.resource_matcher import ResourceMatcher


class AIOrchestrator:
    @staticmethod
    async def analyze_and_populate_project(
        db: Session,
        project_id: UUID,
        project_name: str,
        description: str,
        deadline: date = None
    ) -> ProjectAnalysisResponse:
        """
        Orchestrates check cache -> analyze -> validate -> save requirements/skills.
        """
        # 1. Check if cache exists in database
        cached = db.query(AIAnalysisResult).filter(AIAnalysisResult.project_id == project_id).first()
        if cached:
            try:
                # Parse and return cached response
                return ProjectAnalysisResponse(**cached.response)
            except Exception as e:
                # If cached parsing fails, delete stale cache and continue
                print(f"Stale cache format for project {project_id}: {e}. Re-analyzing.")
                db.delete(cached)
                db.commit()

        # 2. Call analyzer (delegates to OpenAI / DeepSeek or local Mock fallback)
        prompt = f"Project: {project_name}. Description: {description}. Deadline: {deadline}."
        analysis_result = await ProjectAnalyzer.analyze(project_name, description, deadline)

        # 3. Store in cache table
        # Convert response model to dict/JSON serializable structure
        cached_result = AIAnalysisResult(
            project_id=project_id,
            prompt=prompt,
            response=analysis_result.model_dump(),
            model_name="OpenAI/DeepSeek/Mock"
        )
        db.add(cached_result)
        db.commit()

        # 4. Save to project_requirements & project_skill_requirements tables
        for mod in analysis_result.modules:
            # Create ProjectRequirement
            db_req = ProjectRequirement(
                project_id=project_id,
                module_name=mod.module_name,
                description=mod.description,
                estimated_hours=mod.estimated_hours,
                priority=mod.priority,
                status="pending"
            )
            db.add(db_req)
            db.flush()  # Populates db_req.id

            # Create skill requirements
            for skill_req in mod.skills:
                skill_name_clean = skill_req.skill_name.strip()
                
                # Check if skill exists in skills_master (case-insensitive search)
                db_skill = db.query(SkillMaster).filter(
                    SkillMaster.name.ilike(skill_name_clean)
                ).first()

                if not db_skill:
                    # Dynamically onboard skill to prevent foreign key failure
                    db_skill = SkillMaster(
                        name=skill_name_clean,
                        category="AI Onboarded"
                    )
                    db.add(db_skill)
                    db.flush()

                # Add project skill requirement mapping
                db_skill_req = ProjectSkillRequirement(
                    requirement_id=db_req.id,
                    skill_id=db_skill.id,
                    required_level=skill_req.required_level,
                    mandatory=skill_req.mandatory
                )
                db.add(db_skill_req)

        db.commit()
        return analysis_result

    @staticmethod
    def get_project_recommendations(db: Session, project_id: UUID) -> List[ModuleRecommendationGroup]:
        """
        Retrieves matching recommendations for all modules of a project.
        """
        requirements = db.query(ProjectRequirement).filter(
            ProjectRequirement.project_id == project_id
        ).all()

        recommendations = []
        for req in requirements:
            # Fetch skill requirements mapping for this module
            skill_mappings = db.query(ProjectSkillRequirement).filter(
                ProjectSkillRequirement.requirement_id == req.id
            ).all()

            skill_ids = [m.skill_id for m in skill_mappings]
            
            # Fetch recommendations using matcher logic
            rec_group = ResourceMatcher.match_resources_for_module(db, req, skill_ids)
            recommendations.append(rec_group)

        return recommendations
