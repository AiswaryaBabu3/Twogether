<#
.SYNOPSIS
    Twogether Full-Stack Startup Pipeline Script
.DESCRIPTION
    Runs database migrations, then launches both FastAPI Backend and Vite Frontend in pipeline order.
.EXAMPLE
    .\run.ps1
#>

[CmdletBinding()]
param ()

$ErrorActionPreference = "Stop"
$rootDir = $PSScriptRoot
$backendDir = Join-Path $rootDir "backend"
$frontendDir = Join-Path $rootDir "frontend"

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "               Twogether Full-Stack Dev Pipeline                " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# ------------------------------------------------------------------------------
# 1. Pre-flight Checks & Database Migrations
# ------------------------------------------------------------------------------
Write-Host "[1/3] Checking environment & applying database migrations..." -ForegroundColor Yellow

$backendVenvPython = Join-Path $backendDir ".venv\Scripts\python.exe"
$alembicExe = Join-Path $backendDir ".venv\Scripts\alembic.exe"

if (-not (Test-Path $backendVenvPython)) {
    Write-Error "Backend virtual environment not found at backend\.venv!"
    exit 1
}

if (-not (Test-Path (Join-Path $frontendDir "node_modules"))) {
    Write-Host "  -> node_modules missing. Installing frontend dependencies..." -ForegroundColor Cyan
    Push-Location $frontendDir
    npm install
    Pop-Location
}

# Run Alembic migrations
try {
    Write-Host "  -> Running database migrations (alembic upgrade head)..." -ForegroundColor Gray
    Push-Location $backendDir
    & $alembicExe upgrade head
    Pop-Location
    Write-Host "  -> [OK] Database schema up to date." -ForegroundColor Green
} catch {
    Write-Warning "Database migration warning: $_"
    Write-Host "  -> Continuing server launch..." -ForegroundColor Yellow
}

Write-Host ""

# ------------------------------------------------------------------------------
# 2. Launch Backend API
# ------------------------------------------------------------------------------
Write-Host "[2/3] Launching FastAPI Backend on http://localhost:8000 ..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$host.UI.RawUI.WindowTitle = 'Twogether - Backend API [Port 8000]'; Set-Location '$backendDir'; & '.\.venv\Scripts\uvicorn.exe' app.main:app --reload --host 0.0.0.0 --port 8000"

# ------------------------------------------------------------------------------
# 3. Launch Frontend (Vite)
# ------------------------------------------------------------------------------
Write-Host "[3/3] Launching React Vite Frontend on http://localhost:5173 ..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$host.UI.RawUI.WindowTitle = 'Twogether - Frontend [Port 5173]'; Set-Location '$frontendDir'; npm run dev"

Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "  Pipeline execution complete! Both services are now running.   " -ForegroundColor Green
Write-Host ""
Write-Host "  * Frontend UI:       http://localhost:5173" -ForegroundColor White
Write-Host "  * Backend API:      http://localhost:8000" -ForegroundColor White
Write-Host "  * API Swagger Docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host "  * Health Check:     http://localhost:8000/health" -ForegroundColor White
Write-Host "================================================================" -ForegroundColor Green
