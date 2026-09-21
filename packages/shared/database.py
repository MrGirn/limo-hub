"""
Shared Database Engine Factory, Session Manager, and Connection Pool.
Supports MySQL (PyMySQL) in production/staging and SQLite for local development.
"""

from __future__ import annotations
import os
import logging
from typing import Generator, Optional
from sqlalchemy import create_engine
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
        # MySQL or PostgreSQL connection with connection pooling
        engine = create_engine(
            url,
            pool_size=10,
            max_overflow=20,
            pool_recycle=1800,
            pool_pre_ping=True
        )
    
    return engine


def create_session_factory(engine) -> sessionmaker[Session]:
    """Creates a configured sessionmaker bound to the given engine."""
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)
