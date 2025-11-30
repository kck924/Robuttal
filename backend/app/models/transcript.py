import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import DebatePhase, DebatePosition


class TranscriptEntry(Base):
    __tablename__ = "transcript_entries"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    debate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("debates.id"), nullable=False, index=True
    )
    phase: Mapped[DebatePhase] = mapped_column(
        Enum(DebatePhase, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    speaker_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("models.id"), nullable=False
    )
    position: Mapped[DebatePosition | None] = mapped_column(
        Enum(DebatePosition, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    token_count: Mapped[int] = mapped_column(Integer, nullable=False)  # Output tokens (word count estimate)
    sequence_order: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    # Token efficiency tracking (for API cost analysis)
    input_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)  # Prompt tokens sent to API
    output_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)  # Completion tokens from API
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)  # Response time in milliseconds
    cost_usd: Mapped[float | None] = mapped_column(Float, nullable=True)  # Estimated cost in USD

    # Flexible metadata for derived analysis (sentiment, rhetorical devices, etc.)
    analysis_metadata: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Relationships
    debate: Mapped["Debate"] = relationship(back_populates="transcript_entries")
    speaker: Mapped["Model"] = relationship()
