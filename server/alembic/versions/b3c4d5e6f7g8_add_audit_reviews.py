"""add audit_reviews

Revision ID: b3c4d5e6f7g8
Revises: a2c3d4e5f6g7
Create Date: 2025-07-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "b3c4d5e6f7g8"
down_revision: Union[str, None] = "a2c3d4e5f6g7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "audit_reviews",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("trace_id", sa.Uuid(), nullable=True),
        sa.Column("event_type", sa.String(48), nullable=False),
        sa.Column("op_key", sa.String(120), nullable=True),
        sa.Column("matched_rule_id", sa.String(120), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("reviewed_by", sa.Uuid(), nullable=True),
        sa.Column("decision", sa.String(20), nullable=True),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("context_json", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("refinement_hint", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.ForeignKeyConstraint(["trace_id"], ["traces.id"]),
        sa.ForeignKeyConstraint(["reviewed_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_audit_reviews_tenant_id", "audit_reviews", ["tenant_id"])
    op.create_index("ix_audit_reviews_trace_id", "audit_reviews", ["trace_id"])


def downgrade() -> None:
    op.drop_index("ix_audit_reviews_trace_id", table_name="audit_reviews")
    op.drop_index("ix_audit_reviews_tenant_id", table_name="audit_reviews")
    op.drop_table("audit_reviews")
