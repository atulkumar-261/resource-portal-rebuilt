import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import API Routers
from backend.app.api.auth import router as auth_router
from backend.app.api.admin_users import router as admin_users_router
from backend.app.api.resources import router as resources_router
from backend.app.api.documents import router as documents_router
from backend.app.api.leaves import router as leaves_router
from backend.app.api.tasks import router as tasks_router, projects_router, task_resources_router
from backend.app.api.timesheets import router as timesheets_router
from backend.app.api.analytics import router as analytics_router
from backend.app.api.ai import router as ai_router
from backend.app.api.reports import (
    router as reports_router,
    projects_router as reports_projects_router,
    resources_router as reports_resources_router
)

app = FastAPI(
    title="Resource Management System (RMS) API",
    description="Enterprise on-premises backend for resource onboarding, compliance tracking, leaves, and timesheets.",
    version="1.0.0"
)

# Configure CORS for local frontend client communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth_router, prefix="/api")
app.include_router(admin_users_router, prefix="/api")
app.include_router(resources_router, prefix="/api")
app.include_router(documents_router, prefix="/api")
app.include_router(leaves_router, prefix="/api")
app.include_router(tasks_router, prefix="/api")
app.include_router(projects_router, prefix="/api")
app.include_router(task_resources_router, prefix="/api")
app.include_router(timesheets_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(ai_router, prefix="/api")
app.include_router(reports_router, prefix="/api")
app.include_router(reports_projects_router, prefix="/api")
app.include_router(reports_resources_router, prefix="/api")

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "Resource Management System API",
        "documentation": "/docs"
    }

if __name__ == "__main__":
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
