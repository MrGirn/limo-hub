# Automated Docker Compose Launcher pointing to Local Database
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Global Hub Docker Container - Local SQLite Database Engine" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Check Docker daemon
Write-Host "`n[1/3] Checking Docker Engine status..." -ForegroundColor Yellow
$null = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {

    Write-Host "[!] Docker Desktop engine is not active yet." -ForegroundColor Red
    Write-Host "    Please ensure Docker Desktop is open and showing 'Engine Running' (green icon in taskbar)." -ForegroundColor Yellow
    Write-Host "    Attempting to launch Docker Desktop..." -ForegroundColor Cyan
    Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    Write-Host "    Waiting 15 seconds for Docker engine..." -ForegroundColor Gray
    Start-Sleep -Seconds 15
}

# 2. Free Port 8000 if occupied on host
Write-Host "`n[2/3] Checking port 8000 availability..." -ForegroundColor Yellow
Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "    Freeing port 8000 (Process ID: $($_.OwningProcess))..." -ForegroundColor Gray
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
}

# 3. Build & Run Container
Write-Host "`n[3/3] Building and starting Global Hub container..." -ForegroundColor Yellow
docker compose up --build -d

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n==========================================================" -ForegroundColor Green
    Write-Host " [SUCCESS] Global Hub Container is Running!" -ForegroundColor Green
    Write-Host " - Web App & Booking Portal: http://localhost:8000/" -ForegroundColor Cyan
    Write-Host " - Marketplace Rules API:   http://localhost:8000/api/v1/global-hub/marketplace/rules" -ForegroundColor Cyan
    Write-Host " - Health Status:           http://localhost:8000/health" -ForegroundColor Cyan
    Write-Host " - Authoritative DB:        Local SQLite (limo_database.db)" -ForegroundColor Cyan
    Write-Host "==========================================================" -ForegroundColor Green
} else {
    Write-Host "`n[!] Docker compose build failed. Please verify Docker Desktop is running." -ForegroundColor Red
}
