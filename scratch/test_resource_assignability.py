import sys
import os

# Adjust import path to include backend/app
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.services.resource_eligibility import is_resource_assignable, validate_resource_assignable
from fastapi import HTTPException

class MockStatus:
    def __init__(self, name):
        self.name = name

class MockUser:
    def __init__(self, is_active):
        self.is_active = is_active

class MockResource:
    def __init__(
        self,
        is_deleted=False,
        status_name="active",
        approval_status="approved",
        onboarding_status="completed",
        profile_completion_percentage=85,
        user_is_active=True,
        has_required_documents=True
    ):
        self.is_deleted = is_deleted
        self.status = MockStatus(status_name) if status_name else None
        self.approval_status = approval_status
        self.onboarding_status = onboarding_status
        self.profile_completion_percentage = profile_completion_percentage
        self.user = MockUser(user_is_active) if user_is_active is not None else None
        self.has_required_documents = has_required_documents

def test_assignability():
    print("Running Resource Assignability Tests...")

    # Case 1: All conditions met
    r = MockResource()
    assert is_resource_assignable(r) is True
    try:
        validate_resource_assignable(r)
        print("[OK] Case 1 passed: Valid active resource is assignable")
    except HTTPException:
        assert False, "Should not raise HTTPException for valid active resource"

    # Case 2: Resource is deleted
    r = MockResource(is_deleted=True)
    assert is_resource_assignable(r) is False
    print("[OK] Case 2 passed: Deleted resource is not assignable")

    # Case 3: Status is not active
    r = MockResource(status_name="pending")
    assert is_resource_assignable(r) is False
    print("[OK] Case 3 passed: Pending status is not assignable")

    # Case 4: Approval status is not approved
    r = MockResource(approval_status="pending")
    assert is_resource_assignable(r) is False
    print("[OK] Case 4 passed: Unapproved resource is not assignable")

    # Case 5: Onboarding status is not completed
    r = MockResource(onboarding_status="pending")
    assert is_resource_assignable(r) is False
    print("[OK] Case 5 passed: Incomplete onboarding is not assignable")

    # Case 6: Profile completion < 80%
    r = MockResource(profile_completion_percentage=75)
    assert is_resource_assignable(r) is False
    print("[OK] Case 6 passed: Completion percentage < 80 is not assignable")

    # Case 7: Linked user is inactive
    r = MockResource(user_is_active=False)
    assert is_resource_assignable(r) is False
    print("[OK] Case 7 passed: Inactive linked user is not assignable")

    # Case 8: Missing required documents
    r = MockResource(has_required_documents=False)
    assert is_resource_assignable(r) is False
    print("[OK] Case 8 passed: Missing documents makes resource unassignable")

    # Case 9: Raising HTTPException for invalid resource
    r = MockResource(is_deleted=True)
    try:
        validate_resource_assignable(r)
        assert False, "Should have raised HTTPException"
    except HTTPException as e:
        assert e.status_code == 400
        assert e.detail == "Resource is not eligible for assignment."
        print("[OK] Case 9 passed: validate_resource_assignable raises HTTPException with status code 400")

    print("\nAll unit tests passed successfully!")

if __name__ == "__main__":
    test_assignability()
