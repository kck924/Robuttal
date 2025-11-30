import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import DebatePhase, DebatePosition


class ContentFilterExcuse(Base):
    """
    Log of models excused from debates due to content filter triggers.

    This tracks when a model's content filter prevents it from participating,
    allowing us to monitor provider reliability and display this info to users.
    """
    __tablename__ = "content_filter_excuses"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    debate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("debates.id"), nullable=False, index=True
    )
    model_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("models.id"), nullable=False, index=True
    )
    replacement_model_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("models.id"), nullable=True
    )
    role: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # 'debater_pro', 'debater_con', 'judge', 'auditor'
    phase: Mapped[DebatePhase | None] = mapped_column(
        Enum(DebatePhase, values_callable=lambda x: [e.value for e in x]),
        nullable=True
    )
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    # Relationships
    debate: Mapped["Debate"] = relationship(foreign_keys=[debate_id])
    model: Mapped["Model"] = relationship(foreign_keys=[model_id])
    replacement_model: Mapped["Model | None"] = relationship(foreign_keys=[replacement_model_id])
