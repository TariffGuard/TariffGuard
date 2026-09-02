@echo off
title TariffGuard — Full Stack Launcher
color 0A

echo.
echo  ============================================================
echo    TariffGuard — One-Click Startup
echo  ============================================================
echo    This will:
echo      1. Start MySQL + Backend (Docker Compose)
echo      2. Wait for the database to be ready
echo      3. Seed realistic demo data
echo      4. Train the XGBoost forecasting model
echo      5. Start the Next.js frontend
echo  ============================================================
echo.

:: ---- Check Docker is running ----
docker info >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)

:: ---- Step 1: Start backend + database ----
echo  [1/5] Starting MySQL and Backend services...
docker compose up -d --build
if errorlevel 1 (
    echo  [ERROR] Docker Compose failed to start.
    pause
    exit /b 1
)

:: ---- Step 2: Wait for backend to be healthy ----
echo  [2/5] Waiting for backend to be ready...
:wait_loop
timeout /t 3 /nobreak >nul
curl -s http://localhost:8000/health >nul 2>&1
if errorlevel 1 (
    echo         Still waiting...
    goto wait_loop
)
echo         Backend is ready!

:: ---- Step 3: Seed data ----
echo  [3/5] Seeding demo data (factory, machines, tariffs, meter readings)...
docker compose exec -T backend python -m seed
if errorlevel 1 (
    echo  [WARNING] Seeding failed. You may already have data, or there was an error.
)

:: ---- Step 4: Train model ----
echo  [4/5] Training XGBoost load forecasting model...
docker compose exec -T backend python train_model.py
if errorlevel 1 (
    echo  [WARNING] Model training failed. The optimizer will still work with fallback heuristics.
)

:: ---- Step 5: Start frontend ----
echo  [5/5] Starting Next.js frontend...
echo.
echo  ============================================================
echo    All services are starting:
echo      Backend API:  http://localhost:8000
echo      API Docs:     http://localhost:8000/docs
echo      Frontend:     http://localhost:3000
echo  ============================================================
echo.

cd frontend
start "TariffGuard Frontend" cmd /k "npm run dev"

echo.
echo  Frontend launched in a new window.
echo  Press Ctrl+C in this window to stop Docker services.
echo  Close the frontend window to stop the UI.
echo.

:: Keep this window alive so docker stays running
pause
