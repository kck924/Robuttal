import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import DebateStatus


class Debate(Base):
    __tablename__ = "debates"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    topic_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("topics.id"), nullable=False, index=True
    )
    debater_pro_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("models.id"), nullable=False
    )
    debater_con_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("models.id"), nullable=False
    )
    judge_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("models.id"), nullable=False
    )
    auditor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("models.id"), nullable=False
    )
    winner_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("models.id"), nullable=True
    )
    pro_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    con_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    judge_score: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Per-category scores (0-25 each, from judge rubric)
    pro_logical_consistency: Mapped[int | None] = mapped_column(Integer, nullable=True)
    pro_evidence: Mapped[int | None] = mapped_column(Integer, nullable=True)
    pro_persuasiveness: Mapped[int | None] = mapped_column(Integer, nullable=True)
    pro_engagement: Mapped[int | None] = mapped_column(Integer, nullable=True)
    con_logical_consistency: Mapped[int | None] = mapped_column(Integer, nullable=True)
    con_evidence: Mapped[int | None] = mapped_column(Integer, nullable=True)
    con_persuasiveness: Mapped[int | None] = mapped_column(Integer, nullable=True)
    con_engagement: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Audit breakdown (1-10 each, from auditor)
    audit_accuracy: Mapped[int | None] = mapped_column(Integer, nullable=True)
    audit_fairness: Mapped[int | None] = mapped_column(Integer, nullable=True)
    audit_thoroughness: Mapped[int | None] = mapped_column(Integer, nullable=True)
    audit_reasoning_quality: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Elo change tracking
    pro_elo_before: Mapped[int | None] = mapped_column(Integer, nullable=True)
    pro_elo_after: Mapped[int | None] = mapped_column(Integer, nullable=True)
    con_elo_before: Mapped[int | None] = mapped_column(Integer, nullable=True)
    con_elo_after: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[DebateStatus] = mapped_column(
        Enum(DebateStatus, values_callable=lambda x: [e.value for e in x]),
        default=DebateStatus.SCHEDULED,
        nullable=False,
        index=True,
    )
    scheduled_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    # Flexible metadata for derived analysis (debate-level insights, aggregate metrics, etc.)
    analysis_metadata: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Blinded judging: if True, the judge doesn't know the model names during judgment
    # Randomly assigned (50/50) at debate creation for analysis purposes
    is_blinded: Mapped[bool] = mapped_column(default=False, nullable=False)

    # Relationships
    topic: Mapped["Topic"] = relationship(back_populates="debates")
    debater_pro: Mapped["Model"] = relationship(foreign_keys=[debater_pro_id])
    debater_con: Mapped["Model"] = relationship(foreign_keys=[debater_con_id])
    judge: Mapped["Model"] = relationship(foreign_keys=[judge_id])
    auditor: Mapped["Model"] = relationship(foreign_keys=[auditor_id])
    winner: Mapped["Model | None"] = relationship(foreign_keys=[winner_id])
    transcript_entries: Mapped[list["TranscriptEntry"]] = relationship(
        back_populates="debate", order_by="TranscriptEntry.sequence_order"
    )
    votes: Mapped[list["Vote"]] = relationship(back_populates="debate")
