# Magnific IT — Resource Management System (RMS)

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.0%2B-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](#)

Welcome to the **Magnific IT Resource Management System (RMS)**. RMS is an enterprise-grade, on-premises solution designed for secure employee onboarding, timesheet submissions, leave approvals, automated task planning, and AI-driven daily reporting compliance.

RMS combines a modern **React + TypeScript + Zustand + TanStack Router** frontend with a robust, production-hardened **FastAPI + SQLAlchemy + PostgreSQL** backend.

---

## 🏗️ System Architecture

```mermaid
graph TD
    Client[React Frontend Client] -->|HTTP Requests / JSON / ReqID| API[FastAPI Web Server]
    API -->|SQLAlchemy ORM / Transactions| DB[(PostgreSQL Database)]
    API -->|Background Tasks| Analyzer[AI Report Analyzer]
    API -->|Background Tasks| Notifier[Report Notification Service]
    API -->|Local Filesystem| Uploads[Storage: backend/uploads]
    Analyzer -.->|Async Update| DB
    Notifier -.->|In-App / Email Log| DB
```

---

## 🌟 Key Product Features

*   **🔒 Onboarding & Profile Completion Guard**:
    *   Resources are locked out of the main navigation drawer with locked icons (🔒) on all screens until their Profile Completion percentage reaches **80% or higher** or an administrator manually grants onboarding approval.
    *   Resources can update address, bank, and skillset details. To maintain compliance, sensitive documents (CVs, passports, visas) are uploaded and managed exclusively by administrators.
*   **🤖 AI-Powered Task Scheduler**:
    *   Automated daily task assignment based on capacity constraints (resource workload limits are capped at $90\%$ of weekly capacity to prevent burn-out).
    *   Live calendar schedules and resource workload heatmaps for administrators.
*   **📝 Daily Reports & AI Audit Loop**:
    *   Developers submit daily work logs linked directly to tasks.
    *   Submissions trigger an asynchronous background task using **ReportAnalyzer (LLM)** to audit vagueness, identify blockers, verify completion scores, and flag policy violations.
*   **⏰ Timesheets & Leave Management**:
    *   Weekly timesheet submission with a weekday submission streak counter and grace period tracking.
    *   Multi-stage workflow approvals engine for timesheets and leave requests.
*   **📊 Payslips & Announcement Modules**:
    *   Admin-uploadable monthly payslips with document attachment relationships.
    *   Broadcasting announcements with rich-text messages and file attachments.

---

## 🔒 Production Hardening & Security Measures

RMS is built for enterprise environments with a zero-compromise security posture:

*   **⚡ Transaction Safety Layer (`transactional`)**:
    *   All write/mutation API endpoints are wrapped in a robust, atomic context manager. Any exception mid-request rolls back database mutations, ensuring absolute database consistency.
*   **🏷️ Correlation ID Tracking (Request ID)**:
    *   Every HTTP request is assigned a unique UUID4 `X-Request-ID` middleware tag.
    *   Request IDs automatically propagate through FastAPI context logs and standard error responses for seamless debugging.
*   **🗄️ Isolated Audit Logging**:
    *   System mutations are captured in `audit_logs` using nested transaction savepoints (`db.begin_nested()`).
    *   If an audit log record fails to save, it rolls back locally and does not interrupt or compromise the parent business transaction.
*   **📂 Structured File Security Framework**:
    *   Enforces a strict 10MB file size limit.
    *   MIME-type checks and extension validation whitelist (`.pdf`, `.doc`, `.docx`, `.png`, `.jpg`, `.jpeg`, `.xlsx`, `.xls`).
    *   Verifies target paths against directory traversal attempts (`verify_path_traversal`).
    *   Ensures disk files are deleted instantly if the database transaction fails.
*   **🏎️ Optimized Query Layer (N+1 Query Prevention)**:
    *   Employs SQLAlchemy `joinedload()` and `selectinload()` across high-traffic lists, analytics KPIs, and report-gap audits.
    *   Reduces database roundtrips from $O(N)$ to static, predictable queries (e.g., team logs gaps checklist down to exactly 3 queries).
*   **🔑 Session & Login Logging**:
    *   Logs successful and failed authentication attempts in `login_activities` capturing timestamps, username, client IP addresses, and user-agent strings.

---

## 🚀 Installation & Local Development Setup

Follow these steps to configure and boot the application on your local machine.

### 1. Prerequisites
Ensure you have the following installed:
*   **Node.js** (v18 or higher) — [Download](https://nodejs.org/)
*   **Python** (v3.10 or higher) — [Download](https://www.python.org/downloads/)
*   **PostgreSQL** (v14 or higher) — [Download](https://www.postgresql.org/download/)

### 2. Environment Variables Configuration
Create a `.env` file in the root of the `backend/` directory:
```env
DATABASE_URL=postgresql://postgres:Atul@localhost:5432/rms_db
JWT_SECRET=AtulSecureSecretKey123!
ACCESS_TOKEN_EXPIRE_MINUTES=15
UPLOAD_DIR=D:\rms-uploads
```
> [!NOTE]
> Make sure the folder specified in `UPLOAD_DIR` exists on your system or the backend has write privileges to create it. This is where file attachments (payslips, CVs, announcements) are stored.

### 3. Backend Setup (FastAPI)
Open a terminal in the project root:
```bash
# 1. Create Python Virtual Environment
python -m venv venv

# 2. Activate Virtual Environment
# On Windows:
.\venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# 3. Install Python Dependencies
pip install -r backend/requirements.txt

# 4. Initialize Database Schema and Seed Initial Admin Account
python backend/setup_db.py

# 5. Start Backend Uvicorn Server
python -m uvicorn backend.app.main:app --reload
```
The API is now running locally on `http://localhost:8000`. You can inspect the interactive Swagger API docs at `http://localhost:8000/docs`.

### 4. Frontend Setup (React)
Open a **new terminal window** in the project root:
```bash
# 1. Install frontend Node packages
npm install

# 2. Start Vite Dev Server
npm run dev
```
The client portal is now running locally on `http://localhost:3000` (or the local port shown in your terminal).

### 5. Default Credentials
Log in with the automatically seeded Super Admin account:
*   **Username**: `superadmin`
*   **Password**: `superadmin123`

---

## 💾 Database Backup & Disaster Recovery

For on-premises administrators, RMS includes automated scripts and guidelines to manage scheduled dumps and restores.

*   **Guide**: Documented in [docs/backup_restore.md](file:///d:/MagnificIT/resource-portal-rebuilt/docs/backup_restore.md)
*   **Scripts**: Located in [scripts/](file:///d:/MagnificIT/resource-portal-rebuilt/scripts)
    *   PowerShell (Windows): `backup_database.ps1` & `restore_database.ps1`
    *   Bash (Linux/Unix): `backup_database.sh` & `restore_database.sh`

---

## 📁 Repository Structure

```text
MagnificIT/resource-portal-rebuilt/
├── backend/                  # FastAPI Application Code
│   ├── app/
│   │   ├── api/              # API router endpoints
│   │   ├── core/             # Security, JWT, file_security.py
│   │   ├── middleware/       # Context/Logging correlation ID middleware
│   │   ├── models/           # SQLAlchemy DB Models (database.py)
│   │   └── services/         # Progress metrics, transaction context, audit services
│   ├── sql/                  # Database schema DDL
│   ├── main.py               # Application startup entrypoint
│   └── setup_db.py           # Database seeder script
├── docs/                     # Administrative guides
├── scripts/                  # Operations & backup scripts
├── src/                      # React Frontend App
│   ├── components/           # UI elements & page layout wrappers
│   ├── lib/                  # State management store (Zustand) & fetchers
│   └── routes/               # TanStack router view pages
├── package.json              # Node dependencies definition
└── tsconfig.json             # TypeScript compiler rules
```

---

## 🛠️ Maintenance & Verification Commands

Keep code compilation and static checks green before pushing changes:

*   **Verify Backend Imports & Compilation**:
    ```bash
    python -m compileall backend
    ```
*   **Verify TypeScript Compilation (Frontend)**:
    ```bash
    npx tsc --noEmit
    ```
*   **Update Codebase Knowledge Graph**:
    ```bash
    graphify update .
    ```
