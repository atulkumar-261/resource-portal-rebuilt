# PowerShell Database & Uploads Restore Script for Resource Management System (RMS)
# Usage: .\restore_database.ps1 [-dbBackup "..\backups\rms_db_xxx.dump"] [-uploadsBackup "..\backups\rms_uploads_xxx.zip"]

param (
    [string]$dbBackup,
    [string]$uploadsBackup
)

$envFile = Join-Path $PSScriptRoot "..\backend\.env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#")) {
            $parts = $line.Split("=", 2)
            if ($parts.Length -eq 2) {
                [System.Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim())
            }
        }
    }
}

$dbUrl = [System.Environment]::GetEnvironmentVariable("DATABASE_URL")
if (-not $dbUrl) {
    $dbUrl = "postgresql://postgres:Atul@localhost:5432/rms_db"
}

$uploadDir = [System.Environment]::GetEnvironmentVariable("UPLOAD_DIR")
if (-not $uploadDir) {
    $uploadDir = Join-Path $PSScriptRoot "..\backend\uploads"
}

# Parse connection string
if ($dbUrl -match "postgresql://([^:]+):([^@]+)@([^:/]+):?(\d*)/([^?]+)") {
    $pgUser = $Matches[1]
    $pgPass = $Matches[2]
    $pgHost = $Matches[3]
    $pgPort = $Matches[4]
    $pgDb   = $Matches[5]
} else {
    Write-Error "Could not parse DATABASE_URL: $dbUrl"
    exit 1
}

if (-not $pgPort) { $pgPort = "5432" }
$env:PGPASSWORD = $pgPass

$backupDir = Join-Path $PSScriptRoot "..\backups"

# If backups are not specified, locate the latest
if (-not $dbBackup) {
    if (Test-Path $backupDir) {
        $latestDb = Get-ChildItem -Path $backupDir -Filter "rms_db_*.dump" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if ($latestDb) {
            $dbBackup = $latestDb.FullName
        }
    }
}

if (-not $uploadsBackup) {
    if (Test-Path $backupDir) {
        $latestUploads = Get-ChildItem -Path $backupDir -Filter "rms_uploads_*.zip" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if ($latestUploads) {
            $uploadsBackup = $latestUploads.FullName
        }
    }
}

if (-not $dbBackup -or -not (Test-Path $dbBackup)) {
    Write-Error "No valid database backup file specified or found."
    exit 1
}

Write-Host "Restoring database from: $dbBackup"

# Terminate other sessions and drop database to ensure clean restore
Write-Host "Dropping and recreating database $pgDb..."
& psql -h $pgHost -p $pgPort -U $pgUser -d postgres -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '$pgDb' AND pid <> pg_backend_pid();" | Out-Null
& psql -h $pgHost -p $pgPort -U $pgUser -d postgres -c "DROP DATABASE IF EXISTS $pgDb;" | Out-Null
& psql -h $pgHost -p $pgPort -U $pgUser -d postgres -c "CREATE DATABASE $pgDb OWNER $pgUser;" | Out-Null

# Run pg_restore
Write-Host "Restoring schema and data..."
& pg_restore -h $pgHost -p $pgPort -U $pgUser -d $pgDb -v $dbBackup
if ($LASTEXITCODE -le 1) {
    Write-Host "Database restore completed successfully."
} else {
    Write-Error "Database restore failed with exit status: $LASTEXITCODE"
}

# Restore Uploads zip
if ($uploadsBackup -and (Test-Path $uploadsBackup)) {
    Write-Host "Restoring uploads folder from: $uploadsBackup..."
    if (-not (Test-Path $uploadDir)) {
        New-Item -ItemType Directory -Path $uploadDir | Out-Null
    }
    Expand-Archive -Path $uploadsBackup -DestinationPath $uploadDir -Force
    Write-Host "Uploads restore completed."
} else {
    Write-Warning "Uploads backup not found. Skipping uploads restoration."
}

Write-Host "Restore operation complete."
