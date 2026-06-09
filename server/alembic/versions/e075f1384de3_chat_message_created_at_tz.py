"""chat_message created_at tz

Revision ID: e075f1384de3
Revises: 4a06b4709402
Create Date: 2026-06-10 01:43:01.408457
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e075f1384de3'
down_revision: Union[str, None] = '4a06b4709402'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # cast existing ISO strings to timestamptz; leave the partial-unique
    # idempotency index (a1b2c3d4e5f6) untouched — autogenerate can't model it.
    op.alter_column('chat_messages', 'created_at',
               existing_type=sa.VARCHAR(length=40),
               type_=sa.DateTime(timezone=True),
               existing_nullable=False,
               postgresql_using='created_at::timestamptz')


def downgrade() -> None:
    op.alter_column('chat_messages', 'created_at',
               existing_type=sa.DateTime(timezone=True),
               type_=sa.VARCHAR(length=40),
               existing_nullable=False)
