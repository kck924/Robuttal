"""add times_excused to models

Revision ID: fcffd30afa77
Revises: 2ea1c5d2fbf8
Create Date: 2025-11-29 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fcffd30afa77'
down_revision: Union[str, None] = '2ea1c5d2fbf8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add times_excused column to models table to track content filter excuses
    op.add_column(
        'models',
        sa.Column('times_excused', sa.Integer(), nullable=False, server_default='0')
    )


def downgrade() -> None:
    op.drop_column('models', 'times_excused')
