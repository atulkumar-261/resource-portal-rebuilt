import uvicorn
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

# Configure logging format and filters
from backend.app.middleware.request_context import RequestContextMiddleware, RequestIdFilter

logging_format = "%(asctime)s [%(levelname)s] [ReqID: %(request_id)s] %(name)s: %(message)s"
logging.basicConfig(level=logging.INFO, format=logging_format)

# Add filter to root logger and its handlers
root_logger = logging.getLogger()
id_filter = RequestIdFilter()
root_logger.addFilter(id_filter)
for handler in root_logger.handlers:
    handler.addFilter(id_filter)

# Import API Routers
from backend.app.api.auth import router as auth_router
from backend.app.api.admin_users import router as admin_users_router
from backend.app.api.resources import router as resources_router
from backend.app.api.org_structure import router as org_structure_router

from backend.app.api.documents import router as documents_router
from backend.app.api.leaves import router as leaves_router
from backend.app.api.tasks import router as tasks_router, task_resources_router
from backend.app.api.projects import router as projects_router
from backend.app.api.clients import router as clients_router
from backend.app.api.announcements import router as announcements_router
from backend.app.api.payslips import router as payslips_router
from backend.app.api.timesheets import router as timesheets_router
from backend.app.api.analytics import router as analytics_router
from backend.app.api.ai import router as ai_router
from backend.app.api.settings import router as settings_router
from backend.app.api.notifications import router as notifications_router
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

# Exception Handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    request_id = getattr(request.state, "request_id", "system")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.detail,
            "error_code": f"HTTP_{exc.status_code}",
            "request_id": request_id
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    request_id = getattr(request.state, "request_id", "system")
    errors = exc.errors()
    error_msg = "; ".join([f"{'.'.join(str(p) for p in err['loc'])}: {err['msg']}" for err in errors])
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "message": f"Validation failed: {error_msg}",
            "error_code": "VALIDATION_ERROR",
            "request_id": request_id
        }
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request, exc):
    request_id = getattr(request.state, "request_id", "system")
    logging.getLogger("backend.app.main").exception(f"Unhandled server error: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "An unexpected error occurred. Please contact system support.",
            "error_code": "INTERNAL_SERVER_ERROR",
            "request_id": request_id
        }
    )

# Register Middleware
app.add_middleware(RequestContextMiddleware)

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
app.include_router(task_resources_router, prefix="/api")
app.include_router(reports_resources_router, prefix="/api")
app.include_router(resources_router, prefix="/api")
app.include_router(org_structure_router, prefix="/api/resources/meta", tags=["Org Structure"])

app.include_router(documents_router, prefix="/api")
app.include_router(leaves_router, prefix="/api")
app.include_router(tasks_router, prefix="/api")
app.include_router(projects_router, prefix="/api")
app.include_router(clients_router, prefix="/api")
app.include_router(announcements_router, prefix="/api")
app.include_router(payslips_router, prefix="/api")
app.include_router(timesheets_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(ai_router, prefix="/api")
app.include_router(settings_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")
app.include_router(reports_router, prefix="/api")
app.include_router(reports_projects_router, prefix="/api")

# Mount Static Uploads Directory
app.mount("/uploads", StaticFiles(directory="backend/uploads"), name="uploads")

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "Resource Management System API",
        "documentation": "/docs"
    }

if __name__ == "__main__":
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
