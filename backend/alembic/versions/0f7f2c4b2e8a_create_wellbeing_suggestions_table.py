"""
create wellbeing_suggestions table

Revision ID: 0f7f2c4b2e8a
Revises: 9c2d9f48a3a1
Create Date: 2025-11-20 13:20:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0f7f2c4b2e8a"
down_revision: Union[str, Sequence[str], None] = "9c2d9f48a3a1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "wellbeing_suggestions",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("mood_checkin_id", sa.Integer(), sa.ForeignKey("mood_checkins.id"), nullable=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=False),
        sa.Column("category", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("wellbeing_suggestions")