"""add hierarchical taxonomy to topics

Revision ID: a3b2c1d4e5f6
Revises: fcffd30afa77
Create Date: 2025-11-30 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a3b2c1d4e5f6'
down_revision: Union[str, None] = 'fcffd30afa77'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Legacy to new taxonomy mapping
LEGACY_CATEGORY_MAP = {
    "Ethics": ("Morality & Values", "Philosophy & Ethics"),
    "Technology": ("AI & Computing", "Science & Technology"),
    "Philosophy": ("Consciousness & Mind", "Philosophy & Ethics"),
    "Politics": ("Public Policy", "Politics & Governance"),
    "Society": ("Media & Entertainment", "Society & Culture"),
    "Science": ("Medicine & Health", "Science & Technology"),
    "Economics": ("Markets & Trade", "Economics & Business"),
}


def upgrade() -> None:
    # Add new columns with default values first
    op.add_column(
        'topics',
        sa.Column('subdomain', sa.String(100), nullable=True)
    )
    op.add_column(
        'topics',
        sa.Column('domain', sa.String(100), nullable=True)
    )

    # Migrate existing data - use raw SQL for each legacy category
    for old_cat, (subdomain, domain) in LEGACY_CATEGORY_MAP.items():
        op.execute(
            sa.text(
                f"UPDATE topics SET subdomain = :subdomain, domain = :domain WHERE category = :old_cat"
            ).bindparams(subdomain=subdomain, domain=domain, old_cat=old_cat)
        )

    # Handle any topics with unknown categories (default to AI & Computing)
    op.execute(
        sa.text(
            "UPDATE topics SET subdomain = 'AI & Computing', domain = 'Science & Technology' "
            "WHERE subdomain IS NULL"
        )
    )

    # Now make columns non-nullable
    op.alter_column('topics', 'subdomain', nullable=False)
    op.alter_column('topics', 'domain', nullable=False)

    # Add indexes for the new columns
    op.create_index('ix_topics_subdomain', 'topics', ['subdomain'])
    op.create_index('ix_topics_domain', 'topics', ['domain'])


def downgrade() -> None:
    op.drop_index('ix_topics_subdomain', table_name='topics')
    op.drop_index('ix_topics_domain', table_name='topics')
    op.drop_column('topics', 'domain')
    op.drop_column('topics', 'subdomain')
