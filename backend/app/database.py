from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import declarative_base, sessionmaker

from .config import settings

DATABASE_URL = settings.resolved_database_url


def is_sqlite_url(database_url: str) -> bool:
    return make_url(database_url).drivername.startswith("sqlite")


def engine_options(database_url: str) -> dict:
    if is_sqlite_url(database_url):
        return {"connect_args": {"check_same_thread": False}}

    return {"pool_pre_ping": True}


def create_db_engine(database_url: str = DATABASE_URL):
    return create_engine(database_url, **engine_options(database_url))


engine = create_db_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
