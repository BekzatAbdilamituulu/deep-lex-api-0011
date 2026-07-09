import os
import sys
from logging.config import fileConfig

from sqlalchemy import create_engine, pool

from alembic import context

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, BASE_DIR)

import app.models  # noqa: F401, E402
from app.config import settings  # noqa: E402
from app.database import Base, engine_options  # noqa: E402

DATABASE_URL = settings.resolved_database_url

print("ALEMBIC USING:", DATABASE_URL)

config = context.config

config.set_main_option("sqlalchemy.url", DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    options = engine_options(DATABASE_URL)
    if "pool_pre_ping" not in options:
        options["poolclass"] = pool.NullPool

    connectable = create_engine(DATABASE_URL, **options)

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
