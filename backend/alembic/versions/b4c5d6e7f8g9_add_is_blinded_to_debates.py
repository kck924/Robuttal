"""add is_blinded to debates

Revision ID: b4c5d6e7f8g9
Revises: a3b2c1d4e5f6
Create Date: 2025-11-30 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b4c5d6e7f8g9'
down_revision: Union[str, None] = 'a3b2c1d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add is_blinded column with default False
    # Existing debates will be marked as non-blinded (False)
    # New debates will randomly be assigned True/False (50/50) by the scheduler
    op.add_column(
        'debates',
        sa.Column('is_blinded', sa.Boolean(), nullable=False, server_default='false')
    )


def downgrade() -> None:
    op.drop_column('debates', 'is_blinded')
