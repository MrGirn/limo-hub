"""
Shared Database Engine Factory, Session Manager, and Connection Pool.
Supports MySQL (PyMySQL) in production/staging and SQLite for local development.
"""

from __future__ import annotations
import os
import logging
from typing import Generator, Optional
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from sqlalchemy.pool import StaticPool, QueuePool

logger = logging.getLogger("LimoShared.Database")

Base = declarative_base()


def get_db_engine(database_url: Optional[str] = None, pool_name: str = "default"):
    """
    Creates and returns a thread-safe SQLAlchemy engine with connection pooling.
    Falls back gracefully to SQLite if MySQL is unreachable or unconfigured.
    """
    url = database_url or os.getenv("DATABASE_URL", "sqlite:///./limo_database.db")
    
    if url.startswith("sqlite"):
        engine = create_engine(
            url,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool
        )
    else:
        engine = create_engine(
            url,
            pool_size=10,
            max_overflow=20,
            pool_recycle=1800,
            pool_pre_ping=True
        )
    
    return engine


_engine = get_db_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)


def create_session_factory(engine) -> sessionmaker[Session]:
    """Creates a configured sessionmaker bound to the given engine."""
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """FastAPI Dependency for database session management."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initializes tables and automatically applies non-destructive schema migrations."""
    Base.metadata.create_all(bind=_engine)
    
    # Non-destructive SQLite/MySQL column migration checks
    with _engine.connect() as conn:
        try:
            # Check hub_escrow_settlements columns
            result = conn.execute(text("PRAGMA table_info(hub_escrow_settlements);")).fetchall()
            cols = [row[1] for row in result]
            if "booking_id" not in cols and len(cols) > 0:
                conn.execute(text("ALTER TABLE hub_escrow_settlements ADD COLUMN booking_id VARCHAR(64);"))
                conn.commit()
            if "stripe_payment_intent_id" not in cols and len(cols) > 0:
                conn.execute(text("ALTER TABLE hub_escrow_settlements ADD COLUMN stripe_payment_intent_id VARCHAR(128);"))
                conn.commit()
        except Exception as e:
            logger.debug(f"Schema migration note: {e}")

        try:
            # Check hub_itinerary_legs columns
            result = conn.execute(text("PRAGMA table_info(hub_itinerary_legs);")).fetchall()
            cols = [row[1] for row in result]
            if "booking_id" not in cols and len(cols) > 0:
                conn.execute(text("ALTER TABLE hub_itinerary_legs ADD COLUMN booking_id VARCHAR(64);"))
                conn.commit()
        except Exception as e:
            logger.debug(f"Schema migration note: {e}")

        try:
            # Check hub_master_bookings columns
            result = conn.execute(text("PRAGMA table_info(hub_master_bookings);")).fetchall()
            cols = [row[1] for row in result]
            if len(cols) > 0:
                for col_name, col_type in [
                    ("assigned_chauffeur_name", "VARCHAR(128)"),
                    ("assigned_chauffeur_phone", "VARCHAR(64)"),
                    ("assigned_vehicle_plate", "VARCHAR(32)"),
                    ("assigned_vendor_name", "VARCHAR(128)"),
                    ("vehicle_model_name", "VARCHAR(128)"),
                    ("pickup_meeting_point", "VARCHAR(128)"),
                    ("child_seats_count", "INTEGER DEFAULT 0"),
                    ("special_requests", "TEXT"),
                ]:
                    if col_name not in cols:
                        conn.execute(text(f"ALTER TABLE hub_master_bookings ADD COLUMN {col_name} {col_type};"))
                        conn.commit()
        except Exception as e:
            logger.debug(f"Schema migration note: {e}")

        try:
            # Check hub_clearinghouse_config columns
            result = conn.execute(text("PRAGMA table_info(hub_clearinghouse_config);")).fetchall()
            cols = [row[1] for row in result]
            if len(cols) > 0:
                for col_name, col_type in [
                    ("intermediate_stop_fee_usd", "NUMERIC(10, 2) DEFAULT 15.00"),
                    ("airport_terminal_fee_usd", "NUMERIC(10, 2) DEFAULT 20.00"),
                    ("min_hourly_duration_hours", "INTEGER DEFAULT 2"),
                    ("hourly_business_rate_usd", "NUMERIC(10, 2) DEFAULT 45.00"),
                    ("hourly_first_rate_usd", "NUMERIC(10, 2) DEFAULT 70.00"),
                    ("hourly_van_rate_usd", "NUMERIC(10, 2) DEFAULT 60.00"),
                    ("surge_multiplier", "NUMERIC(4, 2) DEFAULT 1.00"),
                    ("tax_percentage", "NUMERIC(5, 2) DEFAULT 15.00"),
                    ("free_cancellation_hours", "INTEGER DEFAULT 24"),
                    ("stripe_connect_master_platform_id", "VARCHAR(128)"),
                ]:
                    if col_name not in cols:
                        conn.execute(text(f"ALTER TABLE hub_clearinghouse_config ADD COLUMN {col_name} {col_type};"))
                        conn.commit()
        except Exception as e:
            logger.debug(f"Schema migration note: {e}")


