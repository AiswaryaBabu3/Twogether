# Twogether

Twogether is an AI-powered long-distance couples mobile and web application.

---

## Quick Start (Single-Command Pipeline)

You can run the complete project (Alembic database migrations + FastAPI backend + Vite React frontend) with a single command from the project root:

### Option 1: PowerShell Pipeline
```powershell
.\run.ps1
```

### Option 2: Windows Batch / Double-Click
```cmd
run.bat
```
*(Or simply double-click `run.bat` in File Explorer)*

### Option 3: Unified In-Terminal Mode (Ctrl+C stops everything)
```powershell
python run.py
```

---

## Service Endpoints

Once the pipeline starts:

| Service | URL | Description |
|---|---|---|
| **Frontend Web App** | [http://localhost:5173](http://localhost:5173) | Vite React Application |
| **Backend API** | [http://localhost:8000](http://localhost:8000) | FastAPI REST API |
| **Interactive Docs** | [http://localhost:8000/docs](http://localhost:8000/docs) | Swagger UI |
| **Health Check** | [http://localhost:8000/health](http://localhost:8000/health) | API Status & Latency |