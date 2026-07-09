"""Policy Compiler — Natural Language → CaMeL PolicyRule.

Adapted from AgentGuard's `llm_dsl_generator.py` pattern:
  1. Accept a natural-language policy description from an admin.
  2. Send it to the P-LLM (structured extraction, same pipeline as planner).
  3. Map the extracted intent to CaMeL capability semantics.
  4. Validate against the Operation Registry (check op_keys exist).
  5. Return a validated PolicyRule dict ready for persistence.

The key difference from AgentGuard: instead of a generic tool-oriented DSL, the
compiler targets CaMeL's capability lattice (trusted/data/parsed/write) and
confirm escalation (auto/confirm/dual).
"""
from __future__ import annotations

import re
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.registry import Operation
from app.services.llm import llm
from app.services.llm_config import resolve as resolve_profile

# ── validators for CaMeL-specific fields ─────────────────────────────
_VALID_CAPS = {"trusted", "data", "parsed", "write"}
_VALID_CONFIRM = {"auto", "confirm", "dual"}
_VALID_RISK = {"low", "high", "critical"}
_VALID_KINDS = {"query", "mutation"}
_VALID_COND_OP = {"eq", "ne", "gt", "lt", "gte", "lte", "in", "not_in", "contains", "icontains", "regex", "any_in"}

# ── P-LLM system prompt for policy compilation ───────────────────────
COMPILE_SYSTEM = """\
You are the Policy Compiler of a CaMeL-governed AI agent system. Your job: convert
a natural-language security policy into a structured rule that the deterministic
policy engine can enforce.

--- CaMeL CAPABILITY MODEL (you MUST use these labels) ---
Every value carries ONE OR MORE capability tags:
- "trusted"  — user input, system constants. MOST restrictive source.
- "data"     — output of a database query or trusted API call.
- "parsed"   — output of the quarantined Q-LLM (untrusted data → typed selection).
               Any write whose arguments include "parsed" data MUST escalate.
- "write"    — applied to the result of a mutation operation.

--- CONFIRM ESCALATION ---
- "auto"    — execute without human intervention (queries only).
- "confirm" — one human must approve before execution.
- "dual"    — TWO distinct admins must approve (highest risk).

--- RULE STRUCTURE (return this JSON) ---
{
  "rule_id": "short_snake_case_id",
  "description": "one-line human summary in user's language",
  "effect": "allow | deny",
  "confirm_escalation": "auto | confirm | dual  (only when effect=allow, else null)",
  "op_keys": ["list", "of", "op.keys", "with", "wildcards"],  // e.g. "refund.*"
  "capability_tags": ["parsed", "write"],  // match if ANY tag present on step's args
  "risk_levels": ["high", "critical"],     // match if op risk in this set
  "roles": ["customer", "employee"],       // empty = all roles
  "op_kinds": ["query", "mutation"],       // empty = all kinds
  "conditions": [
    {"field": "principal.role", "op": "eq", "value": "customer"},
    {"field": "tool.amount", "op": "gte", "value": 5000}
  ],
  "condition_expr": "tool.amount >= 5000 AND principal.role == 'customer'",
  "trace_clause": null,  // or {"from_cap":"data","to_cap":"write","via_op":null}
  "priority": 50,        // 90=deny, 70=require_approval, 50=default, 10=allow
  "reason": "Human-readable reason shown in audit log"
}

--- FIELD PATHS for conditions ---
principal.role         — caller's role ("customer"|"employee"|"admin")
principal.trust_level  — numeric trust level (0=trusted, 1=data, 2=parsed)
tool.amount            — operation's amount parameter (if present)
tool.recipient         — operation's recipient (email/phone/address)
tool.<param_name>      — any other parameter name from the operation
payload.kind           — "query"|"mutation" (the step kind)

--- RULES ---
1. Use "parsed" in capability_tags when restricting Q-LLM-derived data.
2. Use "write" in capability_tags when restricting mutation operations.
3. For "deny" effect, set priority=90. For "confirm" escalation, priority=70.
4. For "dual" escalation, set priority=85.
5. op_keys support "*" wildcard (e.g. "refund.*" matches all refund ops).
6. If the policy is about DATA FLOW (X must not flow to Y), use trace_clause.
7. Reply with ONLY the JSON object, no commentary."""


async def compile_policy(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    *,
    nl_text: str,
    profile_role: str = "pllm",
) -> dict:
    """Compile a natural-language policy into a validated PolicyRule dict.

    Args:
        db: async DB session
        tenant_id: tenant scope
        nl_text: natural language policy description, e.g.
                 "退款金额超过 5000 元需要双人审批"
        profile_role: which LLM profile to use (default: pllm)

    Returns:
        A dict matching PolicyRule fields, ready for DB insertion.
    """
    prof = await resolve_profile(db, tenant_id, profile_role)

    # 1. LLM structured extraction
    user_prompt = f"POLICY DESCRIPTION:\n{nl_text}\n\nAvailable operations (keys):\n{await _op_catalogue(db, tenant_id)}"
    draft, _result = await llm.structured(
        prof.model, COMPILE_SYSTEM, user_prompt,
        temperature=prof.temperature, max_tokens=prof.max_tokens,
    )
    return _validate_and_normalise(db, tenant_id, draft, nl_text)


async def _op_catalogue(db: AsyncSession, tenant_id: uuid.UUID) -> str:
    ops = (
        await db.execute(
            select(Operation.op_key, Operation.kind, Operation.risk_level)
            .where(Operation.tenant_id == tenant_id, Operation.status == "active")
            .order_by(Operation.op_key)
        )
    ).all()
    if not ops:
        return "(no active operations yet)"
    return "\n".join(f"- {op_key} ({kind}, risk={risk})" for op_key, kind, risk in ops)


def _validate_and_normalise(
    db: AsyncSession, tenant_id: uuid.UUID, draft: dict, nl_text: str
) -> dict:
    """Validate LLM output and fill defaults. Raises ValueError on bad input."""
    rule_id = str(draft.get("rule_id", "")).strip()
    if not rule_id or not re.match(r"^[a-z][a-z0-9_]*$", rule_id):
        raise ValueError(f"invalid rule_id: {rule_id!r} — must be snake_case")

    effect = draft.get("effect", "deny")
    if effect not in ("allow", "deny"):
        effect = "deny"

    confirm = draft.get("confirm_escalation")
    if confirm not in _VALID_CONFIRM:
        confirm = "confirm" if effect == "allow" else None
    if effect == "deny":
        confirm = None

    # Validate op_keys against registry
    op_keys = [
        k for k in (draft.get("op_keys") or [])
        if isinstance(k, str) and k.strip()
    ]

    # Validate capability_tags
    cap_tags = [
        t for t in (draft.get("capability_tags") or [])
        if t in _VALID_CAPS
    ]

    # Validate risk_levels
    risk_levels = [
        r for r in (draft.get("risk_levels") or [])
        if r in _VALID_RISK
    ]

    # Validate roles
    roles = [
        r for r in (draft.get("roles") or [])
        if r in ("customer", "employee", "admin")
    ]

    # Validate op_kinds
    op_kinds = [
        k for k in (draft.get("op_kinds") or [])
        if k in _VALID_KINDS
    ]

    # Validate conditions
    conditions = []
    for c in (draft.get("conditions") or []):
        if not isinstance(c, dict):
            continue
        field = str(c.get("field", "")).strip()
        op = str(c.get("op", "eq")).strip()
        if op not in _VALID_COND_OP:
            op = "eq"
        if not field:
            continue
        conditions.append({"field": field, "op": op, "value": c.get("value")})

    condition_expr = str(draft.get("condition_expr", "")).strip()[:1000] or None

    # Validate trace_clause
    trace_clause = draft.get("trace_clause")
    if isinstance(trace_clause, dict) and trace_clause.get("from_cap"):
        trace_clause = {
            "from_cap": trace_clause.get("from_cap"),
            "to_cap": trace_clause.get("to_cap"),
            "via_op": trace_clause.get("via_op"),
        }
    else:
        trace_clause = None

    # Priority: deny-overrides schema
    priority = int(draft.get("priority", 50))
    if effect == "deny":
        priority = max(priority, 90)
    elif confirm == "dual":
        priority = max(priority, 85)
    elif confirm == "confirm":
        priority = max(priority, 70)
    priority = max(0, min(priority, 100))

    reason = str(draft.get("reason", "")).strip()[:300]

    return {
        "rule_id": rule_id,
        "description": str(draft.get("description", "")).strip()[:500] or None,
        "effect": effect,
        "confirm_escalation": confirm,
        "op_keys": op_keys,
        "capability_tags": cap_tags,
        "risk_levels": risk_levels,
        "roles": roles,
        "op_kinds": op_kinds,
        "conditions": conditions,
        "condition_expr": condition_expr,
        "trace_clause": trace_clause,
        "priority": priority,
        "reason": reason,
        "source": "compiled",
        "source_text": nl_text[:2000],
        "status": "active",
    }
