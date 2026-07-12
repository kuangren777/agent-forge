"""AuditReview — human-in-the-loop review of flagged policy decisions.

Every time a policy rule denies or escalates an operation, an AuditReview record
is created. A human admin can review it and mark it as:

  - confirmed   — the block was correct (attack blocked ✓)
  - overridden  — the block was a false positive (policy too strict ✗)
  - ignored     — not worth reviewing yet (default state)

When a rule accumulates enough overrides, admins are prompted to refine the rule.
This creates a feedback loop that continuously reduces false positives while
maintaining security.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, uuid_pk


class AuditReview(Base):
    """Human review of a policy decision that flagged or blocked an operation."""

    __tablename__ = "audit_reviews"

    id: Mapped[uuid.UUID] = uuid_pk()
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id"), nullable=False, index=True
    )

    # ── what was flagged ──
    trace_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("traces.id"), nullable=True, index=True
    )
    event_type: Mapped[str] = mapped_column(
        String(48), nullable=False
    )  # POLICY_DENIED | INFO_EXPOSURE | CONFIRMATION_REQUESTED
    op_key: Mapped[str | None] = mapped_column(String(120), nullable=True)
    matched_rule_id: Mapped[str | None] = mapped_column(
        String(120), nullable=True
    )  # which PolicyRule triggered

    # ── review decision ──
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending"
    )  # pending | confirmed | overridden
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    decision: Mapped[str | None] = mapped_column(
        String(20), nullable=True
    )  # "legitimate_block" | "false_positive" | "needs_refinement"
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── feedback loop metadata ──
    context_json: Mapped[dict] = mapped_column(
        JSONB, nullable=False, default=dict
    )  # snapshot of what the operation was doing
    # e.g. {"instruction": "...", "op_key": "refund.expedite", "capability_tags": ["parsed"],
    #       "rule_reason": "blocked by policy rule 'block_refunds'", "risk": "high"}

    refinement_hint: Mapped[str | None] = mapped_column(
        String(500), nullable=True
    )  # auto-suggested rule refinement after override
    # e.g. "将此规则的范围缩小到仅匹配 refund.expedite 而非 refund.*"

    # ── timestamps ──
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.utcnow()
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "trace_id": str(self.trace_id) if self.trace_id else None,
            "event_type": self.event_type,
            "op_key": self.op_key,
            "matched_rule_id": self.matched_rule_id,
            "status": self.status,
            "reviewed_by": str(self.reviewed_by) if self.reviewed_by else None,
            "decision": self.decision,
            "comment": self.comment,
            "context_json": self.context_json,
            "refinement_hint": self.refinement_hint,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "reviewed_at": self.reviewed_at.isoformat() if self.reviewed_at else None,
        }


def compute_refinement_hint(rule: dict, override_count: int) -> str | None:
    """Auto-suggest a policy refinement when a rule generates many overrides.

    Called after an admin overrides a rule-based block. If the same rule has
    been overridden 3+ times, suggest narrowing its scope.
    """
    if override_count < 3:
        return None

    op_keys = rule.get("op_keys", [])
    if "*" in op_keys or any(k.endswith(".*") for k in op_keys):
        return (
            f"规则 '{rule.get('rule_id')}' 已被人工覆盖 {override_count} 次。"
            f"建议将其 op_keys 从 {op_keys} 缩小到具体操作键，"
            f"或增加 conditions 以降低误杀率。"
        )

    cap_tags = rule.get("capability_tags", [])
    if cap_tags and len(cap_tags) > 1:
        return (
            f"规则 '{rule.get('rule_id')}' 已被人工覆盖 {override_count} 次。"
            f"建议减少 capability_tags 中的标签数（当前: {cap_tags}），"
            f"或改为 confirm 升级而非 deny。"
        )

    return (
        f"规则 '{rule.get('rule_id')}' 已被人工覆盖 {override_count} 次。"
        f"请审核此规则是否需要调整。"
    )
