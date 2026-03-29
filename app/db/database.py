"""
app/db/database.py
Supports:
  - PostgreSQL (Neon/Supabase) when DATABASE_URL is set  ← production
  - SQLite /tmp on Vercel if DATABASE_URL not set        ← fallback only
  - SQLite local file in dev                             ← local
"""
import os
import logging
from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base

logger = logging.getLogger("agrodrone.db")

IS_VERCEL = os.environ.get("VERCEL") == "1"

# ── Database URL ───────────────────────────────────────────────────────────────
DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()

if DATABASE_URL:
    # Neon gives URLs starting with postgres:// — SQLAlchemy needs postgresql://
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

    # Neon requires SSL — add sslmode=require if not already present
    if "postgresql" in DATABASE_URL and "sslmode" not in DATABASE_URL:
        sep = "&" if "?" in DATABASE_URL else "?"
        DATABASE_URL = f"{DATABASE_URL}{sep}sslmode=require"

    IS_POSTGRES = True
    logger.info("✅ Using PostgreSQL (Neon)")

else:
    IS_POSTGRES = False
    if IS_VERCEL:
        DB_PATH = "/tmp/agrodrone.db"
        logger.warning(
            "⚠️  No DATABASE_URL set — using /tmp SQLite on Vercel. "
            "Data will reset on cold start. Set DATABASE_URL to your Neon PostgreSQL URL."
        )
    else:
        project_root = Path(__file__).parent.parent.parent
        DB_PATH = str(project_root / "agrodrone.db")
        logger.info("✅ Using local SQLite: %s", DB_PATH)

    DATABASE_URL = f"sqlite:///{DB_PATH}"

# ── Engine ─────────────────────────────────────────────────────────────────────
if IS_POSTGRES:
    engine = create_engine(
        DATABASE_URL,
        pool_size=5,
        max_overflow=10,
        pool_timeout=30,
        pool_recycle=1800,    # recycle connections every 30 min
        pool_pre_ping=True,   # verify connection before using from pool
        echo=False,
    )
else:
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=False,
    )

    # Enable WAL mode for SQLite — better concurrent reads
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from app.db import models  # noqa: F401 — registers all models with Base
    Base.metadata.create_all(bind=engine)
    logger.info("✅ DB tables ready — %s",
                "PostgreSQL (Neon)" if IS_POSTGRES else DATABASE_URL.split("///")[-1])