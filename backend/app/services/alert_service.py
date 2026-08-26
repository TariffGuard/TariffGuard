"""
Alert Service for TariffGuard
Generates and manages alerts for peak demand, deadlines, and anomalies
"""

from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import List, Optional

from app.models.alert import Alert
from app.models.meter_reading import MeterReading
from app.models.production_order import ProductionOrder
from app.models.factory import Factory

class AlertService:
    """Generate and manage alerts"""
    
    @staticmethod
    def check_peak_demand(db: Session, factory_id: int, threshold_kw: float = 200) -> Optional[Alert]:
        """Check if peak demand exceeds threshold"""
        # Get latest meter reading
        latest = db.query(MeterReading).filter(
            MeterReading.factory_id == factory_id
        ).order_by(MeterReading.timestamp.desc()).first()
        
        if latest and latest.kw and latest.kw > threshold_kw:
            # Check if alert already exists for this
            existing = db.query(Alert).filter(
                Alert.factory_id == factory_id,
                Alert.type == "peak_demand",
                Alert.is_resolved == False,
                Alert.created_at >= datetime.now() - timedelta(hours=1)
            ).first()
            
            if not existing:
                alert = Alert(
                    factory_id=factory_id,
                    type="peak_demand",
                    severity="critical" if latest.kw > threshold_kw * 1.2 else "warning",
                    message=f"Peak demand of {latest.kw:.1f} kW exceeds threshold of {threshold_kw} kW",
                    value=latest.kw,
                    threshold=threshold_kw
                )
                db.add(alert)
                db.commit()
                db.refresh(alert)
                return alert
        
        return None
    
    @staticmethod
    def check_deadlines(db: Session, factory_id: int, hours_ahead: int = 6) -> List[Alert]:
        """Check for upcoming order deadlines"""
        upcoming_deadline = datetime.now() + timedelta(hours=hours_ahead)
        
        orders = db.query(ProductionOrder).filter(
            ProductionOrder.factory_id == factory_id,
            ProductionOrder.status == "pending",
            ProductionOrder.deadline <= upcoming_deadline,
            ProductionOrder.deadline > datetime.now()
        ).all()
        
        alerts = []
        for order in orders:
            existing = db.query(Alert).filter(
                Alert.factory_id == factory_id,
                Alert.type == "deadline",
                Alert.message.like(f"%{order.order_no}%"),
                Alert.is_resolved == False
            ).first()
            
            if not existing:
                hours_left = (order.deadline - datetime.now()).total_seconds() / 3600
                alert = Alert(
                    factory_id=factory_id,
                    type="deadline",
                    severity="warning" if hours_left > 2 else "critical",
                    message=f"Order {order.order_no} deadline in {hours_left:.1f} hours",
                    value=hours_left,
                    threshold=hours_ahead
                )
                db.add(alert)
                alerts.append(alert)
        
        if alerts:
            db.commit()
            for alert in alerts:
                db.refresh(alert)
        
        return alerts
    
    @staticmethod
    def check_solar_generation(db: Session, factory_id: int, min_solar_kw: float = 10) -> Optional[Alert]:
        """Check if solar generation is below expected"""
        # Get factory solar capacity
        factory = db.query(Factory).filter(Factory.id == factory_id).first()
        if not factory or not factory.solar_capacity_kw:
            return None
        
        # Check if it's daytime (8 AM - 5 PM)
        current_hour = datetime.now().hour
        if 8 <= current_hour <= 17:
            latest = db.query(MeterReading).filter(
                MeterReading.factory_id == factory_id
            ).order_by(MeterReading.timestamp.desc()).first()
            
            if latest and latest.solar_kwh and latest.solar_kwh < min_solar_kw:
                alert = Alert(
                    factory_id=factory_id,
                    type="low_solar",
                    severity="warning",
                    message=f"Solar generation low: {latest.solar_kwh:.1f} kWh (capacity: {factory.solar_capacity_kw} kW)",
                    value=latest.solar_kwh,
                    threshold=min_solar_kw
                )
                db.add(alert)
                db.commit()
                db.refresh(alert)
                return alert
        
        return None
    
    @staticmethod
    def generate_all_alerts(db: Session, factory_id: int) -> List[Alert]:
        """Generate all alerts for a factory"""
        alerts = []
        
        peak_alert = AlertService.check_peak_demand(db, factory_id)
        if peak_alert:
            alerts.append(peak_alert)
        
        deadline_alerts = AlertService.check_deadlines(db, factory_id)
        alerts.extend(deadline_alerts)
        
        solar_alert = AlertService.check_solar_generation(db, factory_id)
        if solar_alert:
            alerts.append(solar_alert)
        
        return alerts