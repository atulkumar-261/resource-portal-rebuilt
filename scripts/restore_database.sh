#!/bin/bash
# Shell Database & Uploads Restore Script for Resource Management System (RMS)
# Usage: ./restore_database.sh [dbBackupFile.dump] [uploadsBackupFile.zip]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

DB_BACKUP=$1
UPLOADS_BACKUP=$2

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

# If backups are not specified, locate the latest
if [ -z "$DB_BACKUP" ]; then
    DB_BACKUP=$(ls -t "$BACKUP_DIR"/rms_db_*.dump 2>/dev/null | head -n 1 || true)
fi

if [ -z "$UPLOADS_BACKUP" ]; then
    UPLOADS_BACKUP=$(ls -t "$BACKUP_DIR"/rms_uploads_*.zip 2>/dev/null | head -n 1 || true)
fi

if [ -z "$DB_BACKUP" ] || [ ! -f "$DB_BACKUP" ]; then
    echo "No valid database backup file specified or found."
    exit 1
fi

echo "Restoring database from: $DB_BACKUP"

# Terminate other sessions and drop database to ensure clean restore
echo "Dropping and recreating database $PGDATABASE..."
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d postgres -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '$PGDATABASE' AND pid <> pg_backend_pid();" >/dev/null 2>&1 || true
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d postgres -c "DROP DATABASE IF EXISTS $PGDATABASE;" >/dev/null 2>&1
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d postgres -c "CREATE DATABASE $PGDATABASE OWNER $PGUSER;" >/dev/null 2>&1

# Run pg_restore
echo "Restoring schema and data..."
pg_restore -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -v "$DB_BACKUP" || true

# Restore Uploads zip
if [ -n "$UPLOADS_BACKUP" ] && [ -f "$UPLOADS_BACKUP" ]; then
    echo "Restoring uploads folder from: $UPLOADS_BACKUP..."
    mkdir -p "$UPLOAD_DIR"
    unzip -o "$UPLOADS_BACKUP" -d "$UPLOAD_DIR"
    echo "Uploads restore completed."
else
    echo "Uploads backup not found. Skipping uploads restoration."
fi

echo "Restore operation complete."
