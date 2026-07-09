"""PolicyRule — persisted, compilable security rules for the CaMeL engine.

A rule maps an action (op_key + capability tags + risk level + conditions) to an
effect (allow/deny) and an optional confirm escalation (auto/confirm/dual).
Rules are evaluated deterministically in `evaluate_step()` alongside decorator-based
rules, with deny-overrides priority.

Natural-language → structured rule compilation is handled by
`app.services.policy_compiler`.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, uuid_pk


class PolicyRule(Base):
    """A single security rule in the CaMeL capability lattice.

    Adapted from AgentGuard's `PolicyRule` schema, augmented with CaMeL-specific
    fields: capability_tags (trusted/data/parsed/write), confirm_escalation, and
    dataflow trace clauses.
    """

    __tablename__ = "policy_rules"

    id: Mapped[uuid.UUID] = uuid_pk()
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id"), nullable=False, index=True
    )

    # ── identity ──
    rule_id: Mapped[str] = mapped_column(
        String(120), nullable=False, index=True
    )  # "refund_high_value_dual"
    description: Mapped[str | None] = mapped_column(
        String(500), nullable=True
    )  # human-friendly summary

    # ── effect ──
    effect: Mapped[str] = mapped_column(
        String(20), nullable=False, default="deny"
    )  # allow | deny
    confirm_escalation: Mapped[str | None] = mapped_column(
        String(20), nullable=True
    )  # auto | confirm | dual  (only meaningful when effect=allow)

    # ── match targets ──
    op_keys: Mapped[list] = mapped_column(
        JSONB, nullable=False, default=list
    )  # ["refund.*", "order.cancel"] — wildcards supported
    capability_tags: Mapped[list] = mapped_column(
        JSONB, nullable=False, default=list
    )  # ["parsed", "write"] — match if ANY tag present
    risk_levels: Mapped[list] = mapped_column(
        JSONB, nullable=False, default=list
    )  # ["high", "critical"]
    roles: Mapped[list] = mapped_column(
        JSONB, nullable=False, default=list
    )  # ["customer", "employee"] — empty = all roles
    op_kinds: Mapped[list] = mapped_column(
        JSONB, nullable=False, default=list
    )  # ["query", "mutation"] — empty = all kinds

    # ── conditions (AgentGuard-style field predicates) ──
    # [{"field": "tool.amount", "op": "gte", "value": 5000},
    #  {"field": "principal.trust_level", "op": "lt", "value": 2}]
    conditions: Mapped[list] = mapped_column(
        JSONB, nullable=False, default=list
    )
    condition_expr: Mapped[str | None] = mapped_column(
        String(1000), nullable=True
    )  # "tool.amount >= 5000 AND principal.role == 'customer'"

    # ── cross-step dataflow trace (CaMeL-specific) ──
    # [{"from_cap": "data", "to_cap": "parsed", "via_op": "qparser"}]
    trace_clause: Mapped[dict | None] = mapped_column(
        JSONB, nullable=True
    )

    # ── priority & metadata ──
    priority: Mapped[int] = mapped_column(
        Integer, nullable=False, default=50
    )  # higher = wins, deny starts at 90
    reason: Mapped[str] = mapped_column(
        String(300), nullable=False, default=""
    )  # shown in audit log / deny message
    source: Mapped[str] = mapped_column(
        String(20), nullable=False, default="manual"
    )  # manual | compiled
    source_text: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )  # original NL text (for compiled rules)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="active"
    )  # active | disabled

    # ── timestamps ──
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.utcnow()
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # ── serialization ──
    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "rule_id": self.rule_id,
            "description": self.description,
            "effect": self.effect,
            "confirm_escalation": self.confirm_escalation,
            "op_keys": self.op_keys,
            "capability_tags": self.capability_tags,
            "risk_levels": self.risk_levels,
            "roles": self.roles,
            "op_kinds": self.op_kinds,
            "conditions": self.conditions,
            "condition_expr": self.condition_expr,
            "trace_clause": self.trace_clause,
            "priority": self.priority,
            "reason": self.reason,
            "source": self.source,
            "source_text": self.source_text,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
