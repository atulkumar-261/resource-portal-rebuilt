#!/bin/bash
# Shell Database & Uploads Backup Script for Resource Management System (RMS)
# Reads credentials from backend/.env if available, otherwise uses defaults.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Read .env file
ENV_FILE="$SCRIPT_DIR/../backend/.env"
if [ -f "$ENV_FILE" ]; then
    export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

DB_URL=${DATABASE_URL:-"postgresql://postgres:Atul@localhost:5432/rms_db"}
UPLOAD_DIR=${UPLOAD_DIR:-"$SCRIPT_DIR/../backend/uploads"}

# Parse connection string
if [[ $DB_URL =~ postgresql://([^:]+):([^@]+)@([^:/]+):?([0-9]*)/([^?]+) ]]; then
    PGUSER="${BASH_REMATCH[1]}"
    PGPASSWORD="${BASH_REMATCH[2]}"
    PGHOST="${BASH_REMATCH[3]}"
    PGPORT="${BASH_REMATCH[4]}"
    PGDATABASE="${BASH_REMATCH[5]}"
else
    echo "Could not parse DATABASE_URL"
    exit 1
fi

if [ -z "$PGPORT" ]; then
    PGPORT="5432"
fi

export PGPASSWORD

BACKUP_DIR="$SCRIPT_DIR/../backups"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_BACKUP_FILE="$BACKUP_DIR/rms_db_$TIMESTAMP.dump"
UPLOADS_BACKUP_FILE="$BACKUP_DIR/rms_uploads_$TIMESTAMP.zip"

echo "Starting backup process..."

# 1. DB Dump
echo "Dumping database $PGDATABASE on $PGHOST:$PGPORT as user $PGUSER..."
pg_dump -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -F c -b -v -f "$DB_BACKUP_FILE" "$PGDATABASE"
echo "Database backup completed successfully: $DB_BACKUP_FILE"

# 2. Uploads zip
if [ -d "$UPLOAD_DIR" ]; then
    echo "Zipping uploads directory: $UPLOAD_DIR..."
    (cd "$UPLOAD_DIR" && zip -r "$UPLOADS_BACKUP_FILE" .)
    echo "Uploads backup completed: $UPLOADS_BACKUP_FILE"
else
    echo "Uploads directory not found: $UPLOAD_DIR. Skipping uploads backup."
fi

# 3. Rotate old backups (Keep last 7 days)
echo "Cleaning up backups older than 7 days..."
find "$BACKUP_DIR" -mtime +7 -type f -delete
echo "Backup cycle complete."
