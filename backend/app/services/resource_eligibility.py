from fastapi import HTTPException, status

def is_resource_assignable(resource) -> bool:
    if not resource:
        return False

    if resource.is_deleted:
        return False

    if not resource.status:
        return False

    if resource.status.name != "active":
        return False

    if resource.approval_status != "approved":
        return False

    if resource.onboarding_status != "completed":
        return False

    if resource.profile_completion_percentage < 80:
        return False

    if not resource.user:
        return False

    users = resource.user if isinstance(resource.user, list) else [resource.user]
    if not any(u and u.is_active for u in users):
        return False

    if not resource.has_required_documents:
        return False

    return True


def validate_resource_assignable(resource):
    if not is_resource_assignable(resource):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resource is not eligible for assignment."
        )
