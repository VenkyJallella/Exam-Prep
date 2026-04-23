"""add referrals + affiliate_clicks tables, referral_code on users

Revision ID: i9j0k1l2m3n4
Revises: h8i9j0k1l2m3
Create Date: 2026-04-10 16:00:00.000000

Additive only — does NOT modify existing user data.
- ADDS: users.referral_code (nullable, backfilled at runtime on next access)
- ADDS: users.referred_by_user_id (nullable FK)
- CREATES: referral_rewards table
- CREATES: affiliate_clicks table
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "i9j0k1l2m3n4"
down_revision = "h8i9j0k1l2m3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add referral columns to users (additive — nullable)
    op.add_column(
        "users",
        sa.Column("referral_code", sa.String(16), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column(
            "referred_by_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index("ix_users_referral_code", "users", ["referral_code"], unique=True)
    op.create_index("ix_users_referred_by", "users", ["referred_by_user_id"])

    # 2. Referral rewards: track milestone-based rewards granted
    op.create_table(
        "referral_rewards",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("milestone", sa.Integer(), nullable=False),  # 1, 3, 5, 10
        sa.Column("reward_plan", sa.String(20), nullable=False),  # pro | premium
        sa.Column("reward_days", sa.Integer(), nullable=False),
        sa.Column("subscription_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("notes", sa.String(500), nullable=True),
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
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
    )
    op.create_index("ix_referral_rewards_user", "referral_rewards", ["user_id"])

    # 3. Affiliate click tracking
    op.create_table(
        "affiliate_clicks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("source", sa.String(40), nullable=False),  # amazon|resume|coursera|other
        sa.Column("product_id", sa.String(120), nullable=True),
        sa.Column("placement", sa.String(60), nullable=True),  # blog|jobs|coding|sidebar
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("ip_hash", sa.String(64), nullable=True),
        sa.Column("user_agent", sa.String(300), nullable=True),
        sa.Column("referer", sa.String(500), nullable=True),
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
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
    )
    op.create_index("ix_affiliate_clicks_source", "affiliate_clicks", ["source"])
    op.create_index("ix_affiliate_clicks_user", "affiliate_clicks", ["user_id"])
    op.create_index("ix_affiliate_clicks_created", "affiliate_clicks", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_affiliate_clicks_created", table_name="affiliate_clicks")
    op.drop_index("ix_affiliate_clicks_user", table_name="affiliate_clicks")
    op.drop_index("ix_affiliate_clicks_source", table_name="affiliate_clicks")
    op.drop_table("affiliate_clicks")
    op.drop_index("ix_referral_rewards_user", table_name="referral_rewards")
    op.drop_table("referral_rewards")
    op.drop_index("ix_users_referred_by", table_name="users")
    op.drop_index("ix_users_referral_code", table_name="users")
    op.drop_column("users", "referred_by_user_id")
    op.drop_column("users", "referral_code")
