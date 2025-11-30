"""Initial schema

Revision ID: 001
Revises:
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enum types
    topic_source = postgresql.ENUM("seed", "user", name="topicsource", create_type=False)
    topic_source.create(op.get_bind(), checkfirst=True)

    topic_status = postgresql.ENUM(
        "pending", "selected", "debated", "rejected", name="topicstatus", create_type=False
    )
    topic_status.create(op.get_bind(), checkfirst=True)

    debate_status = postgresql.ENUM(
        "scheduled", "in_progress", "judging", "completed", name="debatestatus", create_type=False
    )
    debate_status.create(op.get_bind(), checkfirst=True)

    debate_phase = postgresql.ENUM(
        "opening", "rebuttal", "cross_examination", "closing", "judgment", "audit",
        name="debatephase", create_type=False
    )
    debate_phase.create(op.get_bind(), checkfirst=True)

    debate_position = postgresql.ENUM(
        "pro", "con", "judge", "auditor", name="debateposition", create_type=False
    )
    debate_position.create(op.get_bind(), checkfirst=True)

    # Create models table
    op.create_table(
        "models",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("provider", sa.String(50), nullable=False),
        sa.Column("api_model_id", sa.String(100), nullable=False),
        sa.Column("elo_rating", sa.Integer(), nullable=False, server_default="1500"),
        sa.Column("debates_won", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("debates_lost", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("times_judged", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("avg_judge_score", sa.Float(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("api_model_id"),
    )
    op.create_index("ix_models_provider", "models", ["provider"])

    # Create users table
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("provider", sa.String(50), nullable=False),
        sa.Column("provider_id", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )

    # Create topics table
    op.create_table(
        "topics",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column(
            "source",
            postgresql.ENUM("seed", "user", name="topicsource", create_type=False),
            nullable=False,
        ),
        sa.Column("submitted_by", sa.String(255), nullable=True),
        sa.Column("vote_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "status",
            postgresql.ENUM(
                "pending", "selected", "debated", "rejected",
                name="topicstatus", create_type=False
            ),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("debated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_topics_category", "topics", ["category"])
    op.create_index("ix_topics_source", "topics", ["source"])
    op.create_index("ix_topics_status", "topics", ["status"])

    # Create debates table
    op.create_table(
        "debates",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("topic_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("debater_pro_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("debater_con_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("judge_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("auditor_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("winner_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("pro_score", sa.Integer(), nullable=True),
        sa.Column("con_score", sa.Integer(), nullable=True),
        sa.Column("judge_score", sa.Float(), nullable=True),
        sa.Column(
            "status",
            postgresql.ENUM(
                "scheduled", "in_progress", "judging", "completed",
                name="debatestatus", create_type=False
            ),
            nullable=False,
            server_default="scheduled",
        ),
        sa.Column("scheduled_at", sa.DateTime(), nullable=False),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["topic_id"], ["topics.id"]),
        sa.ForeignKeyConstraint(["debater_pro_id"], ["models.id"]),
        sa.ForeignKeyConstraint(["debater_con_id"], ["models.id"]),
        sa.ForeignKeyConstraint(["judge_id"], ["models.id"]),
        sa.ForeignKeyConstraint(["auditor_id"], ["models.id"]),
        sa.ForeignKeyConstraint(["winner_id"], ["models.id"]),
    )
    op.create_index("ix_debates_topic_id", "debates", ["topic_id"])
    op.create_index("ix_debates_status", "debates", ["status"])

    # Create transcript_entries table
    op.create_table(
        "transcript_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("debate_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "phase",
            postgresql.ENUM(
                "opening", "rebuttal", "cross_examination", "closing", "judgment", "audit",
                name="debatephase", create_type=False
            ),
            nullable=False,
        ),
        sa.Column("speaker_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "position",
            postgresql.ENUM(
                "pro", "con", "judge", "auditor",
                name="debateposition", create_type=False
            ),
            nullable=True,
        ),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("token_count", sa.Integer(), nullable=False),
        sa.Column("sequence_order", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["debate_id"], ["debates.id"]),
        sa.ForeignKeyConstraint(["speaker_id"], ["models.id"]),
    )
    op.create_index("ix_transcript_entries_debate_id", "transcript_entries", ["debate_id"])

    # Create votes table
    op.create_table(
        "votes",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("topic_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("debate_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("voted_for_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("user_fingerprint", sa.String(255), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["topic_id"], ["topics.id"]),
        sa.ForeignKeyConstraint(["debate_id"], ["debates.id"]),
        sa.ForeignKeyConstraint(["voted_for_id"], ["models.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
    )
    op.create_index("ix_votes_topic_id", "votes", ["topic_id"])
    op.create_index("ix_votes_debate_id", "votes", ["debate_id"])
    op.create_index("ix_votes_user_id", "votes", ["user_id"])


def downgrade() -> None:
    op.drop_table("votes")
    op.drop_table("transcript_entries")
    op.drop_table("debates")
    op.drop_table("topics")
    op.drop_table("users")
    op.drop_table("models")

    # Drop enum types
    op.execute("DROP TYPE IF EXISTS debateposition")
    op.execute("DROP TYPE IF EXISTS debatephase")
    op.execute("DROP TYPE IF EXISTS debatestatus")
    op.execute("DROP TYPE IF EXISTS topicstatus")
    op.execute("DROP TYPE IF EXISTS topicsource")
