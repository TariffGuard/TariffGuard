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
from app.services.synthetic_data import SyntheticDataGenerator

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


def clear_database():
    """Drop and recreate all tables."""
    logger.info("Clearing existing data...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    logger.info("Database cleared and recreated.")


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
        # Clear existing data (child tables first)
        logger.info("Clearing existing data...")
        db.query(Alert).delete()
        db.query(MeterReading).delete()
        db.query(WeatherReading).delete()
        db.query(ProductionOrder).delete()
        db.query(Machine).delete()
        db.query(Tariff).delete()
        db.query(Factory).delete()
        db.commit()
        logger.info("Existing data cleared.")

        # Generate synthetic data
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
        print(f"\nNext steps:")
        print(f"  1. Start the API:  uvicorn main:app --reload")
        print(f"  2. Open docs:      http://localhost:8000/docs")
        print(f"  3. Factory ID:     GET /api/factories/{summary['factory_id']}")
        print(f"  4. Machines:       GET /api/machines/?factory_id={summary['factory_id']}")
        print(f"  5. Orders:         GET /api/orders/?factory_id={summary['factory_id']}")

    except Exception as e:
        logger.error("Error during seeding: %s", e, exc_info=True)
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
