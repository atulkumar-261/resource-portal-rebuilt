# Database & Uploads Backup and Recovery Guide

This guide details the procedures for backing up and restoring the PostgreSQL database and uploaded files (profile avatars, payslips, contract documents, etc.) in the Resource Management System (RMS).

---

## Configuration

Backup and restore scripts read database credentials and uploads directory settings directly from the FastAPI configuration environment (`backend/.env`). 

Ensure the following variables are configured:
* `DATABASE_URL`: Connection string containing the user, password, host, port, and database name.
  * *Example: `postgresql://postgres:Password123@localhost:5432/rms_db`*
* `UPLOAD_DIR`: Target path for uploaded resources (falls back to `backend/uploads` if unset).

---

## 1. Automated Scripts

We provide automated scripts for both Windows PowerShell and Unix/Linux Shell environments inside the [scripts/](file:///d:/MagnificIT/resource-portal-rebuilt/scripts) folder.

### Windows (PowerShell)

#### Backup
To back up the database and uploads directory:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\backup_database.ps1
```
* Generates compressed database dump `rms_db_YYYYMMDD_HHMMSS.dump` and compressed uploads zip `rms_uploads_YYYYMMDD_HHMMSS.zip` in `backups/`.
* Automatically rotates and removes backup files older than 7 days.

#### Restore
To restore the latest available backup in the `backups/` directory:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\restore_database.ps1
```

To restore specific backup files:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\restore_database.ps1 -dbBackup "..\backups\rms_db_20260611_120000.dump" -uploadsBackup "..\backups\rms_uploads_20260611_120000.zip"
```

---

### Unix / Linux / macOS (Shell)

Make the scripts executable first:
```bash
chmod +x scripts/*.sh
```

#### Backup
```bash
./scripts/backup_database.sh
```

#### Restore
Restore the latest backups:
```bash
./scripts/restore_database.sh
```

Restore specific backup files:
```bash
./scripts/restore_database.sh backups/rms_db_20260611_120000.dump backups/rms_uploads_20260611_120000.zip
```

---

## 2. Manual Backup & Restore Procedures

If automated scripts are unavailable, execute database commands manually:

### Manual Database Backup
Using custom format dump (`-Fc`) to optimize speed and enable parallel restores:
```bash
pg_dump -h localhost -p 5432 -U postgres -F c -b -v -f rms_db_backup.dump rms_db
```

### Manual Database Restore
1. Terminate other connections to the database to prevent locks:
   ```sql
   SELECT pg_terminate_backend(pg_stat_activity.pid) 
   FROM pg_stat_activity 
   WHERE pg_stat_activity.datname = 'rms_db' AND pid <> pg_backend_pid();
   ```
2. Recreate the database structure and load data:
   ```bash
   dropdb -h localhost -p 5432 -U postgres rms_db
   createdb -h localhost -p 5432 -U postgres -O postgres rms_db
   pg_restore -h localhost -p 5432 -U postgres -d rms_db -v rms_db_backup.dump
   ```

---

## 3. Scheduling Automated Backups

For production readiness, backups should run on a recurring schedule.

### Windows (Task Scheduler)
Create a daily task to run the backup script:
1. Open **Task Scheduler** and click **Create Basic Task**.
2. Trigger: **Daily** (choose a time during off-peak hours).
3. Action: **Start a program**.
4. Program/script: `powershell.exe`
5. Add arguments: `-ExecutionPolicy Bypass -File "C:\path-to-rms\scripts\backup_database.ps1"`
6. Start in: `C:\path-to-rms`

### Linux (Cron Job)
Add a cron entry to run the backup script daily at 2:00 AM:
1. Open the cron editor:
   ```bash
   crontab -e
   ```
2. Append the entry:
   ```text
   0 2 * * * /bin/bash /path-to-rms/scripts/backup_database.sh >> /path-to-rms/backups/backup.log 2>&1
   ```
