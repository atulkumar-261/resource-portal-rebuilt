# Magnific IT - Resource Management System (RMS)

Welcome to the **Magnific IT Resource Management System**. This is a full-stack enterprise application built with React (Frontend) and FastAPI (Backend). 

If you have just cloned this repository, follow this step-by-step guide to get the project running on your local machine.

---

## 🚀 Quick Setup & Installation Guide

### Step 1: Prerequisites
Before you begin, ensure you have the following installed on your machine:
- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **Python** (v3.10 or higher) - [Download](https://www.python.org/downloads/)
- **PostgreSQL** (v14 or higher) - [Download](https://www.postgresql.org/download/)

### Step 2: Database Configuration
1. Open pgAdmin or your PostgreSQL CLI.
2. Create a new empty database named `rms_db`.
3. In the root of the `backend` folder, locate or create a `.env` file.
4. Add the following connection string and secret keys to your `.env` file (update `postgres:password` with your actual local database username and password):
   ```env
   DATABASE_URL=postgresql://postgres:password@localhost:5432/rms_db
   JWT_SECRET=YourSuperSecureSecretKey123!
   ACCESS_TOKEN_EXPIRE_MINUTES=15
   UPLOAD_DIR=D:\rms-uploads
   ```
   *(Note: Ensure the `UPLOAD_DIR` path exists on your machine, or create the folder manually, as this is where uploaded CVs and Passports will be stored).*

### Step 3: Start the Backend (Python / FastAPI)
The backend manages the database, authentication, and AI features. You need to run it in its own terminal window.

1. Open a terminal and navigate to the project root folder.
2. Create a virtual environment to install dependencies cleanly:
   ```bash
   python -m venv venv
   ```
3. Activate the virtual environment:
   - **Windows:** `.\venv\Scripts\activate`
   - **Mac/Linux:** `source venv/bin/activate`
4. Install all required Python packages:
   ```bash
   pip install -r backend/requirements.txt
   ```
5. **CRITICAL:** Run the database seeder to create all the necessary database tables, roles, and the default super-admin account:
   ```bash
   python backend/setup_db.py
   ```
6. Start the backend server:
   ```bash
   python -m uvicorn backend.main:app --reload
   ```
   *You should see `Application startup complete` in the terminal. Leave this terminal open and running!*

### Step 4: Start the Frontend (React / Vite)
The frontend provides the user interface. You need to run it in a **second, separate terminal window**.

1. Open a new terminal and navigate to the project root folder.
2. Install the Node modules:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open your browser and go to the link shown in the terminal (usually `http://localhost:3000` or `http://localhost:8080`).

### Step 5: Log In! 🎉
You can now log in using the default Super Admin credentials created during Step 3:
- **Login ID:** `superadmin`
- **Password:** `superadmin123`

---

## 🌟 What's Included in this System?

Once you are logged in, you will have access to:
- **Resource Lifecycle & Onboarding Dashboard:** Admins can create resources, automatically generate credentials, and monitor profile completion.
- **Profile Completion & Onboarding Guard:**
  - Standard resources have their main sidebar locked (🔓) with locked icons on all sections (Dashboard, Timesheets, Leaves, Tasks, Reports, Calendar, Payslips, Announcements) until their **Profile Completion reaches at least 80%** or their onboarding status is approved by an Admin.
  - To prevent layout clutter and security issues, standard users cannot upload documents (CV, Passport, Visa) directly from their profiles. Instead, these documents are uploaded and managed by Admins. Standard users must fill out their basic, address, emergency contact, bank, and skillset details to hit the 80% completion requirement.
- **Strict Contact Number Validation:** Enforces country code selection (e.g. `+` + up to 4 digits) and exactly 10 digits for local numbers. Restricts any non-numeric entries (except the `+` prefix) and checks validation on submission to avoid database format contamination.
- **Admin & Super Admin Controls:** Manage clients, projects, system admins, resource assignments, workload heatmaps, leave requests, and payslips.
- **Project & Task Management:** Create projects, define functional requirements, assign resources, and utilize automated daily timesheets.
- **AI Task Intelligence:** Includes an AI-powered daily task scheduler and workload balancing engine to ensure no resource is assigned more than 90% of their weekly capacity.

## 🔒 Security Hardening & Production-Ready Architecture

The system has been fully audited and secured under production-grade standards:
- **Database Session Isolation:** Offloads heavy background processing (like AI report analysis and notification alerts) to localized sessions using context managers, preventing request-scoped connection pools from dying.
- **Audit Logging Savepoint Isolation:** All audit writes utilize savepoint nesting (`db.begin_nested()`). This ensures any audit logging write failure is rolled back locally and does not contaminate or rollback primary business transactions.
- **Project Assignment Enforcement:** Standard resource users are blocked from viewing unassigned projects or task details (preventing IDOR leaks). Resource requests are verified against `ProjectAssignment` records and return `403 Access Denied` on validation failure.
- **File Upload Security Framework:** Centralized validation (`file_security.py`) enforces:
  - 10MB file size limit.
  - Strict format extension whitelist (`.pdf`, `.doc`, `.docx`, `.png`, `.jpg`, `.jpeg`, `.xlsx`, `.xls`).
  - MIME-type verification and filename sanitization.
  - Path traversal checks to prevent directory escaping.
  - Immediate cleanup (unlinking) of saved files if nested database writes fail.
- **Transaction Safety & Rollbacks:** All critical database writes across admin routes, projects, and tasks are wrapped in robust try/except blocks that trigger `db.rollback()` on error to maintain absolute database integrity.
- **Query Optimization:** Implemented eager relation loading (`joinedload` and `selectinload`) on timesheet and report list endpoints to eliminate performance bottlenecks caused by N+1 queries.

## 📁 Project Architecture Map

If you want to explore the code, here is where everything lives:
```text
MagnificIT/resource-portal-rebuilt/
├── backend/                  # Python FastAPI Backend
│   ├── app/
│   │   ├── api/              # API Route Handlers (auth, resources, tasks, org_structure)
│   │   ├── core/             # Security configs, JWT handlers, and file_security.py
│   │   ├── models/           # SQLAlchemy DB Models
│   │   └── services/         # Business logic, progress calculation, and AI services
│   ├── main.py               # Backend entry point
│   └── setup_db.py           # Database seeder script
├── src/                      # React Frontend
│   ├── components/           # Reusable UI components & layouts (AppShell)
│   ├── lib/                  # Global Store (Zustand) & API fetchers
│   └── routes/               # TanStack File-Based Routes (user.profile.tsx, admin.*)
├── vite.config.ts            # Vite Configuration
└── package.json              # Frontend NPM Dependencies
```
