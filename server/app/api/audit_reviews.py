"""Audit Review API — human-in-the-loop review of flagged policy decisions.

Endpoints:
  GET    /audit-reviews              — list reviews (filterable by status)
  GET    /audit-reviews/stats        — summary stats (pending/confirmed/overridden)
  POST   /audit-reviews/{id}/review  — submit a human review decision
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import Principal, get_principal
from app.models.audit_review import AuditReview, compute_refinement_hint
from app.models.policy import PolicyRule

router = APIRouter(tags=["audit-reviews"])


def _require_admin(p: Principal) -> None:
    if p.role != "admin":
        raise HTTPException(status_code=403, detail="admin only")


class ReviewRequest(BaseModel):
    decision: str = Field(..., pattern="^(legitimate_block|false_positive|needs_refinement)$")
    comment: str | None = None


@router.get("/audit-reviews")
async def list_reviews(
    p: Principal = Depends(get_principal),
    db: AsyncSession = Depends(get_db),
    status: str | None = None,
    limit: int = 50,
) -> dict:
    _require_admin(p)
    q = select(AuditReview).where(AuditReview.tenant_id == p.tenant_id)
    if status and status in ("pending", "confirmed", "overridden"):
        q = q.where(AuditReview.status == status)
    q = q.order_by(AuditReview.created_at.desc()).limit(min(limit, 200))
    rows = (await db.execute(q)).scalars().all()
    return {"items": [r.to_dict() for r in rows], "total": len(rows)}


@router.get("/audit-reviews/stats")
async def review_stats(
    p: Principal = Depends(get_principal),
    db: AsyncSession = Depends(get_db),
) -> dict:
    _require_admin(p)
    base = select(AuditReview).where(AuditReview.tenant_id == p.tenant_id)
    pending = (await db.execute(base.where(AuditReview.status == "pending"))).scalars().all()
    confirmed = (await db.execute(base.where(AuditReview.status == "confirmed"))).scalars().all()
    overridden = (await db.execute(base.where(AuditReview.status == "overridden"))).scalars().all()

    # count overrides per rule for feedback hints
    rule_override_counts: dict[str, int] = {}
    for r in overridden:
        if r.matched_rule_id:
            rule_override_counts[r.matched_rule_id] = rule_override_counts.get(r.matched_rule_id, 0) + 1

    # rules with ≥3 overrides need attention
    needs_attention = [
        {"rule_id": rid, "override_count": cnt, "action": "review_and_refine"}
        for rid, cnt in rule_override_counts.items() if cnt >= 3
    ]

    return {
        "pending": len(pending),
        "confirmed": len(confirmed),
        "overridden": len(overridden),
        "total": len(pending) + len(confirmed) + len(overridden),
        "needs_attention": needs_attention,
    }


@router.post("/audit-reviews/{review_id}/review")
async def submit_review(
    review_id: uuid.UUID,
    body: ReviewRequest,
    p: Principal = Depends(get_principal),
    db: AsyncSession = Depends(get_db),
) -> dict:
    _require_admin(p)
    review = await db.get(AuditReview, review_id)
    if review is None or review.tenant_id != p.tenant_id:
        raise HTTPException(status_code=404, detail="not found")
    if review.status != "pending":
        raise HTTPException(status_code=409, detail="already reviewed")

    review.status = "overridden" if body.decision == "false_positive" else "confirmed"
    review.decision = body.decision
    review.comment = body.comment
    review.reviewed_by = uuid.UUID(p.user.id)
    review.reviewed_at = datetime.now(timezone.utc)

    # feedback loop: if overridden, compute refinement hint
    if body.decision == "false_positive" and review.matched_rule_id:
        rule = (
            await db.execute(
                select(PolicyRule).where(
                    PolicyRule.tenant_id == p.tenant_id,
                    PolicyRule.rule_id == review.matched_rule_id,
                )
            )
        ).scalar_one_or_none()
        if rule:
            # count how many times this rule has been overridden
            override_count = (
                await db.execute(
                    select(func.count()).select_from(AuditReview).where(
                        AuditReview.tenant_id == p.tenant_id,
                        AuditReview.matched_rule_id == review.matched_rule_id,
                        AuditReview.status == "overridden",
                    )
                )
            ).scalar_one() + 1  # +1 for the one we're about to save
            review.refinement_hint = compute_refinement_hint(
                {"rule_id": rule.rule_id, "op_keys": rule.op_keys,
                 "capability_tags": rule.capability_tags},
                override_count,
            )

    await db.commit()
    await db.refresh(review)
    return review.to_dict()
