"""
Twogether Pipeline Orchestrator (Unified Terminal Mode)
Usage:
    python run.py
"""

import os
import signal
import subprocess
import sys
import time

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")

VENV_PYTHON = os.path.join(BACKEND_DIR, ".venv", "Scripts", "python.exe")
if not os.path.exists(VENV_PYTHON):
    VENV_PYTHON = sys.executable

ALEMBIC_EXE = os.path.join(BACKEND_DIR, ".venv", "Scripts", "alembic.exe")


def kill_proc_tree(pid: int) -> None:
    """Cleanly terminate process and all child processes on Windows or POSIX."""
    if sys.platform == "win32":
        subprocess.run(
            ["taskkill", "/F", "/T", "/PID", str(pid)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    else:
        try:
            os.kill(pid, signal.SIGTERM)
        except OSError:
            pass


def free_port(port: int) -> None:
    """Frees port if an orphaned process from a previous run is still holding it."""
    if sys.platform == "win32":
        try:
            cmd = f'powershell -Command "(Get-NetTCPConnection -LocalPort {port} -ErrorAction SilentlyContinue).OwningProcess"'
            res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            for line in res.stdout.strip().split():
                if line.isdigit():
                    pid = int(line)
                    if pid > 4:
                        subprocess.run(["taskkill", "/F", "/PID", str(pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception:
            pass


def main() -> None:
    print("=" * 64)
    print("         Twogether Full-Stack Dev Pipeline (Unified Mode)")
    print("=" * 64)
    print()

    # Step 1: Run Migrations
    print("[1/3] Running database migrations (Alembic)...")
    if os.path.exists(ALEMBIC_EXE):
        try:
            subprocess.run([ALEMBIC_EXE, "upgrade", "head"], cwd=BACKEND_DIR, check=True)
            print("  -> [OK] Database schema up to date.")
        except Exception as e:
            print(f"  -> [WARNING] Migration warning: {e}")
    else:
        print("  -> [INFO] Alembic binary not found, skipping migration check.")

    print()
    print("[2/3] Starting Backend API on http://localhost:8000 ...")
    free_port(8000)
    backend_cmd = [
        VENV_PYTHON,
        "-m",
        "uvicorn",
        "app.main:app",
        "--reload",
        "--host",
        "0.0.0.0",
        "--port",
        "8000",
    ]
    backend_proc = subprocess.Popen(backend_cmd, cwd=BACKEND_DIR)

    # Brief pause to allow backend to bind
    time.sleep(1.5)

    print()
    print("[3/3] Starting React Vite Frontend on http://localhost:5173 ...")
    free_port(5173)
    frontend_proc = subprocess.Popen("npm run dev", cwd=FRONTEND_DIR, shell=True)

    print()
    print("=" * 64)
    print("  Pipeline active! Press Ctrl+C in this terminal to stop both.")
    print("  * Frontend UI:       http://localhost:5173")
    print("  * Backend API:      http://localhost:8000")
    print("  * API Docs:         http://localhost:8000/docs")
    print("=" * 64)
    print()

    try:
        while True:
            time.sleep(0.5)
            if backend_proc.poll() is not None:
                print(f"[ERROR] Backend exited with code {backend_proc.returncode}")
                break
            if frontend_proc.poll() is not None:
                print(f"[ERROR] Frontend exited with code {frontend_proc.returncode}")
                break
    except KeyboardInterrupt:
        print("\nStopping all services...")
    finally:
        kill_proc_tree(backend_proc.pid)
        kill_proc_tree(frontend_proc.pid)
        print("Pipeline shut down cleanly.")


if __name__ == "__main__":
    main()
