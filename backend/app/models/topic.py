import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import TopicSource, TopicStatus


class Topic(Base):
    __tablename__ = "topics"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    # Subdomain is the specific category (e.g., "AI & Computing")
    subdomain: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    # Domain is the parent category (e.g., "Science & Technology")
    domain: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    # Legacy category field - kept for backwards compatibility during migration
    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    source: Mapped[TopicSource] = mapped_column(
        Enum(TopicSource, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        index=True,
    )
    submitted_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    vote_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[TopicStatus] = mapped_column(
        Enum(TopicStatus, values_callable=lambda x: [e.value for e in x]),
        default=TopicStatus.PENDING,
        nullable=False,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    debated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Relationships
    debates: Mapped[list["Debate"]] = relationship(back_populates="topic")
    votes: Mapped[list["Vote"]] = relationship(back_populates="topic")
