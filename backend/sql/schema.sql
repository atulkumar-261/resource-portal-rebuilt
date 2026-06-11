-- Enterprise Resource Management System (RMS) PostgreSQL Schema DDL
-- Author: Senior Database Architect

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. MASTER / LOOKUP TABLES
-- ==========================================

CREATE TABLE countries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    iso_code VARCHAR(3) NOT NULL UNIQUE
);

CREATE TABLE states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country_id UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    state_code VARCHAR(10) NULL,
    CONSTRAINT uq_state_country UNIQUE (country_id, name)
);

CREATE TABLE cities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    state_id UUID NOT NULL REFERENCES states(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    CONSTRAINT uq_city_state UNIQUE (state_id, name)
);

CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE designations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);


CREATE TABLE skills_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) NULL
);

CREATE TABLE document_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT NULL
);

CREATE TABLE leave_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    max_days_allowed INT NOT NULL DEFAULT 0,
    is_paid BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE task_statuses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE -- 'pending', 'in-progress', 'completed', 'wanting-requirements'
);

CREATE TABLE resource_statuses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE -- 'pending', 'active', 'resigned', 'terminated'
);

CREATE TABLE project_statuses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE -- 'active', 'completed', 'on-hold'
);

CREATE TABLE notification_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE -- 'info', 'alert', 'warning', 'reminder'
);

-- ==========================================
-- 2. SECURITY / IDENTITY TABLES
-- ==========================================

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255) NULL
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255) NULL
);

CREATE TABLE role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    designation_id UUID NOT NULL REFERENCES designations(id),
    department_id UUID NOT NULL REFERENCES departments(id),
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(25) NULL,
    dob DATE NULL,
    ni_number VARCHAR(30) NULL UNIQUE,
    status_id UUID NOT NULL REFERENCES resource_statuses(id),
    avatar_url TEXT NULL,
    weekly_allowed_hours INT NOT NULL DEFAULT 35,
    performance_notes TEXT NULL,
    other_info TEXT NULL,
    skillset TEXT NULL,
    profile_completion_percentage INT NOT NULL DEFAULT 0,
    onboarding_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    approval_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    passport_number VARCHAR(100) NULL,
    passport_expiry DATE NULL,
    visa_number VARCHAR(100) NULL,
    visa_expiry DATE NULL,
    nationality VARCHAR(100) NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ NULL,
    deleted_by UUID NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(150) NULL,
    role_id UUID NOT NULL REFERENCES roles(id),
    resource_id UUID NULL REFERENCES resources(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE resources ADD CONSTRAINT fk_resources_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id);

CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token VARCHAR(512) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(255) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 3. RESOURCE MANAGEMENT RELATIONALS
-- ==========================================

CREATE TABLE resource_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE UNIQUE,
    current_address TEXT NOT NULL,
    city_id UUID NOT NULL REFERENCES cities(id),
    citizen_of_id UUID NOT NULL REFERENCES countries(id),
    previous_address TEXT NULL,
    last_changed_at TIMESTAMPTZ NULL,
    last_changed_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE resource_emergency_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE UNIQUE,
    contact_name VARCHAR(150) NOT NULL,
    phone VARCHAR(25) NOT NULL,
    email VARCHAR(255) NULL,
    address TEXT NULL
);

CREATE TABLE resource_bank_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE UNIQUE,
    bank_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    sort_code VARCHAR(20) NOT NULL
);

CREATE TABLE resource_skills (
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills_master(id) ON DELETE CASCADE,
    PRIMARY KEY (resource_id, skill_id)
);

CREATE TABLE document_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(255) NOT NULL,
    storage_key VARCHAR(255) NOT NULL UNIQUE,
    file_size INT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    entity_type VARCHAR(50) NULL,
    entity_id UUID NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE resource_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- ==========================================
-- 4. COMMERCIALS (CLIENTS & PROJECTS)
-- ==========================================

CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL UNIQUE,
    contact_person VARCHAR(150) NULL,
    email VARCHAR(255) NULL,
    phone VARCHAR(25) NULL,
    address TEXT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ NULL,
    deleted_by UUID NULL REFERENCES users(id)
);

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    client_id UUID NOT NULL REFERENCES clients(id),
    start_date DATE NOT NULL,
    end_date DATE NULL,
    status_id UUID NOT NULL REFERENCES project_statuses(id),
    description TEXT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ NULL,
    deleted_by UUID NULL REFERENCES users(id)
);

CREATE TABLE project_resources (
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, resource_id)
);

-- ==========================================
-- 5. TASK MANAGEMENT TABLES
-- ==========================================

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    resource_id UUID NOT NULL REFERENCES resources(id),
    project_id UUID NOT NULL REFERENCES projects(id),
    notes TEXT NULL,
    status_id UUID NOT NULL REFERENCES task_statuses(id),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ NULL,
    deleted_by UUID NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE task_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    comment_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 6. LEAVE MANAGEMENT TABLES
-- ==========================================

CREATE TABLE leave_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id),
    balance INT NOT NULL DEFAULT 0,
    CONSTRAINT uq_res_leave_type UNIQUE (resource_id, leave_type_id)
);

CREATE TABLE leaves (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id),
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    total_days INT NOT NULL,
    reason TEXT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ NULL,
    deleted_by UUID NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 7. TIMESHEET MANAGEMENT (NORMALIZED SPLIT)
-- ==========================================

CREATE TABLE timesheets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    week_end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'deleted', 'in draft'
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ NULL,
    deleted_by UUID NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE timesheet_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timesheet_id UUID NOT NULL REFERENCES timesheets(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id),
    work_date DATE NOT NULL,
    hours DECIMAL(4,2) NOT NULL DEFAULT 0.00,
    remarks TEXT NULL,
    CONSTRAINT uq_timesheet_proj_date UNIQUE (timesheet_id, project_id, work_date)
);

-- ==========================================
-- 8. WORKFLOW APPROVALS ENGINE
-- ==========================================

CREATE TABLE approval_workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    module_name VARCHAR(50) NOT NULL, -- 'leaves', 'timesheets', 'resources'
    description TEXT NULL
);

CREATE TABLE approval_workflow_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES approval_workflows(id) ON DELETE CASCADE,
    step_number INT NOT NULL,
    role_id UUID NOT NULL REFERENCES roles(id),
    CONSTRAINT uq_workflow_step UNIQUE (workflow_id, step_number)
);

CREATE TABLE approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_name VARCHAR(50) NOT NULL, -- 'leaves', 'timesheets', 'resources'
    record_id UUID NOT NULL,
    current_step_number INT NOT NULL DEFAULT 1,
    submitted_by UUID NOT NULL REFERENCES users(id),
    approved_by UUID NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    remarks TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 9. PAYROLL TABLES
-- ==========================================

CREATE TABLE payslips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    month VARCHAR(30) NOT NULL,
    days INT NOT NULL,
    notes TEXT NULL,
    amount DECIMAL(10,2) NOT NULL,
    file_attachment_id UUID NULL REFERENCES document_attachments(id),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ NULL,
    deleted_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 10. SYSTEM ANNOUNCEMENTS & CONFIG
-- ==========================================

CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    date DATE NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ NULL,
    deleted_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    description VARCHAR(255) NULL
);

CREATE TABLE report_exports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_name VARCHAR(100) NOT NULL,
    export_type VARCHAR(10) NOT NULL, -- 'excel', 'csv', 'pdf'
    attachment_id UUID NOT NULL REFERENCES document_attachments(id),
    requested_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 11. AUDIT & LOGGING TABLES
-- ==========================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    old_value JSONB NULL,
    new_value JSONB NULL,
    changed_fields JSONB NULL,
    user_id UUID NULL REFERENCES users(id),
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(255) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE login_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'success', 'failed_password', 'failed_username', 'locked'
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(255) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 12. HISTORY ARCHIVES
-- ==========================================

CREATE TABLE resource_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    changed_by UUID NOT NULL REFERENCES users(id),
    previous_value JSONB NOT NULL,
    new_value JSONB NOT NULL,
    changed_fields JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE project_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    changed_by UUID NOT NULL REFERENCES users(id),
    previous_value JSONB NOT NULL,
    new_value JSONB NOT NULL,
    changed_fields JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE task_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    changed_by UUID NOT NULL REFERENCES users(id),
    status_from VARCHAR(30) NOT NULL,
    status_to VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE document_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_document_id UUID NOT NULL REFERENCES resource_documents(id) ON DELETE CASCADE,
    changed_by UUID NOT NULL REFERENCES users(id),
    old_attachment_id UUID NULL REFERENCES document_attachments(id),
    new_attachment_id UUID NOT NULL REFERENCES document_attachments(id),
    version INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 13. NOTIFICATION INFRASTRUCTURE
-- ==========================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    module_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    action_url VARCHAR(255) NULL,
    priority VARCHAR(10) NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high'
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID NULL REFERENCES notifications(id) ON DELETE SET NULL,
    channel VARCHAR(20) NOT NULL, -- 'email', 'sms', 'push', 'in-app'
    recipient VARCHAR(255) NOT NULL,
    template_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'sent', 'failed', 'retry'
    retry_count INT NOT NULL DEFAULT 0,
    error_details TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 14. RECOMMENDED PERFORMANCE INDEXES
-- ==========================================

CREATE INDEX idx_resources_status ON resources(status_id);
CREATE INDEX idx_resources_deleted ON resources(is_deleted);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_timesheets_res_week ON timesheets(resource_id, week_end_date) WHERE is_deleted IS FALSE;
CREATE INDEX idx_timesheet_entries_ts ON timesheet_entries(timesheet_id);
CREATE INDEX idx_timesheet_entries_date ON timesheet_entries(work_date);
CREATE INDEX idx_tasks_res_status ON tasks(resource_id, status_id) WHERE is_deleted IS FALSE;
CREATE INDEX idx_leaves_res_date ON leaves(resource_id, from_date, to_date) WHERE is_deleted IS FALSE;
CREATE INDEX idx_approvals_module_record ON approvals(module_name, record_id);
CREATE INDEX idx_notifications_unread ON notifications(recipient_id, is_read) WHERE is_read IS FALSE;
CREATE INDEX idx_audit_logs_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_resource_skills_search ON resource_skills(skill_id);

-- ==========================================
-- 15. AI PROJECT PLANNING & ASSIGNMENTS
-- ==========================================

CREATE TABLE project_requirements (
    id SERIAL PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    module_name VARCHAR(255) NOT NULL,
    description TEXT,
    estimated_hours INTEGER,
    priority VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE project_skill_requirements (
    id SERIAL PRIMARY KEY,
    requirement_id INTEGER NOT NULL REFERENCES project_requirements(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills_master(id) ON DELETE CASCADE,
    required_level VARCHAR(50),
    mandatory BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE project_assignments (
    id SERIAL PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    requirement_id INTEGER NOT NULL REFERENCES project_requirements(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    assignment_type VARCHAR(50),
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ai_analysis_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    response JSONB NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_proj_req_proj ON project_requirements(project_id);
CREATE INDEX idx_proj_skill_req ON project_skill_requirements(requirement_id);
CREATE INDEX idx_proj_assign_proj_req ON project_assignments(project_id, requirement_id);
CREATE INDEX idx_ai_analysis_cache ON ai_analysis_results(project_id);

-- ==========================================
-- 16. AI TASKS INFRASTRUCTURE
-- ==========================================

CREATE TABLE project_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    requirement_id INTEGER NOT NULL REFERENCES project_requirements(id) ON DELETE CASCADE,
    resource_id UUID REFERENCES resources(id) ON DELETE SET NULL,
    parent_task_id UUID REFERENCES project_tasks(id) ON DELETE CASCADE,
    task_name VARCHAR(255) NOT NULL,
    description TEXT,
    estimated_hours INTEGER NOT NULL DEFAULT 0,
    actual_hours INTEGER NOT NULL DEFAULT 0,
    priority VARCHAR(50) DEFAULT 'Medium',
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'paused', 'completed'
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE task_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
    depends_on_task_id UUID NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
    CONSTRAINT uq_task_dependency UNIQUE (task_id, depends_on_task_id)
);

CREATE TABLE task_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
    resource_id UUID REFERENCES resources(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL, -- 'started', 'paused', 'completed', 'reopened'
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE task_schedule_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    planned_hours INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) DEFAULT 'planned'
);

CREATE TABLE task_time_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    hours_logged NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    logged_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_proj_tasks_proj ON project_tasks(project_id);
CREATE INDEX idx_proj_tasks_req ON project_tasks(requirement_id);
CREATE INDEX idx_proj_tasks_res ON project_tasks(resource_id);
CREATE INDEX idx_proj_tasks_parent ON project_tasks(parent_task_id);
CREATE INDEX idx_task_deps ON task_dependencies(task_id);
CREATE INDEX idx_task_activity ON task_activity_logs(task_id);
CREATE INDEX idx_task_schedule ON task_schedule_entries(task_id, resource_id, work_date);
CREATE INDEX idx_task_time ON task_time_logs(task_id, resource_id);

-- ==========================================
-- 17. AI DAILY REPORTING & FEEDBACK LOOP
-- ==========================================

CREATE TABLE daily_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    work_done TEXT,
    blockers TEXT,
    tomorrow_plan TEXT,
    hours_worked NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE daily_report_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
    hours_spent NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    completion_percent INTEGER NOT NULL DEFAULT 0,
    comments TEXT
);

CREATE TABLE report_analysis_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
    summary TEXT,
    progress_score INTEGER DEFAULT 0,
    risk_level VARCHAR(50) DEFAULT 'low',
    ai_response JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE report_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
    flag_type VARCHAR(100) NOT NULL,
    severity VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_daily_reports_res_date ON daily_reports(resource_id, work_date);
CREATE INDEX idx_daily_reports_proj ON daily_reports(project_id);
CREATE INDEX idx_daily_report_items_rep ON daily_report_items(report_id);
CREATE INDEX idx_daily_report_items_task ON daily_report_items(task_id);
CREATE INDEX idx_report_analysis_rep ON report_analysis_results(report_id);
CREATE INDEX idx_report_flags_rep ON report_flags(report_id);
CREATE INDEX idx_report_flags_type ON report_flags(flag_type);

