"""
TariffGuard Seed Data Script
Generates a realistic demo dataset for a Faisalabad textile factory.

Usage:
    python -m seed                 # 90 days (default)
    python -m seed --days 60       # 60 days
    python -m seed --days 30 --seed 99
"""

import argparse
import logging
import sys

from app.core.database import SessionLocal, init_db, Base, engine
from app.models.factory import Factory
from app.models.machine import Machine
from app.models.production_order import ProductionOrder
from app.models.tariff import Tariff
from app.models.meter_reading import MeterReading
from app.models.weather_reading import WeatherReading
from app.models.alert import Alert
from app.models.user import User
from app.services.synthetic_data import SyntheticDataGenerator
from app.services.auth import AuthService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


def clear_database():
    """Do NOT clear database. Keep existing data."""
    logger.info("Skipping database clear (preserving all existing data)...")
    pass


def create_default_users(db):
    """Create default users if they don't exist."""
    users = [
        {"username": "owner", "email": "i243150@isb.nu.edu.pk", "password": "Test@123", "role": "owner"},
        {"username": "manager", "email": "manager@tariffguard.com", "password": "Test@123", "role": "manager"},
        {"username": "supervisor", "email": "supervisor@tariffguard.com", "password": "Test@123", "role": "supervisor"},
        {"username": "viewer", "email": "viewer@tariffguard.com", "password": "Test@123", "role": "viewer"},
    ]
    
    for user_data in users:
        existing = db.query(User).filter(User.username == user_data["username"]).first()
        if not existing:
            AuthService.create_user(
                db,
                username=user_data["username"],
                email=user_data["email"],
                password=user_data["password"],
                role=user_data["role"]
            )
            logger.info(f"Created user: {user_data['username']} (role: {user_data['role']})")
        else:
            logger.info(f"User already exists: {user_data['username']}")


def main():
    parser = argparse.ArgumentParser(description="TariffGuard seed data generator")
    parser.add_argument(
        "--days", type=int, default=90, help="Number of days of data to generate"
    )
    parser.add_argument(
        "--seed", type=int, default=42, help="Random seed for reproducibility"
    )
    args = parser.parse_args()

    print("=" * 60)
    print("  TariffGuard — Synthetic Data Seeder")
    print("=" * 60)
    print(f"  Days:  {args.days}")
    print(f"  Seed:  {args.seed}")
    print("=" * 60)

    # Initialize database
    logger.info("Initializing database...")
    init_db()

    db = SessionLocal()

    try:
        # Create default users (if not exist)
        create_default_users(db)

        # Generate synthetic data (adds to existing)
        gen = SyntheticDataGenerator(db, days=args.days, seed=args.seed)
        summary = gen.generate()

        print("\n" + "=" * 60)
        print("  SEED DATA COMPLETE")
        print("=" * 60)
        print(f"  Factory:          {summary['factory_name']}")
        print(f"  Machines:         {summary['machines']}")
        print(f"  Tariff periods:   {summary['tariffs']}")
        print(f"  Weather records:  {summary['weather_records']}")
        print(f"  Meter readings:   {summary['meter_readings']}")
        print(f"  Production orders:{summary['production_orders']}")
        print(f"  Days covered:     {summary['days']}")
        print(f"  Data source:      {summary['data_source']}")
        print("=" * 60)
        print(f"\nDefault Users (password: Test@123):")
        print(f"  - owner / Test@123 (Owner)")
        print(f"  - manager / Test@123 (Manager)")
        print(f"  - supervisor / Test@123 (Supervisor)")
        print(f"  - viewer / Test@123 (Viewer)")
        print(f"\nNext steps:")
        print(f"  1. Start the API:  uvicorn main:app --reload")
        print(f"  2. Open docs:      http://localhost:8000/docs")
        print(f"  3. Factory ID:     GET /api/factories/{summary['factory_id']}")

    except Exception as e:
        logger.error("Error during seeding: %s", e, exc_info=True)
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()