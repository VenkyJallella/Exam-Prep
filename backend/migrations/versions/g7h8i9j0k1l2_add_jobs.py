"""add jobs table

Revision ID: g7h8i9j0k1l2
Revises: f6g7h8i9j0k1
Create Date: 2026-04-10 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "g7h8i9j0k1l2"
down_revision = "f6g7h8i9j0k1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("slug", sa.String(350), nullable=False, unique=True),
        sa.Column("company", sa.String(200), nullable=True),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("short_description", sa.String(500), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("eligibility", sa.Text(), nullable=True),
        sa.Column("salary_min", sa.Integer(), nullable=True),
        sa.Column("salary_max", sa.Integer(), nullable=True),
        sa.Column("salary_text", sa.String(150), nullable=True),
        sa.Column("location", sa.String(200), nullable=True),
        sa.Column("is_remote", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("apply_url", sa.Text(), nullable=False),
        sa.Column("apply_deadline", sa.Date(), nullable=True),
        sa.Column("posted_date", sa.Date(), nullable=True),
        sa.Column("vacancies", sa.Integer(), nullable=True),
        sa.Column("source", sa.String(50), nullable=False),
        sa.Column("source_id", sa.String(300), nullable=True),
        sa.Column("tags", postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column(
            "related_exam_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("exams.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("view_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("click_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("is_featured", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("is_ai_generated", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("meta_description", sa.String(160), nullable=True),
        sa.Column("meta_keywords", postgresql.ARRAY(sa.String()), nullable=True),
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
    op.create_index("ix_jobs_slug", "jobs", ["slug"], unique=True)
    op.create_index("ix_jobs_category", "jobs", ["category"])
    op.create_index("ix_jobs_status", "jobs", ["status"])
    op.create_index("ix_jobs_source_id", "jobs", ["source_id"])
    op.create_index("ix_jobs_apply_deadline", "jobs", ["apply_deadline"])


def downgrade() -> None:
    op.drop_index("ix_jobs_apply_deadline", table_name="jobs")
    op.drop_index("ix_jobs_source_id", table_name="jobs")
    op.drop_index("ix_jobs_status", table_name="jobs")
    op.drop_index("ix_jobs_category", table_name="jobs")
    op.drop_index("ix_jobs_slug", table_name="jobs")
    op.drop_table("jobs")
