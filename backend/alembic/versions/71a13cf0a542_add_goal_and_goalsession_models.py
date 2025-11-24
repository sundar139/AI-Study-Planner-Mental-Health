"""add_goal_and_goalsession_models

Revision ID: 71a13cf0a542
Revises: 0f7f2c4b2e8a
Create Date: 2025-11-20 19:03:16.204283

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '71a13cf0a542'
down_revision: Union[str, Sequence[str], None] = '0f7f2c4b2e8a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    bind = op.get_bind()
    
    # Create enum type for GoalSessionStatus (only if it doesn't exist)
    # Check if enum already exists by querying pg_type
    result = bind.execute(sa.text(
        "SELECT 1 FROM pg_type WHERE typname = 'goalsessionstatus'"
    )).fetchone()
    
    if not result:
        op.execute(sa.text(
            "CREATE TYPE goalsessionstatus AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'SKIPPED')"
        ))
    
    # Create goals table (only if it doesn't exist)
    if not bind.dialect.has_table(bind, "goals"):
        op.create_table(
            "goals",
            sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("name", sa.String(), nullable=False),
            sa.Column("duration_minutes", sa.Integer(), nullable=False),
            sa.Column("preferred_time_window", sa.String(), nullable=True),
            sa.Column("sessions_per_week", sa.Integer(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index("ix_goals_id", "goals", ["id"], unique=False)
    
    # Create goal_sessions table (only if it doesn't exist)
    if not bind.dialect.has_table(bind, "goal_sessions"):
        # Use postgresql.ENUM to reference existing enum without trying to create it
        goal_session_status_enum = postgresql.ENUM("SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "SKIPPED", name="goalsessionstatus", create_type=False)
        op.create_table(
            "goal_sessions",
            sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
            sa.Column("goal_id", sa.Integer(), sa.ForeignKey("goals.id"), nullable=False),
            sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
            sa.Column("end_time", sa.DateTime(timezone=True), nullable=False),
            sa.Column("status", goal_session_status_enum, nullable=False, server_default="SCHEDULED"),
        )
        op.create_index("ix_goal_sessions_id", "goal_sessions", ["id"], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_goal_sessions_id", table_name="goal_sessions")
    op.drop_table("goal_sessions")
    op.drop_index("ix_goals_id", table_name="goals")
    op.drop_table("goals")
    op.execute("DROP TYPE IF EXISTS goalsessionstatus")
