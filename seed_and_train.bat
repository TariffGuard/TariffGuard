@echo off
title TariffGuard — Seed Data + Train Model
color 0B

echo.
echo  ============================================================
echo    TariffGuard — Seed & Train
echo  ============================================================
echo    Use this when Docker is already running and you want to:
echo      1. Reseed the database with fresh demo data
echo      2. Retrain the XGBoost forecasting model
echo  ============================================================
echo.

:: ---- Check backend is reachable ----
curl -s http://localhost:8000/health >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Backend is not running. Run start.bat first, or start Docker Compose.
    pause
    exit /b 1
)

:: ---- Seed data ----
echo  [1/2] Seeding demo data...
docker compose exec -T backend python -m seed
if errorlevel 1 (
    echo  [ERROR] Seeding failed.
    pause
    exit /b 1
)

:: ---- Train model ----
echo  [2/2] Training XGBoost model...
docker compose exec -T backend python train_model.py
if errorlevel 1 (
    echo  [ERROR] Training failed.
    pause
    exit /b 1
)

echo.
echo  ============================================================
echo    Done! Refresh the frontend to see updated data.
echo    Frontend: http://localhost:3000
echo  ============================================================
echo.
pause
