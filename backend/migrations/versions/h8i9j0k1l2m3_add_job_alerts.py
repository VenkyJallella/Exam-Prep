"""add job_alert_subscriptions table

Revision ID: h8i9j0k1l2m3
Revises: g7h8i9j0k1l2
Create Date: 2026-04-10 14:00:00.000000

Additive only — does NOT modify any existing table.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "h8i9j0k1l2m3"
down_revision = "g7h8i9j0k1l2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "job_alert_subscriptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=True,  # nullable so anonymous email-only subs work
        ),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("telegram_chat_id", sa.String(64), nullable=True),
        sa.Column("category", sa.String(50), nullable=True),  # null = all categories
        sa.Column("keywords", postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column("frequency", sa.String(20), nullable=False, server_default="daily"),  # daily | weekly | instant
        sa.Column(
            "channel",
            sa.String(20),
            nullable=False,
            server_default="email",
        ),  # email | telegram | both
        sa.Column("last_sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("verified", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("verify_token", sa.String(64), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_job_alerts_user", "job_alert_subscriptions", ["user_id"])
    op.create_index("ix_job_alerts_email", "job_alert_subscriptions", ["email"])
    op.create_index("ix_job_alerts_telegram", "job_alert_subscriptions", ["telegram_chat_id"])
    op.create_index("ix_job_alerts_category", "job_alert_subscriptions", ["category"])


def downgrade() -> None:
    op.drop_index("ix_job_alerts_category", table_name="job_alert_subscriptions")
    op.drop_index("ix_job_alerts_telegram", table_name="job_alert_subscriptions")
    op.drop_index("ix_job_alerts_email", table_name="job_alert_subscriptions")
    op.drop_index("ix_job_alerts_user", table_name="job_alert_subscriptions")
    op.drop_table("job_alert_subscriptions")
