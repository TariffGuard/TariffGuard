from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import os

from app.api.factory import router as factory_router
from app.api.machine import router as machine_router
from app.api.production_order import router as order_router
from app.core.database import init_db

app = FastAPI(
    title="TariffGuard API",
    description="AI-Powered Energy & Production Optimization Platform",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(factory_router)
app.include_router(machine_router)
app.include_router(order_router)

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