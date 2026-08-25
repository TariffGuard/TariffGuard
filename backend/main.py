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

# Serve static files
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/dashboard")
async def dashboard():
    return FileResponse("static/index.html")

@app.on_event("startup")
async def startup_event():
    init_db()
    print("Database initialized!")

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