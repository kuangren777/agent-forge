"""Executions, approval requests and votes."""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, uuid_pk


class ApprovalRequest(Base, TimestampMixin):
    __tablename__ = "approval_requests"

    id: Mapped[uuid.UUID] = uuid_pk()
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    trace_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("traces.id"), nullable=True, index=True)
    target_type: Mapped[str] = mapped_column(String(20), nullable=False)  # operation|plan_step
    target_id: Mapped[str] = mapped_column(String(80), nullable=False)
    confirm_level: Mapped[str] = mapped_column(String(20), nullable=False)  # confirm|dual
    # pending | approved | rejected | expired
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    requested_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    required_votes: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ApprovalVote(Base):
    __tablename__ = "approval_votes"
    __table_args__ = (UniqueConstraint("request_id", "approver_id", name="uq_vote_once"),)

    id: Mapped[uuid.UUID] = uuid_pk()
    request_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("approval_requests.id"), nullable=False, index=True)
    approver_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    decision: Mapped[str] = mapped_column(String(10), nullable=False)  # approve|reject
    comment: Mapped[str] = mapped_column(Text, default="", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class Execution(Base, TimestampMixin):
    __tablename__ = "executions"

    id: Mapped[uuid.UUID] = uuid_pk()
    trace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("traces.id"), nullable=False, index=True)
    plan_step_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("plan_steps.id"), nullable=True)
    op_key: Mapped[str] = mapped_column(String(120), nullable=False)
    executor: Mapped[str] = mapped_column(String(60), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="ok", nullable=False)  # ok|error|rolled_back
    before_state: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    after_state: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    idempotency_key: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    latency_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error_code: Mapped[str | None] = mapped_column(String(60), nullable=True)
    # compensation linkage
    rolls_back_execution_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("executions.id"), nullable=True
    )
