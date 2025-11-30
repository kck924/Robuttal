import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Vote(Base):
    __tablename__ = "votes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    topic_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("topics.id"), nullable=True, index=True
    )
    debate_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("debates.id"), nullable=True, index=True
    )
    voted_for_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("models.id"), nullable=True
    )
    user_fingerprint: Mapped[str] = mapped_column(String(255), nullable=False)
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True
    )
    ip_address: Mapped[str] = mapped_column(String(45), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    # Relationships
    topic: Mapped["Topic | None"] = relationship(back_populates="votes")
    debate: Mapped["Debate | None"] = relationship(back_populates="votes")
    voted_for: Mapped["Model | None"] = relationship()
    user: Mapped["User | None"] = relationship(back_populates="votes")
