"""
TariffGuard Seed Data Script
Creates demo data for testing and demonstration
"""

from datetime import datetime, timedelta, date, time
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, init_db, Base, engine
from app.models.factory import Factory
from app.models.machine import Machine
from app.models.production_order import ProductionOrder
from app.models.tariff import Tariff
from app.models.meter_reading import MeterReading
import random

def clear_database():
    """Clear all existing data"""
    print("🗑️  Clearing existing data...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("✅ Database cleared!")

def seed_factory(db: Session):
    """Create demo factory"""
    print("\n🏭 Creating factory...")
    factory = Factory(
        name="Faisalabad Textile Unit 01",
        location="Faisalabad, Pakistan",
        tariff_category="Industrial",
        sanctioned_load_kw=250,
        solar_capacity_kw=100,
        operating_hours="08:00-22:00",
        working_days="Mon-Sat"
    )
    db.add(factory)
    db.commit()
    db.refresh(factory)
    print(f"✅ Factory created: {factory.name} (ID: {factory.id})")
    return factory

def seed_machines(db: Session, factory_id: int):
    """Create demo machines"""
    print("\n🔧 Creating machines...")
    machines_data = [
        {
            "name": "Dyeing Machine 01",
            "machine_type": "Dyeing",
            "power_kw": 45,
            "min_run_minutes": 120,
            "setup_minutes": 30,
            "shiftable": True,
            "priority": 1,
            "available_from": "08:00",
            "available_to": "22:00"
        },
        {
            "name": "Dyeing Machine 02",
            "machine_type": "Dyeing",
            "power_kw": 45,
            "min_run_minutes": 120,
            "setup_minutes": 30,
            "shiftable": True,
            "priority": 1,
            "available_from": "08:00",
            "available_to": "22:00"
        },
        {
            "name": "Spinning Machine 01",
            "machine_type": "Spinning",
            "power_kw": 30,
            "min_run_minutes": 60,
            "setup_minutes": 15,
            "shiftable": True,
            "priority": 2,
            "available_from": "08:00",
            "available_to": "22:00"
        },
        {
            "name": "Spinning Machine 02",
            "machine_type": "Spinning",
            "power_kw": 30,
            "min_run_minutes": 60,
            "setup_minutes": 15,
            "shiftable": True,
            "priority": 2,
            "available_from": "08:00",
            "available_to": "22:00"
        },
        {
            "name": "Weaving Machine 01",
            "machine_type": "Weaving",
            "power_kw": 25,
            "min_run_minutes": 90,
            "setup_minutes": 20,
            "shiftable": False,
            "priority": 1,
            "available_from": "08:00",
            "available_to": "22:00"
        },
        {
            "name": "Weaving Machine 02",
            "machine_type": "Weaving",
            "power_kw": 25,
            "min_run_minutes": 90,
            "setup_minutes": 20,
            "shiftable": False,
            "priority": 1,
            "available_from": "08:00",
            "available_to": "22:00"
        },
        {
            "name": "Finishing Machine 01",
            "machine_type": "Finishing",
            "power_kw": 20,
            "min_run_minutes": 45,
            "setup_minutes": 10,
            "shiftable": True,
            "priority": 3,
            "available_from": "08:00",
            "available_to": "22:00"
        },
        {
            "name": "Packaging Machine 01",
            "machine_type": "Packaging",
            "power_kw": 15,
            "min_run_minutes": 30,
            "setup_minutes": 5,
            "shiftable": True,
            "priority": 3,
            "available_from": "08:00",
            "available_to": "22:00"
        }
    ]
    
    machines = []
    for machine_data in machines_data:
        machine = Machine(
            factory_id=factory_id,
            **machine_data
        )
        db.add(machine)
        machines.append(machine)
    
    db.commit()
    for machine in machines:
        db.refresh(machine)
    
    print(f"✅ Created {len(machines)} machines:")
    for machine in machines:
        print(f"   - {machine.name} (ID: {machine.id}, Power: {machine.power_kw} kW)")
    
    return machines

def seed_tariffs(db: Session):
    """Create demo tariffs"""
    print("\n💰 Creating tariffs...")
    today = date.today()
    
    tariffs_data = [
        {
            "category": "Industrial",
            "period_name": "Off-Peak",
            "start_time": "00:00",
            "end_time": "18:00",
            "rate_pkr_per_kwh": 25.0,
            "fixed_charge_pkr_per_kw": 400,
            "effective_from": today,
            "source": "NEPRA Demo Data"
        },
        {
            "category": "Industrial",
            "period_name": "Peak",
            "start_time": "18:00",
            "end_time": "22:00",
            "rate_pkr_per_kwh": 35.0,
            "fixed_charge_pkr_per_kw": 400,
            "effective_from": today,
            "source": "NEPRA Demo Data"
        },
        {
            "category": "Industrial",
            "period_name": "Night",
            "start_time": "22:00",
            "end_time": "00:00",
            "rate_pkr_per_kwh": 20.0,
            "fixed_charge_pkr_per_kw": 400,
            "effective_from": today,
            "source": "NEPRA Demo Data"
        }
    ]
    
    tariffs = []
    for tariff_data in tariffs_data:
        tariff = Tariff(**tariff_data)
        db.add(tariff)
        tariffs.append(tariff)
    
    db.commit()
    for tariff in tariffs:
        db.refresh(tariff)
    
    print(f"✅ Created {len(tariffs)} tariff periods:")
    for tariff in tariffs:
        print(f"   - {tariff.period_name}: {tariff.start_time}-{tariff.end_time} @ Rs.{tariff.rate_pkr_per_kwh}/kWh")
    
    return tariffs

def seed_production_orders(db: Session, factory_id: int):
    """Create demo production orders"""
    print("\n📋 Creating production orders...")
    
    tomorrow = datetime.now() + timedelta(days=1)
    today = datetime.now()
    
    orders_data = [
        {
            "order_no": "ORD-001",
            "process": "Dyeing",
            "quantity": 500,
            "duration_minutes": 180,
            "earliest_start": today.replace(hour=9, minute=0),
            "deadline": today.replace(hour=18, minute=0),
            "priority": 1,
            "machine_options": [1, 2],
            "status": "pending"
        },
        {
            "order_no": "ORD-002",
            "process": "Dyeing",
            "quantity": 350,
            "duration_minutes": 150,
            "earliest_start": today.replace(hour=10, minute=0),
            "deadline": today.replace(hour=20, minute=0),
            "priority": 2,
            "machine_options": [1, 2],
            "status": "pending"
        },
        {
            "order_no": "ORD-003",
            "process": "Spinning",
            "quantity": 1000,
            "duration_minutes": 240,
            "earliest_start": today.replace(hour=8, minute=0),
            "deadline": tomorrow.replace(hour=12, minute=0),
            "priority": 1,
            "machine_options": [3, 4],
            "status": "pending"
        },
        {
            "order_no": "ORD-004",
            "process": "Weaving",
            "quantity": 800,
            "duration_minutes": 300,
            "earliest_start": today.replace(hour=8, minute=0),
            "deadline": tomorrow.replace(hour=18, minute=0),
            "priority": 1,
            "machine_options": [5, 6],
            "status": "pending",
            "locked": True
        },
        {
            "order_no": "ORD-005",
            "process": "Finishing",
            "quantity": 600,
            "duration_minutes": 120,
            "earliest_start": today.replace(hour=11, minute=0),
            "deadline": today.replace(hour=22, minute=0),
            "priority": 3,
            "machine_options": [7],
            "status": "pending"
        }
    ]
    
    orders = []
    for order_data in orders_data:
        order = ProductionOrder(
            factory_id=factory_id,
            **order_data
        )
        db.add(order)
        orders.append(order)
    
    db.commit()
    for order in orders:
        db.refresh(order)
    
    print(f"✅ Created {len(orders)} production orders:")
    for order in orders:
        print(f"   - {order.order_no}: {order.process} ({order.quantity} units, {order.duration_minutes} min)")
    
    return orders

def seed_meter_readings(db: Session, factory_id: int):
    """Create demo meter readings for last 7 days"""
    print("\n📊 Creating meter readings...")
    
    readings = []
    now = datetime.now()
    
    # Generate hourly readings for last 7 days
    for day in range(7):
        for hour in range(24):
            timestamp = now - timedelta(days=day, hours=now.hour - hour)
            timestamp = timestamp.replace(minute=0, second=0, microsecond=0)
            
            # Base load varies by time of day
            if 8 <= hour <= 18:
                base_load = 150  # Working hours
            elif 18 <= hour <= 22:
                base_load = 120  # Evening
            else:
                base_load = 50   # Night
            
            # Add some randomness
            load_variation = random.uniform(-20, 20)
            kwh = base_load + load_variation
            kw = kwh * random.uniform(0.8, 1.2)
            
            # Solar generation during day
            if 8 <= hour <= 17:
                solar_kwh = 100 * (1 - abs(hour - 12.5) / 5) * random.uniform(0.5, 1.0)
            else:
                solar_kwh = 0
            
            reading = MeterReading(
                factory_id=factory_id,
                timestamp=timestamp,
                kwh=kwh,
                kw=kw,
                solar_kwh=solar_kwh,
                voltage=400,
                current=kw / 400,
                power_factor=0.85
            )
            readings.append(reading)
    
    db.add_all(readings)
    db.commit()
    
    print(f"✅ Created {len(readings)} meter readings (7 days of hourly data)")
    return readings
def main():
    """Main seed function"""
    print("=" * 60)
    print("🌱 TariffGuard Seed Data Script")
    print("=" * 60)
    
    # Initialize database
    print("\n🔌 Initializing database...")
    init_db()
    print("✅ Database initialized!")
    
    # Create database session
    db = SessionLocal()
    
    try:
        # Clear existing data
        print("\n🗑️  Clearing existing data...")
        
        # Delete in order (child tables first)
        db.query(MeterReading).delete()
        db.query(ProductionOrder).delete()
        db.query(Machine).delete()
        db.query(Tariff).delete()
        db.query(Factory).delete()
        db.commit()
        print("✅ Existing data cleared!")
        
        # Seed data
        factory = seed_factory(db)
        machines = seed_machines(db, factory.id)
        tariffs = seed_tariffs(db)
        orders = seed_production_orders(db, factory.id)
        meter_readings = seed_meter_readings(db, factory.id)
        
        print("\n" + "=" * 60)
        print("🎉 SEED DATA COMPLETE!")
        print("=" * 60)
        print(f"""
Summary:
- Factory: {factory.name}
- Machines: {len(machines)}
- Tariffs: {len(tariffs)}
- Production Orders: {len(orders)}
- Meter Readings: {len(meter_readings)}

Next Steps:
1. Test API at http://localhost:8000/docs
2. View factory: GET /api/factories/{factory.id}
3. View machines: GET /api/machines/?factory_id={factory.id}
4. View orders: GET /api/orders/?factory_id={factory.id}
        """)
        
    except Exception as e:
        print(f"\n❌ Error during seeding: {e}")
        db.rollback()
        raise
    finally:
        db.close()