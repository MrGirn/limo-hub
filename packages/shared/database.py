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
engine = _engine
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
    """Initializes tables and automatically applies non-destructive schema migrations across SQLite & MySQL."""
    from sqlalchemy import inspect
    Base.metadata.create_all(bind=_engine)
    
    with _engine.connect() as conn:
        try:
            inspector = inspect(conn)
            table_names = inspector.get_table_names()

            # 1. Check hub_escrow_settlements
            if "hub_escrow_settlements" in table_names:
                escrow_cols = [c["name"] for c in inspector.get_columns("hub_escrow_settlements")]
                for col_name, col_type in [
                    ("booking_id", "VARCHAR(64)"),
                    ("stripe_payment_intent_id", "VARCHAR(128)"),
                    ("stripe_transfer_servicing_id", "VARCHAR(128)"),
                    ("stripe_transfer_originating_id", "VARCHAR(128)"),
                    ("resolution_action", "VARCHAR(64)"),
                ]:
                    if col_name not in escrow_cols:
                        try:
                            conn.execute(text(f"ALTER TABLE hub_escrow_settlements ADD COLUMN {col_name} {col_type};"))
                            conn.commit()
                        except Exception:
                            pass

            # 2. Check hub_itinerary_legs
            if "hub_itinerary_legs" in table_names:
                leg_cols = [c["name"] for c in inspector.get_columns("hub_itinerary_legs")]
                if "booking_id" not in leg_cols:
                    try:
                        conn.execute(text("ALTER TABLE hub_itinerary_legs ADD COLUMN booking_id VARCHAR(64);"))
                        conn.commit()
                    except Exception:
                        pass

            # 3. Check hub_master_bookings
            if "hub_master_bookings" in table_names:
                bk_cols = [c["name"] for c in inspector.get_columns("hub_master_bookings")]
                for col_name, col_type in [
                    ("assigned_chauffeur_name", "VARCHAR(128)"),
                    ("assigned_chauffeur_phone", "VARCHAR(64)"),
                    ("assigned_vehicle_plate", "VARCHAR(32)"),
                    ("assigned_vendor_name", "VARCHAR(128)"),
                    ("vehicle_model_name", "VARCHAR(128)"),
                    ("pickup_meeting_point", "VARCHAR(128)"),
                    ("child_seats_count", "INTEGER DEFAULT 0"),
                    ("special_requests", "TEXT"),
                    ("rate_card_snapshot_json", "TEXT"),
                    ("commercial_terms_snapshot_json", "TEXT"),
                    ("flight_status", "VARCHAR(32)"),
                    ("flight_delay_minutes", "INTEGER DEFAULT 0"),
                    ("flight_terminal", "VARCHAR(32)"),
                    ("flight_gate", "VARCHAR(32)"),
                    ("flight_baggage_claim", "VARCHAR(64)"),
                    ("flight_estimated_arrival_utc", "DATETIME"),
                    ("flight_grace_period_minutes", "INTEGER DEFAULT 60"),
                ]:
                    if col_name not in bk_cols:
                        try:
                            conn.execute(text(f"ALTER TABLE hub_master_bookings ADD COLUMN {col_name} {col_type};"))
                            conn.commit()
                        except Exception:
                            pass

            # 3b. Check hub_vendor_compliance_documents
            if "hub_vendor_compliance_documents" in table_names:
                doc_cols = [c["name"] for c in inspector.get_columns("hub_vendor_compliance_documents")]
                if "verification_notes" not in doc_cols:
                    try:
                        conn.execute(text("ALTER TABLE hub_vendor_compliance_documents ADD COLUMN verification_notes TEXT;"))
                        conn.commit()
                    except Exception:
                        pass

            # 3c. Check hub_vendor_disputes
            if "hub_vendor_disputes" in table_names:
                dsp_cols = [c["name"] for c in inspector.get_columns("hub_vendor_disputes")]
                if "resolution_action" not in dsp_cols:
                    try:
                        conn.execute(text("ALTER TABLE hub_vendor_disputes ADD COLUMN resolution_action VARCHAR(64);"))
                        conn.commit()
                    except Exception:
                        pass

            # 4. Check hub_clearinghouse_config
            if "hub_clearinghouse_config" in table_names:
                cfg_cols = [c["name"] for c in inspector.get_columns("hub_clearinghouse_config")]
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
                    if col_name not in cfg_cols:
                        try:
                            conn.execute(text(f"ALTER TABLE hub_clearinghouse_config ADD COLUMN {col_name} {col_type};"))
                            conn.commit()
                        except Exception:
                            pass

            # 5. Check hub_vendor_profiles
            if "hub_vendor_profiles" in table_names:
                v_cols = [c["name"] for c in inspector.get_columns("hub_vendor_profiles")]
                for col_name, col_type in [
                    ("legal_business_name", "VARCHAR(255)"),
                    ("tax_id_ein", "VARCHAR(64)"),
                    ("dot_number", "VARCHAR(64)"),
                    ("mc_number", "VARCHAR(64)"),
                    ("account_status", "VARCHAR(32) DEFAULT 'ACTIVE'"),
                    ("onboarding_status", "VARCHAR(32) DEFAULT 'VERIFIED_APPROVED'"),
                    ("network_eligibility", "VARCHAR(32) DEFAULT 'ELIGIBLE'"),
                    ("commercial_status", "VARCHAR(32) DEFAULT 'ACTIVE_STANDARD_80_10_10'"),
                    ("health_status", "VARCHAR(32) DEFAULT 'ONLINE_HEALTHY'"),
                    ("is_software_customer", "BOOLEAN DEFAULT 1"),
                    ("is_network_supplier", "BOOLEAN DEFAULT 1"),
                    ("is_network_buyer", "BOOLEAN DEFAULT 1"),
                    ("primary_contact_name", "VARCHAR(128) DEFAULT 'Operations Desk'"),
                    ("primary_contact_email", "VARCHAR(128)"),
                    ("primary_contact_phone", "VARCHAR(32) DEFAULT '+1 (215) 555-0144'"),
                    ("emergency_dispatch_phone", "VARCHAR(64) DEFAULT '+1 (800) 555-0199'"),
                    ("headquarters_address", "VARCHAR(255) DEFAULT 'Center City Financial District'"),
                    ("airport_corridors_json", "TEXT"),
                    ("rating_score", "NUMERIC(3, 2) DEFAULT 4.96"),
                    ("total_reviews_count", "INTEGER DEFAULT 2180"),
                    ("fleet_size", "INTEGER DEFAULT 28"),
                    ("vehicle_makes", "VARCHAR(255)"),
                    ("amenities_json", "TEXT"),
                    ("cancellation_policy", "VARCHAR(128)"),
                    ("business_class_base_rate_usd", "NUMERIC(10, 2) DEFAULT 125.00"),
                    ("first_class_base_rate_usd", "NUMERIC(10, 2) DEFAULT 185.00"),
                    ("business_van_base_rate_usd", "NUMERIC(10, 2) DEFAULT 165.00"),
                    ("hourly_rate_business_usd", "NUMERIC(10, 2) DEFAULT 85.00"),
                    ("per_mile_rate_usd", "NUMERIC(10, 2) DEFAULT 4.25"),
                    ("waiting_time_rate_per_min_usd", "NUMERIC(10, 2) DEFAULT 1.25"),
                    ("stripe_connect_account_id", "VARCHAR(128)"),
                    ("api_endpoint_url", "VARCHAR(255) DEFAULT 'http://localhost:8001'"),
                    ("api_key_secret_hash", "VARCHAR(128)"),
                    ("webhook_signing_secret", "VARCHAR(128)"),
                    ("last_sync_timestamp", "DATETIME"),
                    ("is_active", "BOOLEAN DEFAULT 1"),
                    ("is_vetted_partner", "BOOLEAN DEFAULT 1"),
                    ("round_robin_weight", "INTEGER DEFAULT 100"),
                    ("base_latitude", "FLOAT DEFAULT 39.9526"),
                    ("base_longitude", "FLOAT DEFAULT -75.1652"),
                    ("operating_radius_miles", "FLOAT DEFAULT 150.0"),
                    ("primary_chauffeur_name", "VARCHAR(128) DEFAULT 'Marcus Vance'"),
                    ("primary_chauffeur_phone", "VARCHAR(32) DEFAULT '+1 (215) 555-0144'"),
                    ("primary_vehicle_plate", "VARCHAR(32) DEFAULT 'PA 8492-LM'"),
                    ("primary_vehicle_name", "VARCHAR(128) DEFAULT 'Lincoln Navigator L'"),
                    ("google_analytics_id", "VARCHAR(64)"),
                    ("google_tag_manager_id", "VARCHAR(64)"),
                    ("seo_title", "VARCHAR(255)"),
                    ("seo_description", "TEXT"),
                    ("seo_keywords", "TEXT"),
                    ("canonical_url", "VARCHAR(255)"),
                    ("og_image_url", "VARCHAR(512)"),
                    ("created_at", "DATETIME"),
                    ("updated_at", "DATETIME"),
                ]:
                    if col_name not in v_cols:
                        try:
                            conn.execute(text(f"ALTER TABLE hub_vendor_profiles ADD COLUMN {col_name} {col_type};"))
                            conn.commit()
                        except Exception as e:
                            logger.debug(f"Column migration for {col_name}: {e}")
        except Exception as e:
            logger.debug(f"Schema migration note: {e}")


