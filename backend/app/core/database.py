import os
import ssl
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./test.db")
DB_SSL_CA = os.getenv("DB_SSL_CA", None)

# Automatically convert standard mysql:// to mysql+pymysql:// to use PyMySQL
if DATABASE_URL.startswith("mysql://"):
    DATABASE_URL = "mysql+pymysql://" + DATABASE_URL[len("mysql://"):]

connect_args = {}

if DATABASE_URL.startswith("mysql"):
    parsed = urlparse(DATABASE_URL)
    query_params = parse_qs(parsed.query)

    # PyMySQL expects SSL options via connect_args or ssl_ca kwarg, not ssl_mode/ssl-mode
    ssl_requested = bool(
        query_params.pop("ssl_mode", None)
        or query_params.pop("ssl-mode", None)
        or "aivencloud.com" in parsed.netloc
        or DB_SSL_CA
    )

    clean_query = urlencode(query_params, doseq=True)
    clean_db_url = urlunparse((
        "mysql+pymysql",
        parsed.netloc,
        parsed.path,
        parsed.params,
        clean_query,
        parsed.fragment
    ))

    # Timeouts to prevent hanging indefinitely
    connect_args["connect_timeout"] = 15
    connect_args["read_timeout"] = 30
    connect_args["write_timeout"] = 30

    # Configure SSL for Cloud MySQL (Aiven, RDS, Cloud SQL)
    if ssl_requested:
        if DB_SSL_CA and os.path.exists(DB_SSL_CA):
            connect_args["ssl"] = {"ca": DB_SSL_CA}
        else:
            # Enable TLS without requiring a local certificate file
            connect_args["ssl"] = {"check_hostname": False}

    engine = create_engine(
        clean_db_url,
        connect_args=connect_args,
        pool_pre_ping=True,
        pool_recycle=3600,
        echo=False
    )
else:
    # For SQLite fallback
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Create all tables"""
    Base.metadata.create_all(bind=engine)
    print("Database initialized successfully!")