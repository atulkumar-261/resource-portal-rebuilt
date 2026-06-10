import uuid
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel, Field

from backend.app.models.database import Department, Designation, Resource, AuditLog, User
from backend.app.core.config import get_db_session
from backend.app.core.security import require_admin_or_super_admin, require_current_user

router = APIRouter()


class DepartmentMetaRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None


class DesignationMetaRequest(BaseModel):
    title: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None


class OrgStatusUpdateRequest(BaseModel):
    is_active: bool


def _serialize_department(dept: Department) -> dict:
    return {
        "id": str(dept.id),
        "name": dept.name,
        "description": dept.description,
        "is_active": dept.is_active
    }


def _serialize_designation(desig: Designation) -> dict:
    return {
        "id": str(desig.id),
        "title": desig.title,
        "description": desig.description,
        "is_active": desig.is_active
    }


# ==============================================================================
# DEPARTMENTS ENDPOINTS
# ==============================================================================

@router.get("/departments")
def get_departments(include_inactive: bool = False, db: Session = Depends(get_db_session), current_user: User = Depends(require_current_user)):
    query = db.query(Department)
    if not include_inactive:
        query = query.filter(Department.is_active == True)
    return query.all()


@router.post("/departments", status_code=status.HTTP_201_CREATED)
def create_department(
    request: DepartmentMetaRequest,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_admin_or_super_admin)
):
    # Case-insensitive duplicate name check
    existing = db.query(Department).filter(
        func.lower(Department.name) == request.name.strip().lower()
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Department name already exists.")

    dept = Department(
        id=uuid.uuid4(),
        name=request.name.strip(),
        description=request.description,
        is_active=True
    )
    db.add(dept)
    db.flush()

    # Log audit trail
    db.add(
        AuditLog(
            module="org_structure",
            action="department_created",
            table_name="departments",
            record_id=dept.id,
            new_value=_serialize_department(dept),
            user_id=current_user.id
        )
    )
    db.commit()
    db.refresh(dept)
    return dept


@router.put("/departments/{dept_id}")
def update_department(
    dept_id: UUID,
    request: DepartmentMetaRequest,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_admin_or_super_admin)
):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found.")

    # Case-insensitive conflict check with other departments
    conflict = db.query(Department).filter(
        Department.id != dept_id,
        func.lower(Department.name) == request.name.strip().lower()
    ).first()
    if conflict:
        raise HTTPException(status_code=409, detail="Another department with this name already exists.")

    old_val = _serialize_department(dept)
    
    dept.name = request.name.strip()
    dept.description = request.description
    db.flush()

    new_val = _serialize_department(dept)

    # Log audit trail
    db.add(
        AuditLog(
            module="org_structure",
            action="department_updated",
            table_name="departments",
            record_id=dept.id,
            old_value=old_val,
            new_value=new_val,
            user_id=current_user.id
        )
    )
    db.commit()
    db.refresh(dept)
    return dept


@router.patch("/departments/{dept_id}/status")
def update_department_status(
    dept_id: UUID,
    request: OrgStatusUpdateRequest,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_admin_or_super_admin)
):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found.")

    if dept.is_active == request.is_active:
        return dept

    old_val = _serialize_department(dept)

    if not request.is_active:
        # Check 1: Verify no active (not soft-deleted) resources are assigned to it
        resource_count = db.query(Resource).filter(
            Resource.department_id == dept_id,
            Resource.is_deleted == False
        ).count()
        if resource_count > 0:
            raise HTTPException(
                status_code=400,
                detail="Department is assigned to active resources and cannot be deactivated."
            )

        # Check 2: Protect core records (cannot deactivate the last active department)
        active_count = db.query(Department).filter(Department.is_active == True).count()
        if active_count <= 1:
            raise HTTPException(
                status_code=400,
                detail="At least one active department must remain."
            )

        dept.is_active = False
        action = "department_deactivated"
    else:
        # Check 3: Prevent reactivation of duplicate names
        existing_active = db.query(Department).filter(
            Department.id != dept_id,
            Department.is_active == True,
            func.lower(Department.name) == dept.name.lower()
        ).first()
        if existing_active:
            raise HTTPException(
                status_code=400,
                detail="Department name already exists in an active record."
            )

        dept.is_active = True
        action = "department_activated"

    db.flush()
    new_val = _serialize_department(dept)

    # Log audit trail
    db.add(
        AuditLog(
            module="org_structure",
            action=action,
            table_name="departments",
            record_id=dept.id,
            old_value=old_val,
            new_value=new_val,
            user_id=current_user.id
        )
    )
    db.commit()
    db.refresh(dept)
    return dept


# ==============================================================================
# DESIGNATIONS ENDPOINTS
# ==============================================================================

@router.get("/designations")
def get_designations(include_inactive: bool = False, db: Session = Depends(get_db_session), current_user: User = Depends(require_current_user)):
    query = db.query(Designation)
    if not include_inactive:
        query = query.filter(Designation.is_active == True)
    return query.all()


@router.post("/designations", status_code=status.HTTP_201_CREATED)
def create_designation(
    request: DesignationMetaRequest,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_admin_or_super_admin)
):
    # Case-insensitive duplicate title check
    existing = db.query(Designation).filter(
        func.lower(Designation.title) == request.title.strip().lower()
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Designation title already exists.")

    desig = Designation(
        id=uuid.uuid4(),
        title=request.title.strip(),
        description=request.description,
        is_active=True
    )
    db.add(desig)
    db.flush()

    # Log audit trail
    db.add(
        AuditLog(
            module="org_structure",
            action="designation_created",
            table_name="designations",
            record_id=desig.id,
            new_value=_serialize_designation(desig),
            user_id=current_user.id
        )
    )
    db.commit()
    db.refresh(desig)
    return desig


@router.put("/designations/{desig_id}")
def update_designation(
    desig_id: UUID,
    request: DesignationMetaRequest,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_admin_or_super_admin)
):
    desig = db.query(Designation).filter(Designation.id == desig_id).first()
    if not desig:
        raise HTTPException(status_code=404, detail="Designation not found.")

    # Case-insensitive conflict check with other designations
    conflict = db.query(Designation).filter(
        Designation.id != desig_id,
        func.lower(Designation.title) == request.title.strip().lower()
    ).first()
    if conflict:
        raise HTTPException(status_code=409, detail="Another designation with this title already exists.")

    old_val = _serialize_designation(desig)

    desig.title = request.title.strip()
    desig.description = request.description
    db.flush()

    new_val = _serialize_designation(desig)

    # Log audit trail
    db.add(
        AuditLog(
            module="org_structure",
            action="designation_updated",
            table_name="designations",
            record_id=desig.id,
            old_value=old_val,
            new_value=new_val,
            user_id=current_user.id
        )
    )
    db.commit()
    db.refresh(desig)
    return desig


@router.patch("/designations/{desig_id}/status")
def update_designation_status(
    desig_id: UUID,
    request: OrgStatusUpdateRequest,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_admin_or_super_admin)
):
    desig = db.query(Designation).filter(Designation.id == desig_id).first()
    if not desig:
        raise HTTPException(status_code=404, detail="Designation not found.")

    if desig.is_active == request.is_active:
        return desig

    old_val = _serialize_designation(desig)

    if not request.is_active:
        # Check 1: Verify no active (not soft-deleted) resources are assigned to it
        resource_count = db.query(Resource).filter(
            Resource.designation_id == desig_id,
            Resource.is_deleted == False
        ).count()
        if resource_count > 0:
            raise HTTPException(
                status_code=400,
                detail="Designation is assigned to active resources and cannot be deactivated."
            )

        # Check 2: Protect core records (cannot deactivate the last active designation)
        active_count = db.query(Designation).filter(Designation.is_active == True).count()
        if active_count <= 1:
            raise HTTPException(
                status_code=400,
                detail="At least one active designation must remain."
            )

        desig.is_active = False
        action = "designation_deactivated"
    else:
        # Check 3: Prevent reactivation of duplicate titles
        existing_active = db.query(Designation).filter(
            Designation.id != desig_id,
            Designation.is_active == True,
            func.lower(Designation.title) == desig.title.lower()
        ).first()
        if existing_active:
            raise HTTPException(
                status_code=400,
                detail="Designation title already exists in an active record."
            )

        desig.is_active = True
        action = "designation_activated"

    db.flush()
    new_val = _serialize_designation(desig)

    # Log audit trail
    db.add(
        AuditLog(
            module="org_structure",
            action=action,
            table_name="designations",
            record_id=desig.id,
            old_value=old_val,
            new_value=new_val,
            user_id=current_user.id
        )
    )
    db.commit()
    db.refresh(desig)
    return desig
