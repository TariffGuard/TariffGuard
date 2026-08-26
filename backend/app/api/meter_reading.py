from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import pandas as pd
import io

from app.core.database import get_db
from app.models.meter_reading import MeterReading
from app.schemas.meter_reading import MeterReadingCreate, MeterReadingResponse, MeterReadingBulkCreate

router = APIRouter(prefix="/api/meter-readings", tags=["meter-readings"])

@router.post("/", response_model=MeterReadingResponse)
def create_reading(reading: MeterReadingCreate, db: Session = Depends(get_db)):
    """Create a single meter reading"""
    db_reading = MeterReading(**reading.dict())
    db.add(db_reading)
    db.commit()
    db.refresh(db_reading)
    return db_reading

@router.post("/bulk", response_model=List[MeterReadingResponse])
def create_bulk_readings(bulk: MeterReadingBulkCreate, db: Session = Depends(get_db)):
    """Create multiple meter readings at once"""
    readings = []
    for reading_data in bulk.readings:
        reading = MeterReading(
            factory_id=bulk.factory_id,
            **reading_data.dict()
        )
        db.add(reading)
        readings.append(reading)
    
    db.commit()
    for reading in readings:
        db.refresh(reading)
    
    return readings

@router.post("/import-csv")
async def import_csv(
    factory_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Import meter readings from CSV file"""
    try:
        # Read CSV
        content = await file.read()
        df = pd.read_csv(io.StringIO(content.decode('utf-8')))
        
        # Validate required columns
        required_columns = ['timestamp', 'kwh']
        for col in required_columns:
            if col not in df.columns:
                raise HTTPException(status_code=400, detail=f"Missing required column: {col}")
        
        # Convert timestamp
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        # Create readings
        readings = []
        for _, row in df.iterrows():
            reading = MeterReading(
                factory_id=factory_id,
                timestamp=row['timestamp'].to_pydatetime(),
                kwh=float(row['kwh']),
                kw=float(row.get('kw', 0)) if pd.notna(row.get('kw')) else None,
                solar_kwh=float(row.get('solar_kwh', 0)) if pd.notna(row.get('solar_kwh')) else 0,
                voltage=float(row.get('voltage')) if pd.notna(row.get('voltage')) else None,
                current=float(row.get('current')) if pd.notna(row.get('current')) else None,
                power_factor=float(row.get('power_factor')) if pd.notna(row.get('power_factor')) else None
            )
            readings.append(reading)
        
        # Save to database
        db.add_all(readings)
        db.commit()
        
        return {
            "message": f"Successfully imported {len(readings)} readings",
            "count": len(readings)
        }
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")

@router.get("/", response_model=List[MeterReadingResponse])
def list_readings(
    factory_id: int = None,
    start_date: datetime = None,
    end_date: datetime = None,
    skip: int = 0,
    limit: int = 1000,
    db: Session = Depends(get_db)
):
    """List meter readings with filters"""
    query = db.query(MeterReading)
    
    if factory_id:
        query = query.filter(MeterReading.factory_id == factory_id)
    
    if start_date:
        query = query.filter(MeterReading.timestamp >= start_date)
    
    if end_date:
        query = query.filter(MeterReading.timestamp <= end_date)
    
    return query.order_by(MeterReading.timestamp.desc()).offset(skip).limit(limit).all()

@router.get("/stats/{factory_id}")
def get_reading_stats(factory_id: int, db: Session = Depends(get_db)):
    """Get statistics for meter readings"""
    from sqlalchemy import func
    
    stats = db.query(
        func.count(MeterReading.id).label('total_readings'),
        func.sum(MeterReading.kwh).label('total_kwh'),
        func.avg(MeterReading.kwh).label('avg_kwh'),
        func.max(MeterReading.kw).label('peak_kw'),
        func.sum(MeterReading.solar_kwh).label('total_solar_kwh')
    ).filter(MeterReading.factory_id == factory_id).first()
    
    if not stats or not stats.total_readings:
        return {
            "total_readings": 0,
            "total_kwh": 0,
            "avg_kwh": 0,
            "peak_kw": 0,
            "total_solar_kwh": 0
        }
    
    return {
        "total_readings": stats.total_readings,
        "total_kwh": round(stats.total_kwh or 0, 2),
        "avg_kwh": round(stats.avg_kwh or 0, 2),
        "peak_kw": round(stats.peak_kw or 0, 2),
        "total_solar_kwh": round(stats.total_solar_kwh or 0, 2)
    }