import sys
import os

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

try:
    print("Testing importing main application...")
    from backend.app.main import app
    print("Main app imported successfully!")
    
    print("\nTesting importing all api routers...")
    from backend.app.api.auth import router as r_auth
    from backend.app.api.admin_users import router as r_admin
    from backend.app.api.resources import router as r_res
    from backend.app.api.tasks import router as r_tasks
    from backend.app.api.projects import router as r_projects
    from backend.app.api.clients import router as r_clients
    from backend.app.api.announcements import router as r_ann
    from backend.app.api.payslips import router as r_pay
    from backend.app.api.timesheets import router as r_time
    from backend.app.api.analytics import router as r_an
    from backend.app.api.ai import router as r_ai
    from backend.app.api.reports import router as r_rep
    from backend.app.api.settings import router as r_set
    from backend.app.api.notifications import router as r_notif
    print("All routers imported successfully!")
    
    print("\nImport tests passed successfully!")
    sys.exit(0)
except Exception as e:
    import traceback
    print("Import failed!")
    traceback.print_exc()
    sys.exit(1)
