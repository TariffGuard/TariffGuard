import pytest
from app.core.database import init_db, SessionLocal
from app.models.factory import Factory
from app.services.synthetic_data import SyntheticDataGenerator

@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Ensure database tables and initial test data exist before tests run"""
    init_db()
    db = SessionLocal()
    try:
        if not db.query(Factory).first():
            generator = SyntheticDataGenerator(db, days=14)
            generator.generate()
    finally:
        db.close()
