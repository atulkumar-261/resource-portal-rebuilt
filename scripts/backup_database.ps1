# PowerShell Database & Uploads Backup Script for Resource Management System (RMS)
# Reads credentials from backend/.env if available, otherwise uses defaults.

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
# Format: postgresql://[user]:[password]@[host]:[port]/[database]
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

# Set PGPASSWORD so pg_dump won't prompt
$env:PGPASSWORD = $pgPass

# Create backup directory
$backupDir = Join-Path $PSScriptRoot "..\backups"
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$dbBackupFile = Join-Path $backupDir "rms_db_$timestamp.dump"
$uploadsBackupFile = Join-Path $backupDir "rms_uploads_$timestamp.zip"

Write-Host "Starting backup process..."

# 1. DB Dump
Write-Host "Dumping database $pgDb on $pgHost:$pgPort as user $pgUser..."
& pg_dump -h $pgHost -p $pgPort -U $pgUser -F c -b -v -f $dbBackupFile $pgDb
if ($LASTEXITCODE -eq 0) {
    Write-Host "Database backup completed successfully: $dbBackupFile"
} else {
    Write-Error "Database dump failed with exit status: $LASTEXITCODE"
}

# 2. Uploads zip
if (Test-Path $uploadDir) {
    Write-Host "Zipping uploads directory: $uploadDir..."
    Compress-Archive -Path "$uploadDir\*" -DestinationPath $uploadsBackupFile -Force
    Write-Host "Uploads backup completed: $uploadsBackupFile"
} else {
    Write-Warning "Uploads directory not found at: $uploadDir. Skipping uploads backup."
}

# 3. Rotate old backups (Keep last 7 days)
Write-Host "Cleaning up backups older than 7 days..."
Get-ChildItem -Path $backupDir | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) } | Remove-Item -Force
Write-Host "Backup cycle complete."
