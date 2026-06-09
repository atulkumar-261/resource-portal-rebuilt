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
- **Resource Lifecycle & Onboarding:** Create resources, auto-generate their credentials, and track their profile completion. Resources must upload documents (CV, Passport) and reach 80% completion before admins can approve them.
- **Admin Dashboards:** View real-time widgets showing resources pending onboarding, resources awaiting admin approval, and highly overutilized resources.
- **Project & Task Management:** Create projects, track specific requirements, assign resources, and utilize daily timesheets.
- **AI Task Intelligence:** Features a daily task scheduler and workload balancing engine to ensure no resource is assigned >90% of their weekly capacity.

## 📁 Project Architecture Map

If you want to explore the code, here is where everything lives:
```text
MagnificIT/resource-portal-rebuilt/
├── backend/                  # Python FastAPI Backend
│   ├── app/
│   │   ├── api/              # API Route Handlers (auth, resources, tasks)
│   │   ├── models/           # SQLAlchemy DB Schemas
│   │   └── services/         # Business logic and AI services
│   ├── main.py               # Backend entry point
│   └── setup_db.py           # Database seeder script
├── src/                      # React Frontend
│   ├── components/           # Reusable UI components (shadcn/ui)
│   ├── lib/                  # Global Store (Zustand) & API fetchers
│   └── routes/               # TanStack File-Based Routes
├── vite.config.ts            # Vite Configuration
└── package.json              # Frontend NPM Dependencies
```
