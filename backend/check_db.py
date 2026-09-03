"""
TariffGuard Database Health & Connectivity Checker
Works universally with Local MySQL, Aiven Cloud MySQL, and SQLite.
"""

import sys
import json
from sqlalchemy import inspect, text
from app.core.database import engine

def check_database():
    print("=" * 60)
    print("  TariffGuard — Database Connectivity & Table Inspector")
    print("=" * 60)
    print(f"  Target Engine: {engine.url.drivername}://{engine.url.host or 'local'}:{engine.url.port or ''}/{engine.url.database or ''}")
    print("=" * 60)

    try:
        with engine.connect() as conn:
            # Test simple ping
            result = conn.execute(text("SELECT 1")).scalar()
            print("  [SUCCESS] Database connection established successfully!\n")

            inspector = inspect(engine)
            tables = inspector.get_table_names()

            if not tables:
                print("  [INFO] Database is connected, but no tables found.")
                print("  Run 'python -m seed' or start backend to initialize tables.")
                return

            print(f"  Found {len(tables)} tables:")
            table_summary = {}

            for table in sorted(tables):
                try:
                    count = conn.execute(text(f"SELECT COUNT(*) FROM `{table}`")).scalar()
                    table_summary[table] = count
                    print(f"    - {table:<25} : {count:>6} rows")
                except Exception as table_err:
                    table_summary[table] = f"Error: {table_err}"
                    print(f"    - {table:<25} : [ERROR reading count]")

            print("\n" + "=" * 60)
            print("  All checks completed successfully.")
            print("=" * 60)

    except Exception as e:
        err_msg = str(e)
        print("\n  [ERROR] Failed to connect to database:")
        print(f"  {err_msg}\n")
        print("=" * 60)
        print("  Troubleshooting Checklist for Aiven Cloud:")
        print("    1. Verify Service Type in Aiven Console:")
        print("       Is the service icon 'MySQL' (Dolphin)?")
        print("       (If it is PostgreSQL, Kafka, or Redis, create a MySQL 8.0 service).")
        print("    2. Copy Service URI from Aiven Console Overview tab:")
        print("       e.g. mysql://avnadmin:PASSWORD@HOST:PORT/defaultdb")
        print("    3. Ensure Status is green 'Running' (not yellow 'Rebuilding').")
        print("=" * 60)
        sys.exit(1)

if __name__ == "__main__":
    check_database()
