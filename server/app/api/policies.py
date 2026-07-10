"""Policies API — CRUD + NL compilation for CaMeL PolicyRules.

Endpoints:
  GET    /policies              — list all rules for the tenant
  POST   /policies              — create a rule manually (JSON body)
  POST   /policies/compile      — compile NL → preview (no persist)
  POST   /policies/compile/apply — compile NL → persist + activate
  PATCH  /policies/{id}         — toggle status (active/disabled)
  DELETE /policies/{id}         — delete a rule
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import Principal, get_principal
from app.models.policy import PolicyRule
from app.services.policy_compiler import compile_policy
from app.services.llm import LLMError

router = APIRouter(tags=["policies"])


def _require_admin(p: Principal) -> None:
    if p.role != "admin":
        raise HTTPException(status_code=403, detail="admin only")


# ── request schemas ─────────────────────────────────────────────────
class CompileRequest(BaseModel):
    nl_text: str = Field(..., min_length=5, max_length=2000, description="自然语言策略描述")


class CreateRuleRequest(BaseModel):
    rule_id: str = Field(..., min_length=1, max_length=120)
    description: str | None = None
    effect: str = "deny"
    confirm_escalation: str | None = None
    op_keys: list[str] = Field(default_factory=list)
    capability_tags: list[str] = Field(default_factory=list)
    risk_levels: list[str] = Field(default_factory=list)
    roles: list[str] = Field(default_factory=list)
    op_kinds: list[str] = Field(default_factory=list)
    conditions: list[dict] = Field(default_factory=list)
    condition_expr: str | None = None
    trace_clause: dict | None = None
    priority: int = 50
    reason: str = ""


class PatchRuleRequest(BaseModel):
    status: str | None = None  # "active" | "disabled"


# ── endpoints ───────────────────────────────────────────────────────
@router.get("/policies")
async def list_policies(
    p: Principal = Depends(get_principal),
    db: AsyncSession = Depends(get_db),
) -> dict:
    _require_admin(p)
    rows = (
        await db.execute(
            select(PolicyRule)
            .where(PolicyRule.tenant_id == p.tenant_id)
            .order_by(PolicyRule.priority.desc(), PolicyRule.created_at.desc())
        )
    ).scalars().all()
    active = sum(1 for r in rows if r.status == "active")
    return {
        "items": [r.to_dict() for r in rows],
        "active_count": active,
        "total": len(rows),
    }


@router.post("/policies", status_code=201)
async def create_policy(
    body: CreateRuleRequest,
    p: Principal = Depends(get_principal),
    db: AsyncSession = Depends(get_db),
) -> dict:
    _require_admin(p)

    # check uniqueness
    existing = (
        await db.execute(
            select(PolicyRule).where(
                PolicyRule.tenant_id == p.tenant_id,
                PolicyRule.rule_id == body.rule_id,
            )
        )
    ).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(status_code=409, detail=f"rule_id '{body.rule_id}' already exists")

    now = datetime.now(timezone.utc)
    rule = PolicyRule(
        tenant_id=p.tenant_id,
        rule_id=body.rule_id,
        description=body.description,
        effect=body.effect,
        confirm_escalation=body.confirm_escalation,
        op_keys=body.op_keys,
        capability_tags=body.capability_tags,
        risk_levels=body.risk_levels,
        roles=body.roles,
        op_kinds=body.op_kinds,
        conditions=body.conditions,
        condition_expr=body.condition_expr,
        trace_clause=body.trace_clause,
        priority=body.priority,
        reason=body.reason,
        source="manual",
        status="active",
        created_at=now,
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return rule.to_dict()


@router.post("/policies/compile")
async def compile_policy_preview(
    body: CompileRequest,
    p: Principal = Depends(get_principal),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Compile NL text → structured rule JSON (preview only, no persistence)."""
    _require_admin(p)
    try:
        draft = await compile_policy(db, p.tenant_id, nl_text=body.nl_text)
    except (ValueError, LLMError) as exc:
        raise HTTPException(status_code=422, detail=f"规则编译失败：{exc}") from exc
    return {"status": "preview", "rule": draft}


@router.post("/policies/compile/apply", status_code=201)
async def compile_and_apply(
    body: CompileRequest,
    p: Principal = Depends(get_principal),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Compile NL text → persist + activate as an active PolicyRule."""
    _require_admin(p)
    try:
        draft = await compile_policy(db, p.tenant_id, nl_text=body.nl_text)
    except (ValueError, LLMError) as exc:
        raise HTTPException(status_code=422, detail=f"规则编译失败：{exc}") from exc

    # check uniqueness
    existing = (
        await db.execute(
            select(PolicyRule).where(
                PolicyRule.tenant_id == p.tenant_id,
                PolicyRule.rule_id == draft["rule_id"],
            )
        )
    ).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(
            status_code=409,
            detail=f"rule_id '{draft['rule_id']}' already exists — delete it first",
        )

    now = datetime.now(timezone.utc)
    rule = PolicyRule(
        tenant_id=p.tenant_id,
        rule_id=draft["rule_id"],
        description=draft["description"],
        effect=draft["effect"],
        confirm_escalation=draft["confirm_escalation"],
        op_keys=draft["op_keys"],
        capability_tags=draft["capability_tags"],
        risk_levels=draft["risk_levels"],
        roles=draft["roles"],
        op_kinds=draft["op_kinds"],
        conditions=draft["conditions"],
        condition_expr=draft["condition_expr"],
        trace_clause=draft.get("trace_clause"),
        priority=draft["priority"],
        reason=draft["reason"],
        source=draft["source"],
        source_text=draft["source_text"],
        status="active",
        created_at=now,
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return {"status": "applied", "rule": rule.to_dict()}


@router.patch("/policies/{rule_id}")
async def patch_policy(
    rule_id: uuid.UUID,
    body: PatchRuleRequest,
    p: Principal = Depends(get_principal),
    db: AsyncSession = Depends(get_db),
) -> dict:
    _require_admin(p)
    rule = await db.get(PolicyRule, rule_id)
    if rule is None or rule.tenant_id != p.tenant_id:
        raise HTTPException(status_code=404, detail="not found")
    if body.status is not None:
        if body.status not in ("active", "disabled"):
            raise HTTPException(status_code=422, detail="status must be 'active' or 'disabled'")
        rule.status = body.status
        rule.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(rule)
    return rule.to_dict()


@router.delete("/policies/{rule_id}", status_code=204)
async def delete_policy(
    rule_id: uuid.UUID,
    p: Principal = Depends(get_principal),
    db: AsyncSession = Depends(get_db),
) -> None:
    _require_admin(p)
    rule = await db.get(PolicyRule, rule_id)
    if rule is None or rule.tenant_id != p.tenant_id:
        raise HTTPException(status_code=404, detail="not found")
    await db.delete(rule)
    await db.commit()
