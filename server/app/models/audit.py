"""Traces, append-only audit hash chain, dataflow graph, LLM runs."""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, uuid_pk


class Trace(Base, TimestampMixin):
    """The shared correlation id linking plan ↔ execution ↔ audit ↔ dataflow."""
    __tablename__ = "traces"

    id: Mapped[uuid.UUID] = uuid_pk()
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    actor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    acting_role: Mapped[str] = mapped_column(String(40), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="open", nullable=False)
    root_hash: Mapped[str | None] = mapped_column(String(80), nullable=True)


class AuditEvent(Base):
    """Append-only; each row hashes its canonical payload + prev_hash."""
    __tablename__ = "audit_events"
    __table_args__ = (UniqueConstraint("trace_id", "seq", name="uq_audit_seq"),)

    id: Mapped[uuid.UUID] = uuid_pk()
    trace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("traces.id"), nullable=False, index=True)
    seq: Mapped[int] = mapped_column(Integer, nullable=False)
    event_type: Mapped[str] = mapped_column(String(48), nullable=False)
    actor_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    cap: Mapped[str] = mapped_column(String(20), default="data", nullable=False)
    payload_json: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    prev_hash: Mapped[str] = mapped_column(String(80), nullable=False)
    hash: Mapped[str] = mapped_column(String(80), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class DataflowNode(Base):
    __tablename__ = "dataflow_nodes"
    __table_args__ = (UniqueConstraint("trace_id", "node_id", name="uq_flow_node"),)

    id: Mapped[uuid.UUID] = uuid_pk()
    trace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("traces.id"), nullable=False, index=True)
    node_id: Mapped[str] = mapped_column(String(60), nullable=False)
    label: Mapped[str] = mapped_column(Text, nullable=False)
    capability_set: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    source_kind: Mapped[str] = mapped_column(String(60), default="", nullable=False)
    readers: Mapped[str] = mapped_column(String(120), default="", nullable=False)
    via: Mapped[str] = mapped_column(String(160), default="", nullable=False)
    produced_by_step_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("plan_steps.id"), nullable=True)


class DataflowEdge(Base):
    __tablename__ = "dataflow_edges"

    id: Mapped[uuid.UUID] = uuid_pk()
    trace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("traces.id"), nullable=False, index=True)
    from_node_id: Mapped[str] = mapped_column(String(60), nullable=False)
    to_node_id: Mapped[str] = mapped_column(String(60), nullable=False)
    transform_kind: Mapped[str] = mapped_column(String(40), default="", nullable=False)


class LLMRun(Base):
    __tablename__ = "llm_runs"

    id: Mapped[uuid.UUID] = uuid_pk()
    trace_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("traces.id"), nullable=True, index=True)
    llm_role: Mapped[str] = mapped_column(String(10), nullable=False)  # pllm|qllm
    provider: Mapped[str] = mapped_column(String(40), default="camel-hub", nullable=False)
    model: Mapped[str] = mapped_column(String(80), nullable=False)
    prompt_version: Mapped[str] = mapped_column(String(40), default="v1", nullable=False)
    input_ref: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    output_json: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    token_usage: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    latency_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    safety_flags: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
