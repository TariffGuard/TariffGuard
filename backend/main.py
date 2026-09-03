from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import os

from app.api.factory import router as factory_router
from app.api.machine import router as machine_router
from app.api.production_order import router as order_router
from app.api.tariff import router as tariff_router
from app.api.meter_reading import router as meter_reading_router
from app.api.dashboard import router as dashboard_router
from app.api.optimization import router as optimization_router
from app.core.database import init_db
from app.api.alert import router as alert_router
from app.api.forecast import router as forecast_router
from app.api.ai import router as ai_router


app = FastAPI(
    title="TariffGuard API",
    description="AI-Powered Energy & Production Optimization Platform",
    version="1.0.0"
)

# Add error handlers
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
from app.core.error_handlers import (
    validation_error_handler,
    sqlalchemy_error_handler,
    generic_error_handler
)
from app.api.auth import router as auth_router
from app.api.users import router as users_router

app.add_exception_handler(RequestValidationError, validation_error_handler)
app.add_exception_handler(SQLAlchemyError, sqlalchemy_error_handler)
app.add_exception_handler(Exception, generic_error_handler)
# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(factory_router)
app.include_router(machine_router)
app.include_router(order_router)
app.include_router(tariff_router)
app.include_router(meter_reading_router)
app.include_router(dashboard_router)
app.include_router(optimization_router)
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(alert_router)
app.include_router(forecast_router)
app.include_router(ai_router)
# Serve static files
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/dashboard")
async def dashboard():
    return FileResponse("static/index.html")

import threading

def background_initialization():
    """Run seeder and model training asynchronously so Uvicorn opens port immediately"""
    try:
        from app.core.database import SessionLocal
        from app.models.factory import Factory
        db = SessionLocal()
        factory_exists = db.query(Factory).first()
        db.close()
        
        if not factory_exists:
            print("[Startup] Seeding initial factory database...")
            from app.services.synthetic_data import SyntheticDataGenerator
            db = SessionLocal()
            gen = SyntheticDataGenerator(db, days=30)
            gen.generate()
            db.close()
            print("[Startup] Database seeded successfully!")
            
        import os
        model_path = os.path.join(os.path.dirname(__file__), "app", "models", "xgboost_load_model.json")
        if not os.path.exists(model_path):
            print("[Startup] Training XGBoost forecasting model...")
            from train_model import train
            train()
            print("[Startup] XGBoost model trained successfully!")
    except Exception as e:
        print(f"[Startup Warning] Background initialization error: {e}")

@app.on_event("startup")
async def startup_event():
    init_db()
    print("Database tables initialized!")
    threading.Thread(target=background_initialization, daemon=True).start()

@app.get("/")
async def root():
    return {
        "message": "TariffGuard API is running",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/test")
async def test_endpoint():
    return {
        "status": "success",
        "data": "Backend is working!",
        "database_url": os.getenv("DATABASE_URL", "Not configured")
    }