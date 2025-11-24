"""Add additional_metrics JSON column to mood_checkins

Revision ID: 9c2d9f48a3a1
Revises: 53ff4a042f10
Create Date: 2025-11-20 12:23:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "9c2d9f48a3a1"
down_revision: Union[str, Sequence[str], None] = "53ff4a042f10"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add JSON column for flexible wellbeing metrics
    op.add_column(
        "mood_checkins",
        sa.Column("additional_metrics", sa.JSON(), nullable=True),
    )


def downgrade() -> None:
    # Remove the column on downgrade
    op.drop_column("mood_checkins", "additional_metrics")