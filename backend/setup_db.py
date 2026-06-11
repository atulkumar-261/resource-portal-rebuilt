import os
import sys
import hashlib
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# PostgreSQL admin connection credentials
DB_HOST = "localhost"
DB_PORT = "5432"
DB_USER = "postgres"
DB_PASSWORD = "Atul"
TARGET_DB = "rms_db"

def hash_password(password: str) -> str:
    # Sha256 hashing as a fallback setup configuration
    return hashlib.sha256(password.encode()).hexdigest()

def ensure_bootstrap_upgrades(cursor):
    cursor.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(150)")
    cursor.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ NULL")
    cursor.execute("ALTER TABLE resources ADD COLUMN IF NOT EXISTS skillset TEXT NULL")
    cursor.execute("ALTER TABLE resources ADD COLUMN IF NOT EXISTS profile_completion_percentage INTEGER DEFAULT 0")
    cursor.execute("ALTER TABLE resources ADD COLUMN IF NOT EXISTS onboarding_status VARCHAR(50) DEFAULT 'pending'")
    cursor.execute("ALTER TABLE resources ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'pending'")
    cursor.execute("ALTER TABLE resources ADD COLUMN IF NOT EXISTS passport_number VARCHAR(100)")
    cursor.execute("ALTER TABLE resources ADD COLUMN IF NOT EXISTS passport_expiry DATE")
    cursor.execute("ALTER TABLE resources ADD COLUMN IF NOT EXISTS visa_number VARCHAR(100)")
    cursor.execute("ALTER TABLE resources ADD COLUMN IF NOT EXISTS visa_expiry DATE")
    cursor.execute("ALTER TABLE resources ADD COLUMN IF NOT EXISTS nationality VARCHAR(100)")
    cursor.execute("ALTER TABLE departments ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE")
    cursor.execute("ALTER TABLE designations ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE")
    cursor.execute("ALTER TABLE document_attachments ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50) NULL")
    cursor.execute("ALTER TABLE document_attachments ADD COLUMN IF NOT EXISTS entity_id UUID NULL")
    cursor.execute("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE")
    cursor.execute("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL")
    cursor.execute("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS deleted_by UUID NULL REFERENCES users(id) ON DELETE SET NULL")
    cursor.execute("ALTER TABLE payslips ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE")
    cursor.execute("ALTER TABLE payslips ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL")
    cursor.execute("ALTER TABLE payslips ADD COLUMN IF NOT EXISTS deleted_by UUID NULL REFERENCES users(id) ON DELETE SET NULL")
    cursor.execute("ALTER TABLE resource_addresses ADD COLUMN IF NOT EXISTS previous_address TEXT NULL")
    cursor.execute("ALTER TABLE resource_addresses ADD COLUMN IF NOT EXISTS last_changed_at TIMESTAMPTZ NULL")
    cursor.execute("ALTER TABLE resource_addresses ADD COLUMN IF NOT EXISTS last_changed_by UUID NULL REFERENCES users(id) ON DELETE SET NULL")

    # Align legacy resources: if onboarding or approval is pending, enforce 'pending' status in DB
    cursor.execute("""
        UPDATE resources
        SET status_id = (SELECT id FROM resource_statuses WHERE name = 'pending')
        WHERE (approval_status = 'pending' OR onboarding_status = 'pending')
          AND status_id != (SELECT id FROM resource_statuses WHERE name = 'pending')
    """)


    # Check if resource_documents table is using the old schema or need recreation
    cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name='resource_documents' AND column_name='document_type'")
    col = cursor.fetchone()
    if not col:
        print("Recreating resource_documents table to use simplified structure...")
        cursor.execute("DROP TABLE IF EXISTS resource_documents CASCADE;")
        cursor.execute("""
            CREATE TABLE resource_documents (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
                document_type VARCHAR(50) NOT NULL,
                file_name VARCHAR(255) NOT NULL,
                file_path TEXT NOT NULL,
                uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL
            );
        """)

def create_database():
    try:
        # Connect to default postgres database to run administrative queries
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            database="postgres"
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()

        # Check if database already exists
        cursor.execute("SELECT 1 FROM pg_catalog.pg_database WHERE datname = %s", (TARGET_DB,))
        exists = cursor.fetchone()
        
        if not exists:
            print(f"Creating database '{TARGET_DB}'...")
            cursor.execute(f"CREATE DATABASE {TARGET_DB}")
            print(f"Database '{TARGET_DB}' created successfully.")
        else:
            print(f"Database '{TARGET_DB}' already exists.")

        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error connecting/creating database: {e}")
        sys.exit(1)

def run_schema_and_seed():
    try:
        # Connect to target rms_db database
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            database=TARGET_DB
        )
        cursor = conn.cursor()

        # Read schema.sql
        script_dir = os.path.dirname(os.path.abspath(__file__))
        schema_path = os.path.join(script_dir, "sql", "schema.sql")
        
        if not os.path.exists(schema_path):
            print(f"Schema file not found at: {schema_path}")
            return
            
        print("Running SQL DDL schema...")
        with open(schema_path, "r") as f:
            schema_sql = f.read()
            
        # Execute schema SQL DDL
        try:
            cursor.execute(schema_sql)
            conn.commit()
            print("Schema successfully executed.")
        except Exception as e:
            if "already exists" not in str(e):
                raise
            conn.rollback()
            print("Existing schema detected. Continuing with bootstrap upgrades.")

        ensure_bootstrap_upgrades(cursor)
        conn.commit()

        # Seed Master Lookups
        print("Seeding database lookup tables...")

        # 1. Seed Roles
        roles = [
            ("super_admin", "System owner with privileged admin management access"),
            ("admin", "Operational RMS Administrator"),
            ("resource", "Regular Resource Employee")
        ]
        for name, desc in roles:
            cursor.execute(
                "INSERT INTO roles (name, description) VALUES (%s, %s) ON CONFLICT (name) DO NOTHING",
                (name, desc)
            )

        # 2. Seed Resource Statuses
        res_statuses = ["pending", "active", "resigned", "terminated", "inactive"]
        for name in res_statuses:
            cursor.execute(
                "INSERT INTO resource_statuses (name) VALUES (%s) ON CONFLICT (name) DO NOTHING",
                (name,)
            )

        # 3. Seed Task Statuses
        task_statuses = ["pending", "in-progress", "completed", "wanting-requirements"]
        for name in task_statuses:
            cursor.execute(
                "INSERT INTO task_statuses (name) VALUES (%s) ON CONFLICT (name) DO NOTHING",
                (name,)
            )

        # 4. Seed Project Statuses
        proj_statuses = ["active", "completed", "on-hold"]
        for name in proj_statuses:
            cursor.execute(
                "INSERT INTO project_statuses (name) VALUES (%s) ON CONFLICT (name) DO NOTHING",
                (name,)
            )

        # 5. Seed Document Types
        doc_types = ["CV", "Passport", "Visa", "Holiday Sheet", "Other"]
        for name in doc_types:
            cursor.execute(
                "INSERT INTO document_types (name) VALUES (%s) ON CONFLICT (name) DO NOTHING",
                (name,)
            )

        # 6. Seed Leave Types
        leave_types = [
            ("Annual", 28, True),
            ("Sick", 10, True),
            ("Unpaid", 0, False),
            ("Casual", 5, True)
        ]
        for name, max_days, is_paid in leave_types:
            cursor.execute(
                "INSERT INTO leave_types (name, max_days_allowed, is_paid) VALUES (%s, %s, %s) ON CONFLICT (name) DO NOTHING",
                (name, max_days, is_paid)
            )

        # 6a. Seed Departments
        depts = [
            ("Engineering", "Software product engineering division"),
            ("Product Management", "Product lifecycle and design coordination"),
            ("Design", "Creative and user experience design"),
            ("Marketing", "Marketing and branding campaigns"),
            ("HR", "Human resources and personnel operations"),
            ("Operations", "Internal logistics and project support")
        ]
        for name, desc in depts:
            cursor.execute(
                "INSERT INTO departments (name, description) VALUES (%s, %s) ON CONFLICT (name) DO NOTHING",
                (name, desc)
            )

        # 6b. Seed Designations
        desigs = [
            ("Software Engineer", "Core code developers and technical experts"),
            ("Quality Analyst", "Testing and quality assurance specialists"),
            ("Product Manager", "Product lifecycle managers"),
            ("UX Designer", "User interface and experience designers"),
            ("HR Specialist", "Human resources management"),
            ("Marketing Associate", "Marketing coordinators")
        ]
        for title, desc in desigs:
            cursor.execute(
                "INSERT INTO designations (title, description) VALUES (%s, %s) ON CONFLICT (title) DO NOTHING",
                (title, desc)
            )

        # 7. Create Default Super Admin User
        cursor.execute("SELECT id FROM roles WHERE name = 'super_admin'")
        admin_role_id = cursor.fetchone()[0]

        admin_username = "superadmin"
        admin_email = "superadmin@magnificit.com"
        admin_pass_hash = hash_password("superadmin123")  # Default password: superadmin123

        cursor.execute(
            "INSERT INTO users (username, password_hash, email, full_name, role_id, is_active) VALUES (%s, %s, %s, %s, %s, TRUE) ON CONFLICT (username) DO NOTHING",
            (admin_username, admin_pass_hash, admin_email, "Super Admin", admin_role_id)
        )

        cursor.execute("""
            SELECT COUNT(*)
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE r.name = 'super_admin' AND u.is_active = TRUE
        """)
        if cursor.fetchone()[0] == 0:
            cursor.execute(
                "UPDATE users SET role_id = %s, full_name = COALESCE(full_name, %s), is_active = TRUE WHERE username = %s",
                (admin_role_id, "Super Admin", admin_username)
            )

        conn.commit()
        print("Master lookups successfully seeded.")
        print("\nDefault Super Admin Account Ready:")
        print("Username: superadmin")
        print("Password: superadmin123")

        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error running DDL/Seeding database: {e}")
        sys.exit(1)

if __name__ == "__main__":
    print("Starting database installation...")
    create_database()
    run_schema_and_seed()
    print("Database installation completed successfully!")
