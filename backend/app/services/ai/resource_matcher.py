from typing import List, Dict, Any, Set
from uuid import UUID
from datetime import date
from sqlalchemy.orm import Session
from backend.app.models.database import Resource, Project, ProjectRequirement, ProjectAssignment, ResourceStatus, SkillMaster, User
from backend.app.schemas.ai import ResourceMatchDetail, ModuleRecommendationGroup

# Related skill mappings for Score 75 (Related Matches)
RELATED_SKILLS_MAP: Dict[str, List[str]] = {
    "react": ["next.js", "vue", "angular", "svelte", "javascript", "frontend"],
    "next.js": ["react", "javascript", "frontend"],
    "typescript": ["javascript", "es6"],
    "javascript": ["typescript", "es6"],
    "fastapi": ["python", "django", "flask", "backend"],
    "django": ["python", "fastapi", "flask", "backend"],
    "flask": ["python", "fastapi", "django", "backend"],
    "python": ["fastapi", "django", "flask", "machine learning", "backend"],
    "postgresql": ["sql", "mysql", "sqlite", "oracle", "mongodb", "database"],
    "mysql": ["sql", "postgresql", "sqlite", "database"],
    "mongodb": ["sql", "postgresql", "nosql", "database"],
    "tailwind": ["css", "html", "sass", "bootstrap", "frontend"],
    "css": ["tailwind", "sass", "bootstrap", "frontend"],
    "machine learning": ["python", "tensorflow", "pytorch", "data science", "ai"],
    "tensorflow": ["python", "pytorch", "machine learning", "ai"],
    "pytorch": ["python", "tensorflow", "machine learning", "ai"]
}

# Transferable skill mappings for Score 60 (Transferable Matches)
TRANSFERABLE_SKILLS_MAP: Dict[str, List[str]] = {
    "react native": ["react", "javascript"],
    "react": ["html", "css", "javascript"],
    "tailwind": ["html", "css"],
    "machine learning": ["python", "sql"]
}


class ResourceMatcher:
    @staticmethod
    def calculate_resource_capacity(db: Session, resource_id: UUID) -> Dict[str, Any]:
        """
        Dynamically calculates assigned hours, availability, and utilization for a resource.
        Assigned hours per week = Sum of (Requirement Estimated Hours / Project Duration in Weeks)
        """
        # Fetch all active assignments for this resource
        assignments = db.query(ProjectAssignment).filter(ProjectAssignment.resource_id == resource_id).all()
        
        assigned_hours = 0.0
        project_names = []

        for assign in assignments:
            # Get requirement and project details
            req = db.query(ProjectRequirement).filter(ProjectRequirement.id == assign.requirement_id).first()
            proj = db.query(Project).filter(Project.id == assign.project_id, Project.is_deleted == False).first()
            
            if req and proj:
                # Calculate duration in weeks
                duration_weeks = 4.0  # Default fallback
                if proj.start_date:
                    end_date = proj.end_date if proj.end_date else date.today()
                    delta = (end_date - proj.start_date).days
                    if delta > 7:
                        duration_weeks = max(1.0, float(delta / 7.0))
                
                # Estimate weekly load
                est_hours = float(req.estimated_hours or 0.0)
                weekly_load = est_hours / duration_weeks
                assigned_hours += weekly_load
                
                if proj.name not in project_names:
                    project_names.append(proj.name)

        # Retrieve resource limits
        resource = db.query(Resource).filter(Resource.id == resource_id, Resource.is_deleted == False).first()
        weekly_allowed = float(resource.weekly_allowed_hours) if resource else 35.0
        
        availability = max(0.0, weekly_allowed - assigned_hours)
        utilization = (assigned_hours / weekly_allowed) * 100.0 if weekly_allowed > 0 else 0.0

        return {
            "assigned_hours": round(assigned_hours, 1),
            "weekly_allowed_hours": weekly_allowed,
            "availability": round(availability, 1),
            "utilization": round(utilization, 1),
            "current_projects": project_names
        }

    @staticmethod
    def _is_resource_eligible(db: Session, resource: Resource) -> Dict[str, Any]:
        """
        Checks AI assignment eligibility for a resource.
        Returns: {"eligible": bool, "status": str, "reason": str}
        
        Eligible: completion >= 80%, approved, active user, not deleted, utilization < 100%.
        Conditional: completion 40%-79%. Show as warning candidate.
        Blocked: completion < 40%, inactive user, deleted, not approved, or utilization >= 100%.
        """
        # 1. Must not be soft-deleted
        if resource.is_deleted:
            return {"eligible": False, "status": "blocked", "reason": "Resource is deleted"}
        
        # 2. Must have an active linked User account
        linked_user = db.query(User).filter(User.resource_id == resource.id).first()
        if not linked_user or not linked_user.is_active:
            return {"eligible": False, "status": "blocked", "reason": "User account inactive or missing"}
        
        # 3. Must be approved
        if resource.approval_status != "approved":
            return {"eligible": False, "status": "blocked", "reason": "Pending approval"}
        
        # 4. Onboarding completion check
        completion = resource.profile_completion_percentage or 0
        if completion < 40:
            return {"eligible": False, "status": "blocked", "reason": f"Profile completion too low ({completion}%)"}
        
        if completion < 80:
            return {"eligible": False, "status": "conditional", "reason": f"Profile incomplete ({completion}%) — conditional candidate"}
        
        # 5. Onboarding status must be completed
        if resource.onboarding_status != "completed":
            return {"eligible": False, "status": "conditional", "reason": "Onboarding not completed"}
        
        return {"eligible": True, "status": "eligible", "reason": "Fully eligible"}

    @staticmethod
    def match_resources_for_module(
        db: Session,
        requirement: ProjectRequirement,
        required_skill_ids: List[UUID]
    ) -> ModuleRecommendationGroup:
        """
        Matches all active resources against required skills for a given module/requirement.
        """
        # Fetch required SkillMaster records
        required_skills = db.query(SkillMaster).filter(SkillMaster.id.in_(required_skill_ids)).all()
        required_names = [s.name.lower().strip() for s in required_skills]
        
        # Fetch all active resources
        active_status = db.query(ResourceStatus).filter(ResourceStatus.name == "active").first()
        active_status_id = active_status.id if active_status else None
        
        resources = db.query(Resource).filter(
            Resource.is_deleted == False,
            Resource.status_id == active_status_id if active_status_id else True
        ).all()

        exact_matches = []
        related_matches = []
        transferable_matches = []
        upskill_candidates = []

        for r in resources:
            # ── Eligibility gate ──
            eligibility = ResourceMatcher._is_resource_eligible(db, r)
            if eligibility["status"] == "blocked":
                continue  # Completely excluded from AI matching

            r_skills = [s.name.lower().strip() for s in r.skills]
            
            # If no skills are required, everyone is a 100% match
            if not required_names:
                match_score = 100
                matched = []
                missing = []
            else:
                matched = []
                missing = []
                
                # Check match type per required skill
                has_exact = True
                has_related = True
                has_transferable = True
                
                for req in required_names:
                    if req in r_skills:
                        matched.append(req.title())
                    else:
                        missing.append(req.title())
                        has_exact = False
                        
                        # Check if any related skill is possessed
                        related_possibilities = RELATED_SKILLS_MAP.get(req, [])
                        if not any(rel in r_skills for rel in related_possibilities):
                            has_related = False
                            
                        # Check transferable skill
                        transferable_possibilities = TRANSFERABLE_SKILLS_MAP.get(req, [])
                        if not any(tr in r_skills for tr in transferable_possibilities):
                            has_transferable = False

                if has_exact:
                    match_score = 100
                elif has_related:
                    match_score = 75
                elif has_transferable:
                    match_score = 60
                else:
                    # Score based on how many skills they matched (partial scoring)
                    match_pct = len(matched) / len(required_names)
                    match_score = int(match_pct * 50)  # Upskill range < 50

            # Calculate dynamic utilization
            capacity = ResourceMatcher.calculate_resource_capacity(db, r.id)

            # Skip over-utilized resources (>= 100%)
            if capacity["utilization"] >= 100.0:
                continue
            
            detail = ResourceMatchDetail(
                id=r.id,
                fullName=r.full_name,
                jobTitle=r.designation.title if r.designation else "Employee",
                avatarUrl=r.avatar_url,
                matchScore=match_score,
                matchedSkills=matched,
                missingSkills=missing,
                currentProjects=capacity["current_projects"],
                assignedHours=capacity["assigned_hours"],
                weeklyAllowedHours=capacity["weekly_allowed_hours"],
                utilization=capacity["utilization"],
                availability=capacity["availability"]
            )

            # Categorize match
            if match_score == 100:
                exact_matches.append(detail)
            elif match_score == 75:
                related_matches.append(detail)
            elif match_score == 60:
                transferable_matches.append(detail)
            elif match_score > 0 or not required_names:
                upskill_candidates.append(detail)

        # Sort matches by score descending, then by availability descending
        sort_key = lambda x: (-x.matchScore, -x.availability)
        exact_matches.sort(key=sort_key)
        related_matches.sort(key=sort_key)
        transferable_matches.sort(key=sort_key)
        upskill_candidates.sort(key=sort_key)

        return ModuleRecommendationGroup(
            module_id=requirement.id,
            module_name=requirement.module_name,
            required_skills=[s.name for s in required_skills],
            exact_matches=exact_matches,
            related_matches=related_matches,
            transferable_matches=transferable_matches,
            upskill_candidates=upskill_candidates
        )
