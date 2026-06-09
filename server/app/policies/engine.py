"""Policy engine — Python DSL, evaluated at four stages.

    inbound  → inject identity constraints into the request
    plan     → review the whole plan before any step runs
    step     → allow / deny / escalate each step
    post     → validate effects after execution

This is intentionally a small composable rule set; OPA/Casbin can be slotted in
later behind the same `evaluate_*` surface.
"""
from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any

from app.services.capabilities import Capability, required_confirm


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


# ---- evaluation surface ----------------------------------------------------
def evaluate_step(identity: Identity, ctx: StepCtx) -> Decision:
    decision = Decision()

    # 1. RBAC: role must be permitted for this operation
    if identity.role not in ctx.allowed_roles:
        return Decision(effect="deny", reason=f"role '{identity.role}' not permitted for {ctx.op_key}")

    # 2. apply per-op + global rules (may inject constraints or deny)
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

    # 3. capability-driven confirm level (parsed args / high risk escalate)
    effective_caps = ctx.arg_caps
    decision.required_confirm = required_confirm(
        ctx.op_kind, ctx.op_confirm, effective_caps, ctx.risk
    )
    return decision


def evaluate_plan(identity: Identity, steps: list[StepCtx]) -> Decision:
    """Aggregate review: deny the whole plan if any step is denied."""
    max_confirm = "auto"
    from app.services.capabilities import stricter_confirm
    for ctx in steps:
        d = evaluate_step(identity, ctx)
        if d.effect == "deny":
            return Decision(effect="deny", reason=d.reason)
        max_confirm = stricter_confirm(max_confirm, d.required_confirm)
    return Decision(required_confirm=max_confirm, reason="plan approved by policy")
