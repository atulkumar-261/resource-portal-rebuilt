import io
import base64
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.config import get_db_session
from backend.app.models.database import Resource

client = TestClient(app)

# Login to get token
print("Logging in...")
login_resp = client.post("/api/auth/login", json={"username": "superadmin", "password": "superadmin123"})
if login_resp.status_code != 200:
    print("Login failed:", login_resp.text)
    exit(1)

token = login_resp.json().get("token")
headers = {"Authorization": f"Bearer {token}"}

db = next(get_db_session())
res = db.query(Resource).filter(Resource.is_deleted == False).first()
if not res:
    print("No active resource found in DB to run test against.")
    exit(1)

print(f"Testing with resource: {res.full_name} ({res.id})")

# 1. Test standard document upload (small)
print("\n--- 1. Testing small document upload (application/pdf) ---")
small_pdf = io.BytesIO(b"%PDF-1.4 ... dummy content ...")
files = {"file": ("test_cv.pdf", small_pdf, "application/pdf")}
data = {"document_type": "cv", "resource_id": str(res.id)}
resp = client.post("/api/resources/documents/upload", headers=headers, data=data, files=files)
print("Status:", resp.status_code)
print("Response:", resp.json())
assert resp.status_code == 200 or resp.status_code == 201, "Small PDF upload should succeed"

# 2. Test document upload with size > 10MB
print("\n--- 2. Testing large document upload (> 10MB) ---")
large_data = b"x" * (10 * 1024 * 1024 + 1024)  # 10MB + 1KB
large_pdf = io.BytesIO(large_data)
files = {"file": ("large_cv.pdf", large_pdf, "application/pdf")}
data = {"document_type": "cv", "resource_id": str(res.id)}
resp = client.post("/api/resources/documents/upload", headers=headers, data=data, files=files)
print("Status:", resp.status_code)
print("Response:", resp.json())
assert resp.status_code == 400, "Large PDF upload should be rejected"
assert "File size cannot exceed 10MB." in resp.json()["detail"]

# 3. Test document upload with invalid MIME type
print("\n--- 3. Testing invalid MIME type document upload ---")
dummy_exe = io.BytesIO(b"MZ...")
files = {"file": ("test.exe", dummy_exe, "application/x-msdownload")}
data = {"document_type": "cv", "resource_id": str(res.id)}
resp = client.post("/api/resources/documents/upload", headers=headers, data=data, files=files)
print("Status:", resp.status_code)
print("Response:", resp.json())
assert resp.status_code == 400, "Invalid MIME type upload should be rejected"
assert "Unsupported file type." in resp.json()["detail"]

# 4. Test base64 avatar size validation (small)
print("\n--- 4. Testing small avatar upload (base64) ---")
small_avatar = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
payload = {"avatar_url": small_avatar}
resp = client.put(f"/api/resources/{res.id}", headers=headers, json=payload)
print("Status:", resp.status_code)
assert resp.status_code == 200, "Small avatar upload should succeed"

# 5. Test base64 avatar size validation (large)
print("\n--- 5. Testing large avatar upload (base64 > 10MB) ---")
# Generate base64 string that decodes to > 10MB
large_avatar_bytes = b"x" * (10 * 1024 * 1024 + 1024)
large_avatar_b64 = base64.b64encode(large_avatar_bytes).decode("utf-8")
large_avatar = f"data:image/png;base64,{large_avatar_b64}"
payload = {"avatar_url": large_avatar}
resp = client.put(f"/api/resources/{res.id}", headers=headers, json=payload)
print("Status:", resp.status_code)
print("Response:", resp.json())
assert resp.status_code == 400, "Large avatar upload should be rejected"
assert "Profile picture size cannot exceed 10MB." in resp.json()["detail"]

print("\nAll backend upload validation tests passed successfully!")
