import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Model(Base):
    __tablename__ = "models"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    provider: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    api_model_id: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    elo_rating: Mapped[int] = mapped_column(Integer, default=1500, nullable=False)
    debates_won: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    debates_lost: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    times_judged: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    avg_judge_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    times_excused: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
