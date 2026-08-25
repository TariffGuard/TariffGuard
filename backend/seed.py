from datetime import datetime, timedelta
from app.core.database import SessionLocal, init_db
from app.models.factory import Factory
from app.models.machine import Machine
from app.models.production_order import ProductionOrder
from app.models.tariff import Tariff
from datetime import date

def seed_data():
    """Seed the database with demo data"""
    db = SessionLocal()
    
    try:
        # Create Factory
        factory = Factory(
            name="Faisalabad Textile Unit 01",
            location="Faisalabad",
            tariff_category="Industrial",
            sanctioned_load_kw=250,
            solar_capacity_kw=100,
            operating_hours="08:00-22:00"
        )
        db.add(factory)
        db.commit()
        db.refresh(factory)
        
        # Create Machines
        machines = [
            Machine(
                factory_id=factory.id,
                name="Dyeing Machine 01",
                machine_type="Dyeing",
                power_kw=45,
                min_run_minutes=120,
                shiftable=True
            ),
            Machine(
                factory_id=factory.id,
                name="Spinning Machine 01",
                machine_type="Spinning",
                power_kw=30,
                min_run_minutes=60,
                shiftable=True
            ),
            Machine(
                factory_id=factory.id,
                name="Weaving Machine 01",
                machine_type="Weaving",
                power_kw=25,
                min_run_minutes=90,
                shiftable=False
            )
        ]
        db.add_all(machines)
        db.commit()
        
        # Create Tariffs
        tariffs = [
            Tariff(
                category="Industrial",
                period_name="Off-Peak",
                start_time="00:00",
                end_time="18:00",
                rate_pkr_per_kwh=25.0,
                effective_from=date.today(),
                source="NEPRA Demo"
            ),
            Tariff(
                category="Industrial",
                period_name="Peak",
                start_time="18:00",
                end_time="22:00",
                rate_pkr_per_kwh=35.0,
                effective_from=date.today(),
                source="NEPRA Demo"
            )
        ]
        db.add_all(tariffs)
        db.commit()
        
        print("✅ Demo data seeded successfully!")
        print(f"Factory ID: {factory.id}")
        print(f"Machines created: {len(machines)}")
        print(f"Tariffs created: {len(tariffs)}")
        
    except Exception as e:
        print(f"❌ Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
    seed_data()