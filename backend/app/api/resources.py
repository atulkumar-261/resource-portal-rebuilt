from typing import List, Optional
from uuid import UUID
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from pydantic import BaseModel, Field, field_validator

from backend.app.models.database import (
    Resource,
    ResourceAddress,
    ResourceBankDetails,
    ResourceEmergencyContact,
    ResourceDocument,
    Department,
    Designation,
    User,
    Role,
    ResourceStatus,
    TaskScheduleEntry,
    Country,
    City
)
from backend.app.core.config import get_db_session
from backend.app.core.security import require_privileged_user, require_current_user, hash_password
from backend.app.api.admin_users import _generate_password
from backend.app.services.progress_service import ProgressService

router = APIRouter(prefix="/resources", tags=["Resources"])

from backend.app.services.audit_service import AuditService


def _audit(
    db: Session,
    actor_id: Optional[UUID],
    record_id: UUID,
    action: str,
    table_name: str,
    old_value: Optional[dict] = None,
    new_value: Optional[dict] = None,
    changed_fields: Optional[dict] = None,
):
    AuditService.record(
        db=db,
        actor_id=actor_id,
        module="user_management",
        action=action,
        table_name=table_name,
        record_id=record_id,
        old_value=old_value,
        new_value=new_value,
        changed_fields=changed_fields
    )


class ResourceCreateRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=150)
    email: str = Field(..., max_length=255)
    department_id: UUID
    designation_id: UUID
    skills: Optional[str] = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        if not value or "@" not in value or "." not in value.split("@")[-1]:
            raise ValueError("Enter a valid email address.")
        return value.lower()


class ResourceStatusUpdateRequest(BaseModel):
    is_active: bool


class ResourceUpdateRequest(BaseModel):
    skillset: Optional[str] = None
    status: Optional[str] = None
    weekly_allowed_hours: Optional[int] = None
    performance_notes: Optional[str] = None
    current_address: Optional[str] = None
    city_id: Optional[UUID] = None
    citizen_of_id: Optional[UUID] = None
    avatar_url: Optional[str] = None
    nationality: Optional[str] = None


class SelfProfileUpdateRequest(BaseModel):
    """Fields a resource can update on their own profile."""
    phone: Optional[str] = None
    dob: Optional[str] = None  # ISO format YYYY-MM-DD
    ni_number: Optional[str] = None
    nationality: Optional[str] = None
    passport_number: Optional[str] = None
    passport_expiry: Optional[str] = None
    visa_number: Optional[str] = None
    visa_expiry: Optional[str] = None
    skillset: Optional[str] = None
    other_info: Optional[str] = None
    # Address sub-object
    current_address: Optional[str] = None
    city_id: Optional[UUID] = None
    citizen_of_id: Optional[UUID] = None
    # Emergency contact sub-object
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_email: Optional[str] = None
    emergency_contact_address: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    sort_code: Optional[str] = None
    avatar_url: Optional[str] = None


def _serialize_resource(resource: Resource) -> dict:
    if not resource:
        return {}
    
    # Get address string
    addr_str = ""
    citizen_of_str = resource.nationality or ""
    if resource.address:
        addr_str = resource.address.current_address or ""
        if resource.address.country and not citizen_of_str:
            citizen_of_str = resource.address.country.name or ""

    # Emergency contact details
    ec_name = ""
    ec_phone = ""
    ec_email = ""
    ec_address = ""
    if resource.emergency_contact:
        ec_name = resource.emergency_contact.contact_name or ""
        ec_phone = resource.emergency_contact.phone or ""
        ec_email = resource.emergency_contact.email or ""
        ec_address = resource.emergency_contact.address or ""

    # Bank details
    b_name = ""
    b_acc = ""
    b_sort = ""
    if resource.bank_details:
        b_name = resource.bank_details.bank_name or ""
        b_acc = resource.bank_details.account_number or ""
        b_sort = resource.bank_details.sort_code or ""

    # Status name
    status_name = "active"
    if resource.status:
        status_name = resource.status.name

    # Designation title
    desig_title = "Developer"
    if resource.designation:
        desig_title = resource.designation.title

    return {
        "id": str(resource.id),
        "employee_id": resource.employee_id,
        "full_name": resource.full_name,
        "email": resource.email,
        "phone": resource.phone,
        "dob": resource.dob.isoformat() if resource.dob else None,
        "ni_number": resource.ni_number,
        "status": status_name,
        "avatar_url": resource.avatar_url,
        "weekly_allowed_hours": resource.weekly_allowed_hours,
        "performance_notes": resource.performance_notes,
        "other_info": resource.other_info,
        "skillset": resource.skillset,
        "profile_completion_percentage": resource.profile_completion_percentage,
        "onboarding_status": resource.onboarding_status,
        "approval_status": resource.approval_status,
        "user_is_active": any(u.is_active for u in resource.user) if isinstance(resource.user, list) else (resource.user.is_active if resource.user else False),
        "is_deleted": resource.is_deleted,
        "has_required_documents": resource.has_required_documents,
        "passport_number": resource.passport_number,
        "passport_expiry": resource.passport_expiry.isoformat() if resource.passport_expiry else None,
        "visa_number": resource.visa_number,
        "visa_expiry": resource.visa_expiry.isoformat() if resource.visa_expiry else None,
        "nationality": resource.nationality,
        "department_id": str(resource.department_id) if resource.department_id else None,
        "designation_id": str(resource.designation_id) if resource.designation_id else None,
        "designation_title": desig_title,
        
        # Flat relationships
        "address": addr_str,
        "citizen_of": citizen_of_str,
        "account_number": b_acc,
        "sort_code": b_sort,
        "bank_name": b_name,
        "emergency_contact_name": ec_name,
        "emergency_contact_phone": ec_phone,
        "emergency_contact_email": ec_email,
        "emergency_contact_address": ec_address,
    }


@router.get("/")
def get_resources_grid(status: Optional[str] = None, db: Session = Depends(get_db_session), current_user: User = Depends(require_current_user)):
    query = db.query(Resource).options(
        joinedload(Resource.address).joinedload(ResourceAddress.country),
        joinedload(Resource.bank_details),
        joinedload(Resource.emergency_contact),
        joinedload(Resource.designation),
        joinedload(Resource.status),
        joinedload(Resource.user)
    ).filter(Resource.is_deleted == False)
    if status:
        query = query.filter(Resource.status == status)
    return [_serialize_resource(r) for r in query.all()]


@router.get("/pending")
def get_pending_resources(db: Session = Depends(get_db_session), current_user: User = Depends(require_privileged_user)):
    resources = db.query(Resource).options(
        joinedload(Resource.address).joinedload(ResourceAddress.country),
        joinedload(Resource.bank_details),
        joinedload(Resource.emergency_contact),
        joinedload(Resource.designation),
        joinedload(Resource.status),
        joinedload(Resource.user)
    ).filter(Resource.status == "pending", Resource.is_deleted == False).all()
    return [_serialize_resource(r) for r in resources]


@router.get("/{resource_id}")
def get_resource_details(resource_id: UUID, db: Session = Depends(get_db_session), current_user: User = Depends(require_current_user)):
    if current_user.role.name not in ["super_admin", "admin"] and resource_id != current_user.resource_id:
        raise HTTPException(status_code=403, detail="Access denied.")

    resource = db.query(Resource).options(
        joinedload(Resource.address).joinedload(ResourceAddress.country),
        joinedload(Resource.bank_details),
        joinedload(Resource.emergency_contact),
        joinedload(Resource.designation),
        joinedload(Resource.status),
        joinedload(Resource.user)
    ).filter(Resource.id == resource_id, Resource.is_deleted == False).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource profile not found.")

    # ── Recalculate profile completion live ──
    completion_data = ProgressService.calculate_profile_completion(resource, db)
    db.commit()

    # ── Current week utilization calculation (Mon → Sun) ──
    today = date.today()
    start_of_week = today - timedelta(days=today.weekday())  # Monday
    end_of_week = start_of_week + timedelta(days=6)          # Sunday
    planned_this_week = db.query(func.coalesce(func.sum(TaskScheduleEntry.planned_hours), 0)).filter(
        TaskScheduleEntry.resource_id == resource_id,
        TaskScheduleEntry.work_date >= start_of_week,
        TaskScheduleEntry.work_date <= end_of_week,
    ).scalar()
    weekly_allowed = resource.weekly_allowed_hours or 35
    utilization_pct = round((float(planned_this_week) / weekly_allowed) * 100, 1) if weekly_allowed > 0 else 0.0
    available_capacity = max(0.0, float(weekly_allowed) - float(planned_this_week))

    # Build enriched response
    return {
        "resource": _serialize_resource(resource),
        "profile_completion_percentage": completion_data["completion_percentage"],
        "onboarding_status": completion_data["onboarding_status"],
        "missing_fields": completion_data["missing_fields"],
        "current_utilization": utilization_pct,
        "available_capacity_hours": round(available_capacity, 1),
    }





def _generate_resource_username(db: Session, full_name: str) -> str:
    # Split full name by space and sanitize alphanumeric parts
    parts = [p.strip().lower() for p in full_name.split() if p.strip()]
    parts = ["".join(c for c in p if c.isalnum()) for p in parts]
    parts = [p for p in parts if p]
    
    if len(parts) >= 2:
        firstname = parts[0]
        lastname = parts[-1]
    elif len(parts) == 1:
        firstname = parts[0]
        lastname = "employee"
    else:
        firstname = "resource"
        lastname = "user"
        
    base_pattern = f"{firstname}.{lastname}"
    
    # Query existing usernames that start with base_pattern + '.'
    users = db.query(User.username).filter(User.username.like(f"{base_pattern}.%")).all()
    numbers = []
    for (uname,) in users:
        u_parts = uname.split(".")
        if len(u_parts) >= 3 and u_parts[-1].isdigit():
            numbers.append(int(u_parts[-1]))
            
    next_num = max(numbers) + 1 if numbers else 1
    return f"{base_pattern}.{next_num}"


def _generate_employee_id(db: Session) -> str:
    resources = db.query(Resource.employee_id).filter(Resource.employee_id.like("EMP-%")).all()
    existing_ids = set()
    for (emp_id,) in resources:
        if emp_id:
            parts = emp_id.split("-")
            if len(parts) == 2 and parts[1].isdigit():
                existing_ids.add(int(parts[1]))
                
    next_num = 1
    while next_num in existing_ids:
        next_num += 1
        
    return f"EMP-{next_num:04d}"


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_resource(
    request: ResourceCreateRequest,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_privileged_user),
):
    try:
        # Check duplicate email in both User and Resource tables
        email = request.email.lower()
        exists_user = db.query(User).filter(User.email == email).first()
        exists_res = db.query(Resource).filter(Resource.email == email).first()
        if exists_user or exists_res:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists.")

        # 1. Generate unique sequential username
        username_gen = _generate_resource_username(db, request.full_name)
        
        # 2. Get pending resource status
        pending_status = db.query(ResourceStatus).filter(ResourceStatus.name == "pending").first()
        if not pending_status:
            pending_status = ResourceStatus(name="pending")
            db.add(pending_status)
            db.flush()
        
        # 3. Generate unique sequential employee_id (e.g. EMP-00001)
        employee_id = _generate_employee_id(db)
        
        # 4. Create Resource profile
        resource = Resource(
            employee_id=employee_id,
            full_name=request.full_name,
            designation_id=request.designation_id,
            department_id=request.department_id,
            email=email,
            status_id=pending_status.id,
            skillset=request.skills,
            onboarding_status="pending",
            approval_status="pending",
            is_deleted=False
        )
        db.add(resource)
        db.flush()
        
        # 5. Generate credentials
        password_raw = _generate_password(request.full_name)
        password_hash = hash_password(password_raw)
        
        # Fetch resource role
        resource_role = db.query(Role).filter(Role.name == "resource").first()
        if not resource_role:
            resource_role = Role(name="resource", description="Regular Resource Employee")
            db.add(resource_role)
            db.flush()
        
        # 6. Create User account
        user = User(
            username=username_gen,
            email=email,
            full_name=request.full_name,
            role_id=resource_role.id,
            resource_id=resource.id,
            password_hash=password_hash,
            is_active=True
        )
        db.add(user)
        db.flush()
        
        # Audit Log
        _audit(
            db,
            current_user.id,
            user.id,
            "resource_created",
            "users",
            new_value={
                "id": str(user.id),
                "username": user.username,
                "email": user.email,
                "full_name": user.full_name,
                "role": "resource",
                "resource_id": str(resource.id)
            }
        )
        db.commit()
        db.refresh(resource)
        db.refresh(user)
        
        return {
            "resource": {
                "id": str(resource.id),
                "employee_id": resource.employee_id,
                "full_name": resource.full_name,
                "email": resource.email,
                "skillset": resource.skillset,
                "status": "pending"
            },
            "credentials": {
                "username": user.username,
                "email": user.email,
                "password": password_raw
            }
        }
    except Exception as e:
        db.rollback()
        raise e


@router.get("/{resource_id}/login")
def get_resource_login_status(
    resource_id: UUID,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_privileged_user),
):
    resource = db.query(Resource).filter(Resource.id == resource_id, Resource.is_deleted == False).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource profile not found.")
        
    user = db.query(User).filter(User.resource_id == resource_id).first()
    if not user:
        return {"has_account": False}
    return {
        "has_account": True,
        "username": user.username,
        "email": user.email,
        "role": "resource",
        "is_active": user.is_active,
        "last_login": user.last_login
    }


@router.post("/{resource_id}/reset-password")
def reset_resource_password(
    resource_id: UUID,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_privileged_user),
):
    resource = db.query(Resource).filter(Resource.id == resource_id, Resource.is_deleted == False).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource profile not found.")
        
    user = db.query(User).filter(User.resource_id == resource_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Login credentials not found for this resource.")
        
    new_password_raw = _generate_password(user.full_name or "Resource")
    old_val = {
        "id": str(user.id),
        "username": user.username,
        "is_active": user.is_active
    }
    
    user.password_hash = hash_password(new_password_raw)
    user.updated_at = datetime.utcnow()
    db.add(user)
    db.flush()
    
    # Audit log
    _audit(
        db,
        current_user.id,
        user.id,
        "resource_password_reset",
        "users",
        old_value=old_val,
        new_value={
            "id": str(user.id),
            "username": user.username,
            "is_active": user.is_active
        },
        changed_fields={"password_reset": True}
    )
    db.commit()
    
    return {
        "status": "success",
        "password": new_password_raw
    }


@router.patch("/{resource_id}/status")
def update_resource_login_status(
    resource_id: UUID,
    request: ResourceStatusUpdateRequest,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_privileged_user),
):
    resource = db.query(Resource).filter(Resource.id == resource_id, Resource.is_deleted == False).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource profile not found.")
        
    user = db.query(User).filter(User.resource_id == resource_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Login credentials not found.")
        
    if user.is_active == request.is_active:
        return {"status": "success", "is_active": user.is_active}
        
    old_val = {
        "id": str(user.id),
        "username": user.username,
        "is_active": user.is_active
    }
    user.is_active = request.is_active
    user.updated_at = datetime.utcnow()
    db.add(user)
    db.flush()
    
    action = "resource_activated" if request.is_active else "resource_deactivated"
    _audit(
        db,
        current_user.id,
        user.id,
        action,
        "users",
        old_value=old_val,
        new_value={
            "id": str(user.id),
            "username": user.username,
            "is_active": user.is_active
        },
        changed_fields={"is_active": {"old": old_val["is_active"], "new": request.is_active}}
    )
    db.commit()
    return {"status": "success", "is_active": user.is_active}


@router.delete("/{resource_id}")
def delete_resource(
    resource_id: UUID,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_privileged_user),
):
    resource = db.query(Resource).filter(Resource.id == resource_id, Resource.is_deleted == False).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource profile not found.")
        
    # Soft-delete the Resource profile
    resource.is_deleted = True
    resource.deleted_at = datetime.utcnow()
    resource.deleted_by = current_user.id
    db.add(resource)
    db.flush()
    
    # Deactivate the linked User account
    user = db.query(User).filter(User.resource_id == resource_id).first()
    user_id = None
    old_val = None
    if user:
        user_id = user.id
        old_val = {
            "id": str(user.id),
            "username": user.username,
            "is_active": user.is_active
        }
        user.is_active = False
        user.updated_at = datetime.utcnow()
        db.add(user)
        db.flush()
        
    # Audit log
    _audit(
        db,
        current_user.id,
        user_id or resource_id,
        "resource_deleted",
        "users",
        old_value=old_val,
        changed_fields={"deleted": True, "is_active": False}
    )
    db.commit()
    return {"status": "success", "message": "Resource profile soft-deleted and credentials deactivated successfully."}


@router.put("/{resource_id}")
def update_resource(
    resource_id: UUID,
    request: ResourceUpdateRequest,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_privileged_user),
):
    resource = db.query(Resource).filter(Resource.id == resource_id, Resource.is_deleted == False).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource profile not found.")
        
    old_val = {
        "id": str(resource.id),
        "skillset": resource.skillset,
        "weekly_allowed_hours": resource.weekly_allowed_hours,
        "performance_notes": resource.performance_notes,
    }
    
    if request.skillset is not None:
        resource.skillset = request.skillset
    if request.weekly_allowed_hours is not None:
        resource.weekly_allowed_hours = request.weekly_allowed_hours
    if request.performance_notes is not None:
        resource.performance_notes = request.performance_notes
    if request.avatar_url is not None:
        from backend.app.core.file_security import check_base64_file_size
        check_base64_file_size(request.avatar_url)
        resource.avatar_url = request.avatar_url
    if request.nationality is not None:
        resource.nationality = request.nationality
        
    if request.status is not None:
        res_status = db.query(ResourceStatus).filter(ResourceStatus.name == request.status).first()
        if res_status:
            resource.status_id = res_status.id

    # ─── Address upsert (Admin update) ───
    if any([request.current_address is not None, request.city_id is not None, request.citizen_of_id is not None]):
        addr = db.query(ResourceAddress).filter(ResourceAddress.resource_id == resource.id).first()
        if addr:
            if request.current_address is not None:
                new_norm = " ".join(request.current_address.strip().split()).lower()
                old_norm = " ".join((addr.current_address or "").strip().split()).lower()
                
                # Check if this is a real change and NOT a first-time entry
                if old_norm and new_norm != old_norm:
                    addr.previous_address = addr.current_address
                    addr.last_changed_at = datetime.utcnow()
                    addr.last_changed_by = current_user.id
                
                addr.current_address = request.current_address
            if request.city_id is not None:
                addr.city_id = request.city_id
            if request.citizen_of_id is not None:
                addr.citizen_of_id = request.citizen_of_id
            db.add(addr)
        else:
            # Fall back to default city and country if not provided
            city_id = request.city_id
            citizen_of_id = request.citizen_of_id
            if not city_id:
                city = db.query(City).first()
                if city:
                    city_id = city.id
            if not citizen_of_id:
                country = db.query(Country).first()
                if country:
                    citizen_of_id = country.id
            
            if city_id and citizen_of_id:
                addr = ResourceAddress(
                    resource_id=resource.id,
                    current_address=request.current_address or "",
                    city_id=city_id,
                    citizen_of_id=citizen_of_id,
                    previous_address=None,
                    last_changed_at=None,
                    last_changed_by=None
                )
                db.add(addr)
            
    resource.updated_at = datetime.utcnow()
    db.add(resource)
    db.flush()
    
    _audit(
        db,
        current_user.id,
        resource.id,
        "resource_updated",
        "resources",
        old_value=old_val,
        new_value={
            "id": str(resource.id),
            "skillset": resource.skillset,
            "weekly_allowed_hours": resource.weekly_allowed_hours,
            "performance_notes": resource.performance_notes,
        }
    )
    db.commit()
    db.refresh(resource)
    return _serialize_resource(resource)


# ==============================================================================
# SELF-SERVICE PROFILE ENDPOINTS (Resource user)
# ==============================================================================

@router.put("/profile/self")
def update_self_profile(
    request: SelfProfileUpdateRequest,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_current_user),
):
    """
    Resource self-service: update own profile fields, address, bank, emergency contact.
    Recalculates profile completion and onboarding status after save.
    """
    if not current_user.resource_id:
        raise HTTPException(status_code=403, detail="Only resource accounts can update their own profile.")

    resource = db.query(Resource).filter(
        Resource.id == current_user.resource_id,
        Resource.is_deleted == False,
    ).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource profile not found.")

    # Validate unique NI number if provided
    if request.ni_number is not None and request.ni_number.strip():
        ni_clean = request.ni_number.strip()
        existing = db.query(Resource).filter(
            Resource.ni_number == ni_clean,
            Resource.id != resource.id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="National Insurance (NI) number already exists on another profile."
            )

    # ─── Direct resource fields ───
    if request.avatar_url is not None:
        from backend.app.core.file_security import check_base64_file_size
        check_base64_file_size(request.avatar_url)

    date_fields_map = {"dob": "dob", "passport_expiry": "passport_expiry", "visa_expiry": "visa_expiry"}
    simple_fields = ["phone", "ni_number", "nationality", "passport_number", "visa_number", "skillset", "other_info", "avatar_url"]

    for f in simple_fields:
        val = getattr(request, f, None)
        if val is not None:
            setattr(resource, f, val)

    for req_field, db_field in date_fields_map.items():
        val = getattr(request, req_field, None)
        if val is not None:
            try:
                from datetime import date as _date
                setattr(resource, db_field, _date.fromisoformat(val))
            except (ValueError, TypeError):
                pass

    resource.updated_at = datetime.utcnow()
    db.add(resource)
    db.flush()

    # ─── Address upsert ───
    if any([request.current_address is not None, request.city_id is not None, request.citizen_of_id is not None]):
        addr = db.query(ResourceAddress).filter(ResourceAddress.resource_id == resource.id).first()
        if addr:
            if request.current_address is not None:
                new_norm = " ".join(request.current_address.strip().split()).lower()
                old_norm = " ".join((addr.current_address or "").strip().split()).lower()
                
                # Check if this is a real change and NOT a first-time entry
                if old_norm and new_norm != old_norm:
                    addr.previous_address = addr.current_address
                    addr.last_changed_at = datetime.utcnow()
                    addr.last_changed_by = current_user.id
                
                addr.current_address = request.current_address
            if request.city_id is not None:
                addr.city_id = request.city_id
            if request.citizen_of_id is not None:
                addr.citizen_of_id = request.citizen_of_id
            db.add(addr)
        else:
            # Fall back to default city and country if not provided
            city_id = request.city_id
            citizen_of_id = request.citizen_of_id
            if not city_id:
                city = db.query(City).first()
                if city:
                    city_id = city.id
            if not citizen_of_id:
                country = db.query(Country).first()
                if country:
                    citizen_of_id = country.id
            
            if city_id and citizen_of_id:
                addr = ResourceAddress(
                    resource_id=resource.id,
                    current_address=request.current_address or "",
                    city_id=city_id,
                    citizen_of_id=citizen_of_id,
                    previous_address=None,
                    last_changed_at=None,
                    last_changed_by=None
                )
                db.add(addr)
        db.flush()

    # ─── Emergency contact upsert ───
    if any([request.emergency_contact_name, request.emergency_contact_phone,
            request.emergency_contact_email, request.emergency_contact_address]):
        ec = db.query(ResourceEmergencyContact).filter(
            ResourceEmergencyContact.resource_id == resource.id
        ).first()
        if ec:
            if request.emergency_contact_name is not None:
                ec.contact_name = request.emergency_contact_name
            if request.emergency_contact_phone is not None:
                ec.phone = request.emergency_contact_phone
            if request.emergency_contact_email is not None:
                ec.email = request.emergency_contact_email
            if request.emergency_contact_address is not None:
                ec.address = request.emergency_contact_address
            db.add(ec)
        else:
            if request.emergency_contact_name and request.emergency_contact_phone:
                ec = ResourceEmergencyContact(
                    resource_id=resource.id,
                    contact_name=request.emergency_contact_name,
                    phone=request.emergency_contact_phone,
                    email=request.emergency_contact_email,
                    address=request.emergency_contact_address,
                )
                db.add(ec)
        db.flush()

    # ─── Bank details upsert ───
    if any([request.bank_name, request.account_number, request.sort_code]):
        bank = db.query(ResourceBankDetails).filter(
            ResourceBankDetails.resource_id == resource.id
        ).first()
        if bank:
            if request.bank_name is not None:
                bank.bank_name = request.bank_name
            if request.account_number is not None:
                bank.account_number = request.account_number
            if request.sort_code is not None:
                bank.sort_code = request.sort_code
            db.add(bank)
        else:
            if request.bank_name and request.account_number and request.sort_code:
                bank = ResourceBankDetails(
                    resource_id=resource.id,
                    bank_name=request.bank_name,
                    account_number=request.account_number,
                    sort_code=request.sort_code,
                )
                db.add(bank)
        db.flush()

    # ─── Recalculate profile completion ───
    completion_data = ProgressService.calculate_profile_completion(resource, db)
    db.commit()
    db.refresh(resource)

    return {
        "status": "success",
        "resource_id": str(resource.id),
        "profile_completion_percentage": completion_data["completion_percentage"],
        "onboarding_status": completion_data["onboarding_status"],
        "missing_fields": completion_data["missing_fields"],
    }


@router.get("/profile/self/completion")
def get_self_profile_completion(
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_current_user),
):
    """Returns live profile completion percentage and missing fields checklist."""
    if not current_user.resource_id:
        raise HTTPException(status_code=403, detail="Only resource accounts have profile completion.")

    resource = db.query(Resource).filter(
        Resource.id == current_user.resource_id,
        Resource.is_deleted == False,
    ).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource profile not found.")

    completion_data = ProgressService.calculate_profile_completion(resource, db)
    db.commit()

    return {
        "resource_id": str(resource.id),
        "profile_completion_percentage": completion_data["completion_percentage"],
        "onboarding_status": completion_data["onboarding_status"],
        "missing_fields": completion_data["missing_fields"],
    }


@router.put("/{resource_id}/approve-onboarding")
def approve_resource_onboarding(
    resource_id: UUID,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(require_privileged_user),
):
    """Admin/Super Admin sets approval_status to 'approved' for a resource."""
    resource = db.query(Resource).filter(Resource.id == resource_id, Resource.is_deleted == False).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource profile not found.")

    # Step 1: Enforce onboarding completed state
    if resource.onboarding_status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Required onboarding requirements are incomplete."
        )

    # Step 2: Enforce profile completion >= 80%
    if (resource.profile_completion_percentage or 0) < 80:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Required onboarding requirements are incomplete."
        )

    # Step 3: Enforce mandatory documents uploaded
    if not resource.has_required_documents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Required onboarding requirements are incomplete."
        )

    from backend.app.services.transaction_service import transactional

    with transactional(db):
        # 3. Query the active status lookup record
        active_status = db.query(ResourceStatus).filter(ResourceStatus.name == "active").first()
        if not active_status:
            active_status = ResourceStatus(name="active")
            db.add(active_status)
            db.flush()

        # 4. Update status and approval
        resource.status_id = active_status.id
        resource.approval_status = "approved"
        resource.updated_at = datetime.utcnow()
        db.add(resource)

        _audit(
            db,
            current_user.id,
            resource.id,
            "resource_approval_granted",
            "resources",
            new_value={"approval_status": "approved", "status": "active"}
        )

    return {"status": "success", "resource_id": str(resource.id), "approval_status": "approved"}
