"""Data sources, exploration jobs/events, and discovered artifacts."""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, uuid_pk


class DataSource(Base, TimestampMixin):
    __tablename__ = "data_sources"

    id: Mapped[uuid.UUID] = uuid_pk()
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(40), nullable=False)        # code|db|api|admin|doc
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    connector_kind: Mapped[str] = mapped_column(String(60), nullable=False)  # CodeExplorer ...
    conn: Mapped[str] = mapped_column(String(240), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="connected", nullable=False)  # connected|running|error
    config_json: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    secret_ref: Mapped[str | None] = mapped_column(String(120), nullable=True)


class ExplorationJob(Base, TimestampMixin):
    __tablename__ = "exploration_jobs"

    id: Mapped[uuid.UUID] = uuid_pk()
    source_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("data_sources.id"), nullable=False, index=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    trigger_type: Mapped[str] = mapped_column(String(20), default="manual", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="running", nullable=False)  # running|done|error
    phase: Mapped[int] = mapped_column(Integer, default=1, nullable=False)              # 1..4
    progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)           # 0..100
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ExplorationEvent(Base):
    __tablename__ = "exploration_events"
    __table_args__ = (UniqueConstraint("job_id", "seq", name="uq_expl_event_seq"),)

    id: Mapped[uuid.UUID] = uuid_pk()
    job_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("exploration_jobs.id"), nullable=False, index=True)
    seq: Mapped[int] = mapped_column(Integer, nullable=False)
    event_type: Mapped[str] = mapped_column(String(40), nullable=False)  # extract|rule|chain|op|file
    payload_json: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class DiscoveredEntity(Base):
    __tablename__ = "discovered_entities"
    id: Mapped[uuid.UUID] = uuid_pk()
    job_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("exploration_jobs.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    fields_json: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)


class DiscoveredOperation(Base):
    __tablename__ = "discovered_operations"
    id: Mapped[uuid.UUID] = uuid_pk()
    job_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("exploration_jobs.id"), nullable=False, index=True)
    key: Mapped[str] = mapped_column(String(120), nullable=False)
    kind: Mapped[str] = mapped_column(String(20), nullable=False)        # query|mutation
    input_schema: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    output_schema: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    capability_requirements: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    executor_hint: Mapped[str | None] = mapped_column(String(60), nullable=True)


class DiscoveredRule(Base):
    __tablename__ = "discovered_rules"
    id: Mapped[uuid.UUID] = uuid_pk()
    job_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("exploration_jobs.id"), nullable=False, index=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)


class DiscoveredChain(Base):
    __tablename__ = "discovered_chains"
    id: Mapped[uuid.UUID] = uuid_pk()
    job_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("exploration_jobs.id"), nullable=False, index=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
