import ssl

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.config import get_settings

settings = get_settings()

# Build connect_args for asyncpg
connect_args = {
    # Disable statement caching for pgbouncer compatibility (Supabase pooler)
    "statement_cache_size": 0,
    "prepared_statement_cache_size": 0,
}

# Add SSL for Supabase connections
if settings.is_supabase:
    # Create SSL context for Supabase
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    connect_args["ssl"] = ssl_context

# Use NullPool since Supabase already handles connection pooling
engine = create_async_engine(
    settings.async_database_url,
    echo=settings.debug,
    poolclass=NullPool,
    connect_args=connect_args,
)

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
