"""Policy engine — Python DSL + database rules, evaluated at four stages.

    inbound  → inject identity constraints into the request
    plan     → review the whole plan before any step runs
    step     → allow / deny / escalate each step
    post     → validate effects after execution

Rules come from TWO sources, merged with deny-overrides priority:
  1. Decorator-based @rule (backward compatible, Python DSL)
  2. PolicyRule rows in the database (NL-compiled or manually authored)

Database rules are adapted from AgentGuard's `matcher.py` pattern: each rule
specifies op_keys (wildcards), capability_tags, risk_levels, roles, and
conditions, and is evaluated deterministically.
"""
from __future__ import annotations

import re
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any, TYPE_CHECKING

from app.services.capabilities import Capability, required_confirm, stricter_confirm, PARSED, CONTROL_DEP

if TYPE_CHECKING:
    from app.models.policy import PolicyRule


@dataclass
class Identity:
    user_id: str
    role: str  # customer | employee | admin
    display_name: str = ""


@dataclass
class StepCtx:
    op_key: str
    op_kind: str           # query | mutation
    op_confirm: str        # auto | confirm | dual  (declared on the operation)
    risk: str              # low | high | critical
    kwargs: dict[str, Any]
    arg_caps: Capability
    allowed_roles: list[str]
    permission_scope: str | None = None  # e.g. "self" — restrict to caller's own data


@dataclass
class Decision:
    effect: str = "allow"          # allow | deny
    reason: str = ""
    injected: dict[str, Any] = field(default_factory=dict)
    required_confirm: str = "auto"


# ---- pluggable per-op rules ------------------------------------------------
RuleFn = Callable[[Identity, StepCtx], Decision | None]
_RULES: dict[str, list[RuleFn]] = {}


def rule(op_key: str = "*") -> Callable[[RuleFn], RuleFn]:
    def deco(fn: RuleFn) -> RuleFn:
        _RULES.setdefault(op_key, []).append(fn)
        return fn
    return deco


# ---- built-in rules --------------------------------------------------------
@rule("*")
def _customer_scope(identity: Identity, ctx: StepCtx) -> Decision | None:
    """A customer may only ever touch their own data — force the constraint."""
    if identity.role == "customer" and ctx.permission_scope == "self":
        return Decision(injected={"user_id": identity.user_id},
                        reason="customer scope: user_id forced to self")
    return None


# ---- database rule matching (AgentGuard pattern adapted to CaMeL) ----------
def _step_output_cap(ctx: StepCtx) -> str:
    """Map a step's kind to its output capability label.

    query → data, parse → parsed, write → write. Used by trace_clause matching.
    """
    return {
        "query": "data",
        "mutation": "write",
    }.get(ctx.op_kind, "data")


def _wildcard_match(value: str | None, patterns: list[str]) -> bool:
    """Check if value matches any pattern. '*' matches everything.
    'refund.*' matches 'refund.expedite'."""
    if value is None:
        return False
    for p in patterns:
        if p == "*" or p == value:
            return True
        if p.endswith("*") and value.startswith(p[:-1]):
            return True
    return False


def _resolve_field(field: str, identity: Identity, ctx: StepCtx) -> Any:
    """Resolve a dotted field path against the evaluation context."""
    parts = field.split(".")
    root_name = parts[0] if parts else ""
    rest = parts[1:] if len(parts) > 1 else []

    if root_name == "principal":
        principal = {
            "role": identity.role,
            "user_id": identity.user_id,
            "trust_level": 0 if identity.role == "admin" else (1 if identity.role == "employee" else 2),
        }
        cur: Any = principal
    elif root_name == "tool":
        tool = {
            "op_key": ctx.op_key,
            "kind": ctx.op_kind,
            "risk": ctx.risk,
            "confirm_level": ctx.op_confirm,
            **ctx.kwargs,
        }
        cur = tool
    elif root_name == "payload":
        payload = {"kind": ctx.op_kind, "risk": ctx.risk}
        cur = payload
    else:
        # Try principal first, then tool
        principal = {"role": identity.role, "user_id": identity.user_id}
        tool = {"op_key": ctx.op_key, "kind": ctx.op_kind, "risk": ctx.risk, **ctx.kwargs}
        cur = {**principal, **tool}
        # If root matches a known field, use it
        if root_name in cur:
            cur = cur[root_name]
            rest = parts

    for part in rest:
        if isinstance(cur, dict) and part in cur:
            cur = cur[part]
        else:
            return None
    return cur


def _apply_cond_op(op: str, actual: Any, expected: Any) -> bool:
    """Apply a comparison operator (mirrors AgentGuard's _apply_op)."""
    if op == "eq":
        return actual == expected
    if op == "ne":
        return actual != expected
    if op == "gt":
        try:
            return float(actual) > float(expected)
        except (TypeError, ValueError):
            return False
    if op == "lt":
        try:
            return float(actual) < float(expected)
        except (TypeError, ValueError):
            return False
    if op == "gte":
        try:
            return float(actual) >= float(expected)
        except (TypeError, ValueError):
            return False
    if op == "lte":
        try:
            return float(actual) <= float(expected)
        except (TypeError, ValueError):
            return False
    if op == "in":
        return actual in (expected or [])
    if op == "not_in":
        return actual not in (expected or [])
    if op == "contains":
        return str(expected) in str(actual or "")
    if op == "icontains":
        return str(expected).lower() in str(actual or "").lower()
    if op == "any_in":
        a = set(actual or []) if isinstance(actual, (list, set, tuple)) else {actual}
        return bool(a & set(expected or []))
    if op == "regex":
        return bool(re.search(str(expected), str(actual or "")))
    return False


def _match_db_rule(
    rule: "PolicyRule", identity: Identity, ctx: StepCtx
) -> Decision | None:
    """Evaluate a single database PolicyRule against a step context.

    Returns a Decision if the rule matches, None otherwise.
    Adapted from AgentGuard's PolicyRule.matches().
    """
    # 1. op_key wildcard match
    if rule.op_keys and not _wildcard_match(ctx.op_key, rule.op_keys):
        return None

    # 2. op_kind filter
    if rule.op_kinds and ctx.op_kind not in rule.op_kinds:
        return None

    # 3. capability_tag intersection (match if ANY tag present on arg_caps)
    if rule.capability_tags:
        arg_labels = ctx.arg_caps.labels
        if not (set(rule.capability_tags) & arg_labels):
            return None

    # 4. risk_level filter
    if rule.risk_levels and ctx.risk not in rule.risk_levels:
        return None

    # 5. role filter
    if rule.roles and identity.role not in rule.roles:
        return None

    # 6. conditions (field predicates)
    for cond in rule.conditions:
        if not isinstance(cond, dict):
            continue
        actual = _resolve_field(cond.get("field", ""), identity, ctx)
        op = cond.get("op", "eq")
        if not _apply_cond_op(op, actual, cond.get("value")):
            return None

    # 7. trace_clause (Layer 2: cross-step dataflow boundary)
    # If the rule defines a forbidden dataflow path, check whether this step
    # creates it.  from_cap ∈ arg_caps AND to_cap matches step's output kind
    # AND via_op (if set) is NOT the current operation (i.e. data is flowing
    # directly without mediation).
    if rule.trace_clause and isinstance(rule.trace_clause, dict):
        tc = rule.trace_clause
        from_cap = tc.get("from_cap")
        to_cap = tc.get("to_cap")
        via_op = tc.get("via_op")

        if from_cap and from_cap not in ctx.arg_caps.labels:
            return None

        if to_cap:
            step_out = _step_output_cap(ctx)
            if to_cap != step_out:
                return None

        if via_op and ctx.op_key == via_op:
            # The rule says "via_op must be present to allow this flow"
            # If the current step IS via_op, the flow is mediated → don't match
            return None

    # All checks passed → produce a Decision
    if rule.effect == "deny":
        return Decision(
            effect="deny",
            reason=rule.reason or f"blocked by policy rule '{rule.rule_id}'",
            required_confirm="auto",
        )

    # allow with optional confirm escalation
    escalation = rule.confirm_escalation or "auto"
    return Decision(
        effect="allow",
        reason=rule.reason or f"allowed by policy rule '{rule.rule_id}'",
        required_confirm=escalation,
    )


def _match_db_rules(
    db_rules: list["PolicyRule"], identity: Identity, ctx: StepCtx
) -> list[tuple[int, Decision]]:
    """Run all db rules against a step; return [(priority, decision), ...]."""
    results: list[tuple[int, Decision]] = []
    for rule in db_rules:
        if rule.status != "active":
            continue
        d = _match_db_rule(rule, identity, ctx)
        if d is not None:
            results.append((rule.priority, d))
    return results


# ---- merged evaluation surface ---------------------------------------------
def evaluate_step(
    identity: Identity,
    ctx: StepCtx,
    *,
    db_rules: list["PolicyRule"] | None = None,
) -> Decision:
    """Evaluate a step against all rules (decorator + database).

    Resolution order:
      1. RBAC gate (hard deny if role not allowed)
      2. Decorator @rule functions (Python DSL)
      3. Database PolicyRule rows (NL-compiled or manual)
      4. All results merged: highest-priority deny wins; otherwise
         the strictest confirm escalation from all matching allow rules
    """
    decision = Decision()

    # 1. RBAC: role must be permitted for this operation
    if identity.role not in ctx.allowed_roles:
        return Decision(
            effect="deny",
            reason=f"role '{identity.role}' not permitted for {ctx.op_key}",
        )

    # 2. apply per-op + global decorator rules
    for key in (ctx.op_key, "*"):
        for fn in _RULES.get(key, []):
            res = fn(identity, ctx)
            if res is None:
                continue
            if res.effect == "deny":
                return res
            decision.injected.update(res.injected)
            if res.reason:
                decision.reason = (decision.reason + "; " + res.reason).strip("; ")

    # 3. apply database rules
    if db_rules:
        db_results = _match_db_rules(db_rules, identity, ctx)
        # Sort: higher priority first; if tie, deny beats allow
        def _sort_key(item: tuple[int, Decision]) -> tuple[int, int]:
            prio, d = item
            # deny gets secondary rank 1, allow gets 0
            deny_rank = 1 if d.effect == "deny" else 0
            return (-prio, -deny_rank)

        db_results.sort(key=_sort_key)

        for prio, d in db_results:
            if d.effect == "deny":
                return d
            # accumulate confirm escalation
            decision.required_confirm = stricter_confirm(
                decision.required_confirm, d.required_confirm
            )
            if d.reason and d.reason not in decision.reason:
                decision.reason = (decision.reason + "; " + d.reason).strip("; ")

    # 4. capability-driven confirm level (parsed args / high risk escalate)
    decision.required_confirm = required_confirm(
        ctx.op_kind, ctx.op_confirm, ctx.arg_caps, ctx.risk
    )
    return decision


def evaluate_step_simple(identity: Identity, ctx: StepCtx) -> Decision:
    """Backward-compatible shorthand — no db rules."""
    return evaluate_step(identity, ctx, db_rules=None)


def evaluate_plan(
    identity: Identity,
    steps: list[StepCtx],
    *,
    db_rules: list["PolicyRule"] | None = None,
) -> Decision:
    """Aggregate review: deny the whole plan if any step is denied."""
    max_confirm = "auto"
    for ctx in steps:
        d = evaluate_step(identity, ctx, db_rules=db_rules)
        if d.effect == "deny":
            return Decision(effect="deny", reason=d.reason)
        max_confirm = stricter_confirm(max_confirm, d.required_confirm)
    return Decision(required_confirm=max_confirm, reason="plan approved by policy")
