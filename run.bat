@echo off
setlocal enabledelayedexpansion
title Twogether Pipeline Launcher

echo ================================================================
echo               Twogether Full-Stack Dev Pipeline
echo ================================================================
echo.

set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%backend"
set "FRONTEND_DIR=%ROOT_DIR%frontend"

:: Step 1: Pre-flight checks and Database Migrations
echo [1/3] Checking environment and applying database migrations...

if not exist "%BACKEND_DIR%\.venv\Scripts\python.exe" (
    echo [ERROR] Backend virtual environment not found at backend\.venv
    echo Please create it and install requirements:
    echo   python -m venv backend\.venv
    echo   backend\.venv\Scripts\pip install -r backend\requirements.txt
    pause
    exit /b 1
)

if not exist "%FRONTEND_DIR%\node_modules" (
    echo [INFO] frontend\node_modules missing. Installing frontend dependencies...
    cd /d "%FRONTEND_DIR%"
    call npm install
    if !ERRORLEVEL! neq 0 (
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
    cd /d "%ROOT_DIR%"
)

:: Run database migration
echo Applying database migrations via Alembic...
cd /d "%BACKEND_DIR%"
call .venv\Scripts\alembic.exe upgrade head
if %ERRORLEVEL% neq 0 (
    echo [WARNING] Database migration encountered an issue. Proceeding with server launch...
) else (
    echo [OK] Database schema up to date.
)
cd /d "%ROOT_DIR%"

echo.
:: Step 2: Start Backend
echo [2/3] Launching FastAPI Backend on http://localhost:8000 ...
start "Twogether - Backend API [Port 8000]" cmd /k "cd /d %BACKEND_DIR% && .venv\Scripts\uvicorn.exe app.main:app --reload --host 0.0.0.0 --port 8000"

:: Step 3: Start Frontend
echo [3/3] Launching React Vite Frontend on http://localhost:5173 ...
start "Twogether - Frontend [Port 5173]" cmd /k "cd /d %FRONTEND_DIR% && npm run dev"

echo.
echo ================================================================
echo   All pipeline services started successfully!
echo.
echo   * Frontend Web App:   http://localhost:5173
echo   * Backend API:        http://localhost:8000
echo   * API Swagger Docs:   http://localhost:8000/docs
echo   * Health Check:       http://localhost:8000/health
echo.
echo   Dedicated terminal windows have been opened for:
echo     1. Backend API (FastAPI)
echo     2. Frontend (Vite)
echo ================================================================
echo.
pause
