"""Minimal real business store the executors act on (orders, refunds, …).

This stands in for the customer's downstream systems so executions have genuine
before/after state and rollbacks restore real rows — not mocked toasts.
"""
import uuid

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, uuid_pk


class BizRecord(Base, TimestampMixin):
    __tablename__ = "biz_records"
    __table_args__ = (UniqueConstraint("tenant_id", "kind", "key", name="uq_biz_record"),)

    id: Mapped[uuid.UUID] = uuid_pk()
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    kind: Mapped[str] = mapped_column(String(40), nullable=False)   # order|refund|customer|employee
    key: Mapped[str] = mapped_column(String(80), nullable=False)    # e.g. "#3901"
    owner_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    state_json: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
