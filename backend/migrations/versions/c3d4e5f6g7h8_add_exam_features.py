"""add exam features: coding, sections, quiz, PYQ, partial marking

Revision ID: c3d4e5f6g7h8
Revises: b2c3d4e5f6g7
Create Date: 2026-03-29 14:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "c3d4e5f6g7h8"
down_revision = "b2c3d4e5f6g7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()

    # Create enums safely
    bind.execute(sa.text("DO $$ BEGIN CREATE TYPE coding_difficulty AS ENUM ('easy', 'medium', 'hard'); EXCEPTION WHEN duplicate_object THEN null; END $$;"))

    # 1. Create passages table
    op.create_table(
        "passages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("exam_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("exams.id", ondelete="SET NULL"), nullable=True),
        sa.Column("image_url", sa.String(500), nullable=True),
        sa.Column("passage_type", sa.String(50), nullable=False, server_default="comprehension"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # 2. Add new columns to questions table
    op.add_column("questions", sa.Column("passage_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("passages.id", ondelete="SET NULL"), nullable=True))
    op.add_column("questions", sa.Column("question_group_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("questions", sa.Column("positive_marks", sa.Float(), nullable=False, server_default="1.0"))
    op.add_column("questions", sa.Column("negative_marks", sa.Float(), nullable=False, server_default="0.0"))
    op.add_column("questions", sa.Column("partial_marks_enabled", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("questions", sa.Column("year", sa.Integer(), nullable=True))
    op.add_column("questions", sa.Column("paper_source", sa.String(100), nullable=True))
    op.add_column("questions", sa.Column("image_url", sa.String(500), nullable=True))
    op.add_column("questions", sa.Column("solution_image_url", sa.String(500), nullable=True))
    op.add_column("questions", sa.Column("language_alt", postgresql.JSONB(), nullable=True))

    # 3. Create coding_questions table
    op.create_table(
        "coding_questions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("slug", sa.String(350), nullable=False, unique=True),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("difficulty", postgresql.ENUM("easy", "medium", "hard", name="coding_difficulty", create_type=False), nullable=False, server_default="medium"),
        sa.Column("exam_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("exams.id", ondelete="SET NULL"), nullable=True),
        sa.Column("topic_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("topics.id", ondelete="SET NULL"), nullable=True),
        sa.Column("constraints", sa.Text(), nullable=True),
        sa.Column("input_format", sa.Text(), nullable=True),
        sa.Column("output_format", sa.Text(), nullable=True),
        sa.Column("test_cases", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("starter_code", postgresql.JSONB(), nullable=True),
        sa.Column("solutions", postgresql.JSONB(), nullable=True),
        sa.Column("time_limit_ms", sa.Integer(), nullable=False, server_default="2000"),
        sa.Column("memory_limit_mb", sa.Integer(), nullable=False, server_default="256"),
        sa.Column("tags", postgresql.JSONB(), nullable=True),
        sa.Column("companies", postgresql.JSONB(), nullable=True),
        sa.Column("acceptance_rate", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("total_submissions", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_accepted", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_coding_difficulty", "coding_questions", ["difficulty"])
    op.create_index("idx_coding_exam", "coding_questions", ["exam_id"])

    # 4. Create coding_submissions table
    op.create_table(
        "coding_submissions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("question_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("coding_questions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("language", sa.String(20), nullable=False),
        sa.Column("code", sa.Text(), nullable=False),
        sa.Column("status", sa.String(30), nullable=False, server_default="pending"),
        sa.Column("test_results", postgresql.JSONB(), nullable=True),
        sa.Column("total_test_cases", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("passed_test_cases", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("execution_time_ms", sa.Integer(), nullable=True),
        sa.Column("memory_used_mb", sa.Integer(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_submission_user", "coding_submissions", ["user_id", "question_id"])

    # 5. Create test_sections table
    op.create_table(
        "test_sections",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("test_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tests.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("time_limit_minutes", sa.Integer(), nullable=True),
        sa.Column("positive_marks", sa.Float(), nullable=False, server_default="1.0"),
        sa.Column("negative_marks", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("partial_marking", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("instructions", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # 6. Add new columns to tests table
    op.add_column("tests", sa.Column("is_timed", sa.Boolean(), nullable=False, server_default="true"))
    op.add_column("tests", sa.Column("is_pyq", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("tests", sa.Column("pyq_year", sa.Integer(), nullable=True))
    op.add_column("tests", sa.Column("is_sectional_timing", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("tests", sa.Column("is_scheduled", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("tests", sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("tests", sa.Column("test_mode", sa.String(20), nullable=False, server_default="standard"))

    # 7. Add section_id to test_questions
    op.add_column("test_questions", sa.Column("section_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("test_sections.id", ondelete="SET NULL"), nullable=True))

    # 8. Add percentile, score, total_time_seconds to test_attempts
    op.add_column("test_attempts", sa.Column("percentile", sa.Float(), nullable=True))
    op.add_column("test_attempts", sa.Column("score", sa.Float(), nullable=False, server_default="0.0"))
    op.add_column("test_attempts", sa.Column("total_time_seconds", sa.Integer(), nullable=False, server_default="0"))

    # 9. Add score to test_attempt_answers
    op.add_column("test_attempt_answers", sa.Column("score", sa.Float(), nullable=False, server_default="0.0"))

    # 10. Create daily_quizzes table
    op.create_table(
        "daily_quizzes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("quiz_date", sa.Date(), nullable=False, unique=True),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("exam_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("exams.id", ondelete="SET NULL"), nullable=True),
        sa.Column("question_ids", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("total_questions", sa.Integer(), nullable=False, server_default="10"),
        sa.Column("duration_minutes", sa.Integer(), nullable=False, server_default="15"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_daily_quiz_date", "daily_quizzes", ["quiz_date"])

    # 11. Create daily_quiz_attempts table
    op.create_table(
        "daily_quiz_attempts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("quiz_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("daily_quizzes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_marks", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("correct_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("wrong_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("time_taken_seconds", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("answers", postgresql.JSONB(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id", "quiz_id", name="uq_user_daily_quiz"),
    )
    op.create_index("idx_daily_quiz_attempt", "daily_quiz_attempts", ["user_id", "quiz_id"])


def downgrade() -> None:
    op.drop_index("idx_daily_quiz_attempt", table_name="daily_quiz_attempts")
    op.drop_table("daily_quiz_attempts")
    op.drop_index("idx_daily_quiz_date", table_name="daily_quizzes")
    op.drop_table("daily_quizzes")
    op.drop_column("test_attempt_answers", "score")
    op.drop_column("test_attempts", "total_time_seconds")
    op.drop_column("test_attempts", "score")
    op.drop_column("test_attempts", "percentile")
    op.drop_column("test_questions", "section_id")
    op.drop_column("tests", "test_mode")
    op.drop_column("tests", "scheduled_at")
    op.drop_column("tests", "is_scheduled")
    op.drop_column("tests", "is_sectional_timing")
    op.drop_column("tests", "pyq_year")
    op.drop_column("tests", "is_pyq")
    op.drop_column("tests", "is_timed")
    op.drop_table("test_sections")
    op.drop_index("idx_submission_user", table_name="coding_submissions")
    op.drop_table("coding_submissions")
    op.drop_index("idx_coding_exam", table_name="coding_questions")
    op.drop_index("idx_coding_difficulty", table_name="coding_questions")
    op.drop_table("coding_questions")
    op.drop_column("questions", "language_alt")
    op.drop_column("questions", "solution_image_url")
    op.drop_column("questions", "image_url")
    op.drop_column("questions", "paper_source")
    op.drop_column("questions", "year")
    op.drop_column("questions", "partial_marks_enabled")
    op.drop_column("questions", "negative_marks")
    op.drop_column("questions", "positive_marks")
    op.drop_column("questions", "question_group_id")
    op.drop_column("questions", "passage_id")
    op.drop_table("passages")
    sa.Enum(name="coding_difficulty").drop(op.get_bind(), checkfirst=True)
