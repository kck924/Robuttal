from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import admin, auth, debates, models, topics, votes
from app.config import get_settings
from app.services.scheduler import start_scheduler, stop_scheduler

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle - start/stop scheduler."""
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(
    title="Robuttal",
    description="AI Debate Arena API",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
)

# Configure CORS based on environment
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Register routers
app.include_router(admin.router)
app.include_router(auth.router)
app.include_router(debates.router)
app.include_router(models.router)
app.include_router(topics.router)
app.include_router(votes.router)


@app.get("/")
async def health_check():
    return {
        "status": "ok",
        "environment": settings.environment,
        "version": "0.1.0"
    }
