"""Add approved to topicstatus enum

Revision ID: c5d6e7f8g9h0
Revises: 2ea1c5d2fbf8
Create Date: 2024-11-30 22:40:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "c5d6e7f8g9h0"
down_revision: Union[str, None] = "b4c5d6e7f8g9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add 'approved' value to topicstatus enum
    op.execute("ALTER TYPE topicstatus ADD VALUE IF NOT EXISTS 'approved' AFTER 'pending'")


def downgrade() -> None:
    # PostgreSQL doesn't support removing enum values easily
    # Would need to recreate the type, which is complex
    pass
