from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Base
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./ncpor_portal.db").strip("\"'")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
elif DATABASE_URL.startswith("postgresql://") and not DATABASE_URL.startswith("postgresql+psycopg2://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)
    
    # Auto-migration to add missing columns to existing database
    from sqlalchemy import text
    try:
        with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
            columns_to_add = [
                "ADD COLUMN source_type VARCHAR DEFAULT 'expedition'",
                "ADD COLUMN source_id INTEGER",
                "ADD COLUMN generated_title VARCHAR",
                "ADD COLUMN suggested_media_id INTEGER",
                "ADD COLUMN publish_status VARCHAR"
            ]
            for col in columns_to_add:
                try:
                    conn.execute(text(f"ALTER TABLE generated_content {col}"))
                except Exception:
                    pass
    except Exception as e:
        print(f"Migration error: {e}")
