import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Simple pure-python .env loader to avoid external dependencies
def load_env(env_path: str):
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    key_val = line.split("=", 1)
                    if len(key_val) == 2:
                        os.environ[key_val[0].strip()] = key_val[1].strip()

# Load env variables
base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_env(os.path.join(base_dir, ".env"))

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:Atul@localhost:5432/rms_db")
JWT_SECRET = os.environ.get("JWT_SECRET", "AtulSecureSecretKey123!")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "D:\\rms-uploads")

# Ensure local upload dir exists
if not os.path.exists(UPLOAD_DIR):
    try:
        os.makedirs(UPLOAD_DIR)
    except Exception:
        pass

# Initialize database connections
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
