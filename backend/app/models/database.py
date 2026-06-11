import uuid
from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Integer,
    Boolean,
    ForeignKey,
    Date,
    DateTime,
    Numeric,
    Text,
    Table,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

# ==========================================
# BRIDGE/MAPPING TABLES
# ==========================================

role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", UUID(as_uuid=True), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("permission_id", UUID(as_uuid=True), ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True),
)

project_resources = Table(
    "project_resources",
    Base.metadata,
    Column("project_id", UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True),
    Column("resource_id", UUID(as_uuid=True), ForeignKey("resources.id", ondelete="CASCADE"), primary_key=True),
)

resource_skills = Table(
    "resource_skills",
    Base.metadata,
    Column("resource_id", UUID(as_uuid=True), ForeignKey("resources.id", ondelete="CASCADE"), primary_key=True),
    Column("skill_id", UUID(as_uuid=True), ForeignKey("skills_master.id", ondelete="CASCADE"), primary_key=True),
)

# ==========================================
# MASTER / LOOKUP TABLES
# ==========================================

class Country(Base):
    __tablename__ = "countries"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False, unique=True)
    iso_code = Column(String(3), nullable=False, unique=True)


class State(Base):
    __tablename__ = "states"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    country_id = Column(UUID(as_uuid=True), ForeignKey("countries.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    state_code = Column(String(10), nullable=True)

    __table_args__ = (UniqueConstraint("country_id", "name", name="uq_state_country"),)


class City(Base):
    __tablename__ = "cities"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    state_id = Column(UUID(as_uuid=True), ForeignKey("states.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)

    __table_args__ = (UniqueConstraint("state_id", "name", name="uq_city_state"),)


class Department(Base):
    __tablename__ = "departments"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)


class Designation(Base):
    __tablename__ = "designations"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(100), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)



class SkillMaster(Base):
    __tablename__ = "skills_master"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False, unique=True)
    category = Column(String(50), nullable=True)


class DocumentType(Base):
    __tablename__ = "document_types"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(50), nullable=False, unique=True)
    description = Column(Text, nullable=True)


class LeaveType(Base):
    __tablename__ = "leave_types"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(50), nullable=False, unique=True)
    max_days_allowed = Column(Integer, nullable=False, default=0)
    is_paid = Column(Boolean, nullable=False, default=True)


class TaskStatus(Base):
    __tablename__ = "task_statuses"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(50), nullable=False, unique=True)


class ResourceStatus(Base):
    __tablename__ = "resource_statuses"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(50), nullable=False, unique=True)


class ProjectStatus(Base):
    __tablename__ = "project_statuses"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(50), nullable=False, unique=True)


class NotificationType(Base):
    __tablename__ = "notification_types"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(50), nullable=False, unique=True)

# ==========================================
# IDENTITY & USERS
# ==========================================

class Role(Base):
    __tablename__ = "roles"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(50), nullable=False, unique=True)
    description = Column(String(255), nullable=True)

    permissions = relationship("Permission", secondary=role_permissions, back_populates="roles")


class Permission(Base):
    __tablename__ = "permissions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(String(255), nullable=True)

    roles = relationship("Role", secondary=role_permissions, back_populates="permissions")


class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(100), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, unique=True)
    full_name = Column(String(150), nullable=True)
    role_id = Column(UUID(as_uuid=True), ForeignKey("roles.id"), nullable=False)
    resource_id = Column(UUID(as_uuid=True), ForeignKey("resources.id", ondelete="SET NULL"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    last_login = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    role = relationship("Role")
    resource = relationship("Resource", back_populates="user", foreign_keys=[resource_id])


class Session(Base):
    __tablename__ = "sessions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    refresh_token = Column(String(512), nullable=False, unique=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    user = relationship("User")

# ==========================================
# RESOURCE DOMAIN
# ==========================================

class Resource(Base):
    __tablename__ = "resources"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(String(50), nullable=False, unique=True)
    full_name = Column(String(150), nullable=False)
    designation_id = Column(UUID(as_uuid=True), ForeignKey("designations.id"), nullable=False)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id"), nullable=False)
    email = Column(String(255), nullable=False, unique=True)
    phone = Column(String(25), nullable=True)
    dob = Column(Date, nullable=True)
    ni_number = Column(String(30), nullable=True, unique=True)
    status_id = Column(UUID(as_uuid=True), ForeignKey("resource_statuses.id"), nullable=False)
    avatar_url = Column(Text, nullable=True)
    weekly_allowed_hours = Column(Integer, default=35, nullable=False)
    performance_notes = Column(Text, nullable=True)
    other_info = Column(Text, nullable=True)
    skillset = Column(Text, nullable=True)
    profile_completion_percentage = Column(Integer, default=0, nullable=False)
    onboarding_status = Column(String(50), default="pending", nullable=False)
    approval_status = Column(String(50), default="pending", nullable=False)
    passport_number = Column(String(100), nullable=True)
    passport_expiry = Column(Date, nullable=True)
    visa_number = Column(String(100), nullable=True)
    visa_expiry = Column(Date, nullable=True)
    nationality = Column(String(100), nullable=True)
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    deleted_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="resource", foreign_keys=[User.resource_id])
    designation = relationship("Designation")
    department = relationship("Department")
    status = relationship("ResourceStatus")
    address = relationship("ResourceAddress", back_populates="resource", uselist=False)
    emergency_contact = relationship("ResourceEmergencyContact", back_populates="resource", uselist=False)
    bank_details = relationship("ResourceBankDetails", back_populates="resource", uselist=False)
    skills = relationship("SkillMaster", secondary=resource_skills)
    projects = relationship("Project", secondary=project_resources, back_populates="resources")
    tasks = relationship("Task", back_populates="resource", cascade="all, delete-orphan")

    @property
    def has_required_documents(self) -> bool:
        uploaded_types = {
            d.document_type.lower().strip()
            for d in (self.documents or [])
        }
        required = {"cv", "passport", "visa"}
        return required.issubset(uploaded_types)


# ==========================================
# RELATIONAL DETAILS
# ==========================================

class ResourceAddress(Base):
    __tablename__ = "resource_addresses"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resource_id = Column(UUID(as_uuid=True), ForeignKey("resources.id", ondelete="CASCADE"), unique=True, nullable=False)
    current_address = Column(Text, nullable=False)
    city_id = Column(UUID(as_uuid=True), ForeignKey("cities.id"), nullable=False)
    citizen_of_id = Column(UUID(as_uuid=True), ForeignKey("countries.id"), nullable=False)
    previous_address = Column(Text, nullable=True)
    last_changed_at = Column(DateTime(timezone=True), nullable=True)
    last_changed_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    resource = relationship("Resource", back_populates="address")
    city = relationship("City")
    country = relationship("Country")
    changer = relationship("User", foreign_keys=[last_changed_by])


class ResourceEmergencyContact(Base):
    __tablename__ = "resource_emergency_contacts"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resource_id = Column(UUID(as_uuid=True), ForeignKey("resources.id", ondelete="CASCADE"), unique=True, nullable=False)
    contact_name = Column(String(150), nullable=False)
    phone = Column(String(25), nullable=False)
    email = Column(String(255), nullable=True)
    address = Column(Text, nullable=True)

    resource = relationship("Resource", back_populates="emergency_contact")


class ResourceBankDetails(Base):
    __tablename__ = "resource_bank_details"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resource_id = Column(UUID(as_uuid=True), ForeignKey("resources.id", ondelete="CASCADE"), unique=True, nullable=False)
    bank_name = Column(String(100), nullable=False)
    account_number = Column(String(50), nullable=False)
    sort_code = Column(String(20), nullable=False)

    resource = relationship("Resource", back_populates="bank_details")


class DocumentAttachment(Base):
    __tablename__ = "document_attachments"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    filename = Column(String(255), nullable=False)
    storage_key = Column(String(255), nullable=False, unique=True)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=False)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    entity_type = Column(String(50), nullable=True)
    entity_id = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)


class ResourceDocument(Base):
    __tablename__ = "resource_documents"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resource_id = Column(UUID(as_uuid=True), ForeignKey("resources.id", ondelete="CASCADE"), nullable=False)
    document_type = Column(String(50), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_path = Column(Text, nullable=False)
    uploaded_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    resource = relationship("Resource", back_populates="documents")
    uploader = relationship("User", foreign_keys=[uploaded_by])

Resource.documents = relationship("ResourceDocument", back_populates="resource")

# ==========================================
# CLIENTS & PROJECTS
# ==========================================

class Client(Base):
    __tablename__ = "clients"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(150), nullable=False, unique=True)
    contact_person = Column(String(150), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(25), nullable=True)
    address = Column(Text, nullable=True)
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    deleted_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    projects = relationship("Project", back_populates="client")


class Project(Base):
    __tablename__ = "projects"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(150), nullable=False)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    status_id = Column(UUID(as_uuid=True), ForeignKey("project_statuses.id"), nullable=False)
    description = Column(Text, nullable=True)
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    deleted_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    client = relationship("Client", back_populates="projects")
    status = relationship("ProjectStatus")
    resources = relationship("Resource", secondary=project_resources, back_populates="projects")
    requirements = relationship("ProjectRequirement", back_populates="project", cascade="all, delete-orphan")
    assignments = relationship("ProjectAssignment", back_populates="project", cascade="all, delete-orphan")
    project_tasks = relationship("ProjectTask", back_populates="project", cascade="all, delete-orphan")
    daily_reports = relationship("DailyReport", back_populates="project", cascade="all, delete-orphan")

# ==========================================
# TASKS & COMMENTS
# ==========================================

class Task(Base):
    __tablename__ = "tasks"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subject = Column(String(255), nullable=False)
    start_date = Column(Date, nullable=False)
    resource_id = Column(UUID(as_uuid=True), ForeignKey("resources.id"), nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    notes = Column(Text, nullable=True)
    status_id = Column(UUID(as_uuid=True), ForeignKey("task_statuses.id"), nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    deleted_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    resource = relationship("Resource", back_populates="tasks")
    project = relationship("Project")
    status = relationship("TaskStatus")
    comments = relationship("TaskComment", back_populates="task", cascade="all, delete-orphan")


class TaskComment(Base):
    __tablename__ = "task_comments"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    comment_text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    task = relationship("Task", back_populates="comments")
    user = relationship("User")

# ==========================================
# LEAVE DOMAIN
# ==========================================

class LeaveBalance(Base):
    __tablename__ = "leave_balances"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resource_id = Column(UUID(as_uuid=True), ForeignKey("resources.id", ondelete="CASCADE"), nullable=False)
    leave_type_id = Column(UUID(as_uuid=True), ForeignKey("leave_types.id"), nullable=False)
    balance = Column(Integer, default=0, nullable=False)

    __table_args__ = (UniqueConstraint("resource_id", "leave_type_id", name="uq_res_leave_type"),)


class Leave(Base):
    __tablename__ = "leaves"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resource_id = Column(UUID(as_uuid=True), ForeignKey("resources.id", ondelete="CASCADE"), nullable=False)
    leave_type_id = Column(UUID(as_uuid=True), ForeignKey("leave_types.id"), nullable=False)
    from_date = Column(Date, nullable=False)
    to_date = Column(Date, nullable=False)
    total_days = Column(Integer, nullable=False)
    reason = Column(Text, nullable=True)
    status = Column(String(20), default="pending", nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    deleted_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    resource = relationship("Resource", back_populates="leaves")
    leave_type = relationship("LeaveType")

# ==========================================
# TIMESHEETS DOMAIN (NORMALIZED)
# ==========================================

class Timesheet(Base):
    __tablename__ = "timesheets"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resource_id = Column(UUID(as_uuid=True), ForeignKey("resources.id", ondelete="CASCADE"), nullable=False)
    week_end_date = Column(Date, nullable=False)
    status = Column(String(20), default="pending", nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    deleted_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    resource = relationship("Resource", back_populates="timesheets")
    entries = relationship("TimesheetEntry", back_populates="timesheet", cascade="all, delete-orphan")


class TimesheetEntry(Base):
    __tablename__ = "timesheet_entries"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    timesheet_id = Column(UUID(as_uuid=True), ForeignKey("timesheets.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    work_date = Column(Date, nullable=False)
    hours = Column(Numeric(4, 2), default=0.00, nullable=False)
    remarks = Column(Text, nullable=True)

    timesheet = relationship("Timesheet", back_populates="entries")
    project = relationship("Project")

    __table_args__ = (
        UniqueConstraint("timesheet_id", "project_id", "work_date", name="uq_timesheet_proj_date"),
    )

# ==========================================
# WORKFLOW APPROVALS ENGINE
# ==========================================

class ApprovalWorkflow(Base):
    __tablename__ = "approval_workflows"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False, unique=True)
    module_name = Column(String(50), nullable=False)  # 'leaves', 'timesheets', 'resources'
    description = Column(Text, nullable=True)


class ApprovalWorkflowStep(Base):
    __tablename__ = "approval_workflow_steps"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workflow_id = Column(UUID(as_uuid=True), ForeignKey("approval_workflows.id", ondelete="CASCADE"), nullable=False)
    step_number = Column(Integer, nullable=False)
    role_id = Column(UUID(as_uuid=True), ForeignKey("roles.id"), nullable=False)

    __table_args__ = (
        UniqueConstraint("workflow_id", "step_number", name="uq_workflow_step"),
    )


class Approval(Base):
    __tablename__ = "approvals"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    module_name = Column(String(50), nullable=False)
    record_id = Column(UUID(as_uuid=True), nullable=False)
    current_step_number = Column(Integer, default=1, nullable=False)
    submitted_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    approved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    status = Column(String(20), default="pending", nullable=False)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

# ==========================================
# PAYROLL & SYSTEM BULLETINS
# ==========================================

class Payslip(Base):
    __tablename__ = "payslips"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resource_id = Column(UUID(as_uuid=True), ForeignKey("resources.id", ondelete="CASCADE"), nullable=False)
    month = Column(String(30), nullable=False)
    days = Column(Integer, nullable=False)
    notes = Column(Text, nullable=True)
    amount = Column(Numeric(10, 2), nullable=False)
    file_attachment_id = Column(UUID(as_uuid=True), ForeignKey("document_attachments.id"), nullable=True)
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    deleted_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    resource = relationship("Resource", back_populates="payslips")
    attachment = relationship("DocumentAttachment")


class Announcement(Base):
    __tablename__ = "announcements"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subject = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    date = Column(Date, nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    deleted_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)


class ReportExport(Base):
    __tablename__ = "report_exports"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_name = Column(String(100), nullable=False)
    export_type = Column(String(10), nullable=False)  # 'excel', 'csv', 'pdf'
    attachment_id = Column(UUID(as_uuid=True), ForeignKey("document_attachments.id"), nullable=False)
    requested_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

# ==========================================
# AUDITING & LOGGING
# ==========================================

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    module = Column(String(50), nullable=False)
    action = Column(String(50), nullable=False)  # INSERT, UPDATE, DELETE
    table_name = Column(String(50), nullable=False)
    record_id = Column(UUID(as_uuid=True), nullable=False)
    old_value = Column(JSONB, nullable=True)
    new_value = Column(JSONB, nullable=True)
    changed_fields = Column(JSONB, nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)


class LoginActivity(Base):
    __tablename__ = "login_activities"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(100), nullable=False)
    status = Column(String(20), nullable=False)  # success, failed_password, failed_username, locked
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

# ==========================================
# HISTORY LOGS
# ==========================================

class ResourceHistory(Base):
    __tablename__ = "resource_history"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resource_id = Column(UUID(as_uuid=True), ForeignKey("resources.id", ondelete="CASCADE"), nullable=False)
    changed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    previous_value = Column(JSONB, nullable=False)
    new_value = Column(JSONB, nullable=False)
    changed_fields = Column(JSONB, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)


class ProjectHistory(Base):
    __tablename__ = "project_history"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    changed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    previous_value = Column(JSONB, nullable=False)
    new_value = Column(JSONB, nullable=False)
    changed_fields = Column(JSONB, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)


class TaskHistory(Base):
    __tablename__ = "task_history"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    changed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    status_from = Column(String(30), nullable=False)
    status_to = Column(String(30), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)


class DocumentHistory(Base):
    __tablename__ = "document_history"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resource_document_id = Column(UUID(as_uuid=True), ForeignKey("resource_documents.id", ondelete="CASCADE"), nullable=False)
    changed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    old_attachment_id = Column(UUID(as_uuid=True), ForeignKey("document_attachments.id"), nullable=True)
    new_attachment_id = Column(UUID(as_uuid=True), ForeignKey("document_attachments.id"), nullable=False)
    version = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

# ==========================================
# NOTIFICATIONS INFRASTRUCTURE
# ==========================================

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    recipient_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    module_name = Column(String(50), nullable=False)
    record_id = Column(UUID(as_uuid=True), nullable=False)
    action_url = Column(String(255), nullable=True)
    priority = Column(String(10), default="medium", nullable=False)
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)


class NotificationLog(Base):
    __tablename__ = "notification_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    notification_id = Column(UUID(as_uuid=True), ForeignKey("notifications.id", ondelete="SET NULL"), nullable=True)
    channel = Column(String(20), nullable=False)  # email, sms, push, in-app
    recipient = Column(String(255), nullable=False)
    template_name = Column(String(100), nullable=False)
    status = Column(String(20), default="pending", nullable=False)  # sent, failed, retry
    retry_count = Column(Integer, default=0, nullable=False)
    error_details = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)


class ProjectRequirement(Base):
    __tablename__ = "project_requirements"
    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    module_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    estimated_hours = Column(Integer, nullable=True)
    priority = Column(String(50), nullable=True)
    status = Column(String(50), default="pending", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    project = relationship("Project", back_populates="requirements")
    skill_requirements = relationship("ProjectSkillRequirement", back_populates="requirement", cascade="all, delete-orphan")


class ProjectSkillRequirement(Base):
    __tablename__ = "project_skill_requirements"
    id = Column(Integer, primary_key=True, autoincrement=True)
    requirement_id = Column(Integer, ForeignKey("project_requirements.id", ondelete="CASCADE"), nullable=False)
    skill_id = Column(UUID(as_uuid=True), ForeignKey("skills_master.id", ondelete="CASCADE"), nullable=False)
    required_level = Column(String(50), nullable=True)
    mandatory = Column(Boolean, default=True, nullable=False)

    requirement = relationship("ProjectRequirement", back_populates="skill_requirements")
    skill = relationship("SkillMaster")


class ProjectAssignment(Base):
    __tablename__ = "project_assignments"
    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    requirement_id = Column(Integer, ForeignKey("project_requirements.id", ondelete="CASCADE"), nullable=False)
    resource_id = Column(UUID(as_uuid=True), ForeignKey("resources.id", ondelete="CASCADE"), nullable=False)
    assignment_type = Column(String(50), nullable=True)
    assigned_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    assigned_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    project = relationship("Project", back_populates="assignments")
    requirement = relationship("ProjectRequirement")
    resource = relationship("Resource")
    assigned_by_user = relationship("User")


class AIAnalysisResult(Base):
    __tablename__ = "ai_analysis_results"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    prompt = Column(Text, nullable=False)
    response = Column(JSONB, nullable=False)
    model_name = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    project = relationship("Project")


# ==========================================
# AI PLANNER & TASK EXECUTION MODELS
# ==========================================

class ProjectTask(Base):
    __tablename__ = "project_tasks"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    requirement_id = Column(Integer, ForeignKey("project_requirements.id", ondelete="CASCADE"), nullable=False)
    resource_id = Column(UUID(as_uuid=True), ForeignKey("resources.id", ondelete="SET NULL"), nullable=True)
    parent_task_id = Column(UUID(as_uuid=True), ForeignKey("project_tasks.id", ondelete="CASCADE"), nullable=True)
    task_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    estimated_hours = Column(Integer, nullable=False, default=0)
    actual_hours = Column(Integer, nullable=False, default=0)
    priority = Column(String(50), default="Medium")
    status = Column(String(50), default="pending")
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    project = relationship("Project", back_populates="project_tasks")
    requirement = relationship("ProjectRequirement")
    resource = relationship("Resource", back_populates="project_tasks")
    parent = relationship("ProjectTask", remote_side=[id], back_populates="subtasks")
    subtasks = relationship("ProjectTask", back_populates="parent", cascade="all, delete-orphan")
    dependencies = relationship("TaskDependency", foreign_keys="TaskDependency.task_id", back_populates="task", cascade="all, delete-orphan")
    dependent_on = relationship("TaskDependency", foreign_keys="TaskDependency.depends_on_task_id", back_populates="depends_on_task", cascade="all, delete-orphan")
    schedule_entries = relationship("TaskScheduleEntry", back_populates="task", cascade="all, delete-orphan")
    activity_logs = relationship("TaskActivityLog", back_populates="task", cascade="all, delete-orphan")
    time_logs = relationship("TaskTimeLog", back_populates="task", cascade="all, delete-orphan")
    daily_report_items = relationship("DailyReportItem", back_populates="task", cascade="all, delete-orphan")


class TaskDependency(Base):
    __tablename__ = "task_dependencies"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(UUID(as_uuid=True), ForeignKey("project_tasks.id", ondelete="CASCADE"), nullable=False)
    depends_on_task_id = Column(UUID(as_uuid=True), ForeignKey("project_tasks.id", ondelete="CASCADE"), nullable=False)

    task = relationship("ProjectTask", foreign_keys=[task_id], back_populates="dependencies")
    depends_on_task = relationship("ProjectTask", foreign_keys=[depends_on_task_id], back_populates="dependent_on")

    __table_args__ = (UniqueConstraint("task_id", "depends_on_task_id", name="uq_task_dependency"),)


class TaskActivityLog(Base):
    __tablename__ = "task_activity_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(UUID(as_uuid=True), ForeignKey("project_tasks.id", ondelete="CASCADE"), nullable=False)
    resource_id = Column(UUID(as_uuid=True), ForeignKey("resources.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    task = relationship("ProjectTask", back_populates="activity_logs")
    resource = relationship("Resource")


class TaskScheduleEntry(Base):
    __tablename__ = "task_schedule_entries"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(UUID(as_uuid=True), ForeignKey("project_tasks.id", ondelete="CASCADE"), nullable=False)
    resource_id = Column(UUID(as_uuid=True), ForeignKey("resources.id", ondelete="CASCADE"), nullable=False)
    work_date = Column(Date, nullable=False)
    planned_hours = Column(Integer, nullable=False, default=0)
    status = Column(String(50), default="planned")

    task = relationship("ProjectTask", back_populates="schedule_entries")
    resource = relationship("Resource")


class TaskTimeLog(Base):
    __tablename__ = "task_time_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(UUID(as_uuid=True), ForeignKey("project_tasks.id", ondelete="CASCADE"), nullable=False)
    resource_id = Column(UUID(as_uuid=True), ForeignKey("resources.id", ondelete="CASCADE"), nullable=False)
    hours_logged = Column(Numeric(5, 2), nullable=False, default=0.00)
    notes = Column(Text, nullable=True)
    logged_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    task = relationship("ProjectTask", back_populates="time_logs")
    resource = relationship("Resource")


Resource.project_tasks = relationship("ProjectTask", back_populates="resource")
Resource.daily_reports = relationship("DailyReport", back_populates="resource", cascade="all, delete-orphan")
Resource.leaves = relationship("Leave", back_populates="resource", cascade="all, delete-orphan")
Resource.timesheets = relationship("Timesheet", back_populates="resource", cascade="all, delete-orphan")
Resource.payslips = relationship("Payslip", back_populates="resource", cascade="all, delete-orphan")


# ==========================================
# 17. AI DAILY REPORTING & FEEDBACK LOOP MODELS
# ==========================================

class DailyReport(Base):
    __tablename__ = "daily_reports"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resource_id = Column(UUID(as_uuid=True), ForeignKey("resources.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    work_date = Column(Date, nullable=False)
    work_done = Column(Text, nullable=True)
    blockers = Column(Text, nullable=True)
    tomorrow_plan = Column(Text, nullable=True)
    hours_worked = Column(Numeric(5, 2), nullable=False, default=0.00)
    status = Column(String(50), default="pending")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    submitted_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    resource = relationship("Resource", back_populates="daily_reports")
    project = relationship("Project", back_populates="daily_reports")
    items = relationship("DailyReportItem", back_populates="report", cascade="all, delete-orphan")
    analysis_result = relationship("ReportAnalysisResult", uselist=False, back_populates="report", cascade="all, delete-orphan")
    flags = relationship("ReportFlag", back_populates="report", cascade="all, delete-orphan")


class DailyReportItem(Base):
    __tablename__ = "daily_report_items"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id = Column(UUID(as_uuid=True), ForeignKey("daily_reports.id", ondelete="CASCADE"), nullable=False)
    task_id = Column(UUID(as_uuid=True), ForeignKey("project_tasks.id", ondelete="CASCADE"), nullable=False)
    hours_spent = Column(Numeric(5, 2), nullable=False, default=0.00)
    completion_percent = Column(Integer, nullable=False, default=0)
    comments = Column(Text, nullable=True)

    report = relationship("DailyReport", back_populates="items")
    task = relationship("ProjectTask", back_populates="daily_report_items")


class ReportAnalysisResult(Base):
    __tablename__ = "report_analysis_results"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id = Column(UUID(as_uuid=True), ForeignKey("daily_reports.id", ondelete="CASCADE"), nullable=False)
    summary = Column(Text, nullable=True)
    progress_score = Column(Integer, default=0)
    risk_level = Column(String(50), default="low")
    ai_response = Column(JSONB, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    report = relationship("DailyReport", back_populates="analysis_result")


class ReportFlag(Base):
    __tablename__ = "report_flags"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id = Column(UUID(as_uuid=True), ForeignKey("daily_reports.id", ondelete="CASCADE"), nullable=False)
    flag_type = Column(String(100), nullable=False) # vague_report, completion_mismatch, blocker_detected, high_risk
    severity = Column(String(50), nullable=False) # info, warning, critical
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    report = relationship("DailyReport", back_populates="flags")


class Setting(Base):
    __tablename__ = "settings"
    key = Column(String(255), primary_key=True)
    value = Column(Text, nullable=False)
    description = Column(String(255), nullable=True)
