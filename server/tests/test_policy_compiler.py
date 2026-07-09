"""Tests for NL→Policy compiler engine — CaMeL db_rules integration.

These tests exercise the pure-logic matching functions adapted from AgentGuard:
wildcard matching, field resolution, condition operators, and the merged
evaluate_step() pipeline with database-style PolicyRules.

All tests are pure-logic — no DB, no LLM, no I/O.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from types import SimpleNamespace
from typing import Any

from app.policies.engine import (
    Identity,
    StepCtx,
    Decision,
    evaluate_step,
    _wildcard_match,
    _apply_cond_op,
    _resolve_field,
    _match_db_rule,
)
from app.services.capabilities import Capability


# ── helpers ──────────────────────────────────────────────────────────
def _fake_rule(**overrides: Any) -> SimpleNamespace:
    """Create a PolicyRule-like object for testing without importing SQLAlchemy."""
    defaults: dict[str, Any] = {
        "rule_id": "test_rule",
        "effect": "deny",
        "confirm_escalation": None,
        "op_keys": [],
        "capability_tags": [],
        "risk_levels": [],
        "roles": [],
        "op_kinds": [],
        "conditions": [],
        "condition_expr": None,
        "trace_clause": None,
        "priority": 90,
        "reason": "test",
        "status": "active",
    }
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def _ctx(**overrides: Any) -> StepCtx:
    defaults: dict[str, Any] = {
        "op_key": "order.query",
        "op_kind": "query",
        "op_confirm": "auto",
        "risk": "low",
        "kwargs": {},
        "arg_caps": Capability.of("trusted"),
        "allowed_roles": ["customer", "employee", "admin"],
        "permission_scope": None,
    }
    defaults.update(overrides)
    return StepCtx(**defaults)


# ═════════════════════════════════════════════════════════════════════
#  wildcard_match
# ═════════════════════════════════════════════════════════════════════
def test_wildcard_exact():
    assert _wildcard_match("order.cancel", ["order.cancel"])
    assert not _wildcard_match("order.query", ["order.cancel"])


def test_wildcard_star():
    assert _wildcard_match("anything.here", ["*"])


def test_wildcard_prefix():
    assert _wildcard_match("refund.expedite", ["refund.*"])
    assert _wildcard_match("refund.cancel", ["refund.*"])
    assert not _wildcard_match("order.cancel", ["refund.*"])


def test_wildcard_multi_patterns():
    assert _wildcard_match("refund.expedite", ["order.*", "refund.*"])
    assert not _wildcard_match("customer.create", ["order.*", "refund.*"])


def test_wildcard_none_value():
    assert not _wildcard_match(None, ["*"])


# ═════════════════════════════════════════════════════════════════════
#  _apply_cond_op
# ═════════════════════════════════════════════════════════════════════
def test_cond_eq():
    assert _apply_cond_op("eq", "customer", "customer")
    assert not _apply_cond_op("eq", "customer", "admin")


def test_cond_ne():
    assert _apply_cond_op("ne", "customer", "admin")


def test_cond_gte_lte():
    assert _apply_cond_op("gte", 5000, 5000)
    assert _apply_cond_op("gte", 6000, 5000)
    assert not _apply_cond_op("gte", 4000, 5000)
    assert _apply_cond_op("lte", 3000, 5000)


def test_cond_in():
    assert _apply_cond_op("in", "customer", ["customer", "employee"])
    assert not _apply_cond_op("in", "admin", ["customer", "employee"])


def test_cond_contains():
    assert _apply_cond_op("contains", "hello world", "world")
    assert not _apply_cond_op("contains", "hello", "world")


def test_cond_regex():
    assert _apply_cond_op("regex", "order-123", r"order-\d+")
    assert not _apply_cond_op("regex", "refund-abc", r"order-\d+")


# ═════════════════════════════════════════════════════════════════════
#  _resolve_field
# ═════════════════════════════════════════════════════════════════════
def test_resolve_principal_role():
    identity = Identity(user_id="u1", role="employee")
    ctx = _ctx()
    assert _resolve_field("principal.role", identity, ctx) == "employee"


def test_resolve_tool_op_key():
    identity = Identity(user_id="u1", role="admin")
    ctx = _ctx(op_key="refund.expedite")
    assert _resolve_field("tool.op_key", identity, ctx) == "refund.expedite"


def test_resolve_tool_kwargs():
    identity = Identity(user_id="u1", role="admin")
    ctx = _ctx(kwargs={"amount": 6000, "order_id": "ORD-001"})
    assert _resolve_field("tool.amount", identity, ctx) == 6000


def test_resolve_payload_kind():
    identity = Identity(user_id="u1", role="admin")
    ctx = _ctx(op_kind="mutation")
    assert _resolve_field("payload.kind", identity, ctx) == "mutation"


def test_resolve_unknown_field():
    identity = Identity(user_id="u1", role="admin")
    ctx = _ctx()
    assert _resolve_field("nonexistent.field", identity, ctx) is None


# ═════════════════════════════════════════════════════════════════════
#  _match_db_rule — capability_tags matching
# ═════════════════════════════════════════════════════════════════════
def test_db_rule_capability_tag_match():
    """A rule with capability_tags=["parsed"] should match a step whose
    args include the 'parsed' label."""
    rule = _fake_rule(
        capability_tags=["parsed"],
        effect="allow",
        confirm_escalation="dual",
    )
    identity = Identity(user_id="u1", role="employee")
    ctx = _ctx(
        op_key="refund.expedite",
        op_kind="mutation",
        arg_caps=Capability.of("data", "parsed"),  # Q-LLM parsed data
        allowed_roles=["employee", "admin"],
    )
    d = _match_db_rule(rule, identity, ctx)
    assert d is not None
    assert d.effect == "allow"
    assert d.required_confirm == "dual"


def test_db_rule_capability_tag_no_match():
    """A rule with capability_tags=["parsed"] should NOT match a step
    whose args only carry 'trusted'."""
    rule = _fake_rule(capability_tags=["parsed"])
    identity = Identity(user_id="u1", role="employee")
    ctx = _ctx(
        arg_caps=Capability.of("trusted"),  # no parsed — P-LLM only
        allowed_roles=["employee", "admin"],
    )
    assert _match_db_rule(rule, identity, ctx) is None


def test_db_rule_capability_tag_write_match():
    """A rule restricting 'write'-tagged data should match write steps."""
    rule = _fake_rule(
        capability_tags=["write", "parsed"],
        effect="deny",
    )
    identity = Identity(user_id="u1", role="admin")
    ctx = _ctx(
        op_key="order.cancel",
        op_kind="mutation",
        arg_caps=Capability.of("write"),
        allowed_roles=["admin"],
    )
    d = _match_db_rule(rule, identity, ctx)
    assert d is not None
    assert d.effect == "deny"


# ═════════════════════════════════════════════════════════════════════
#  _match_db_rule — op_key wildcard matching
# ═════════════════════════════════════════════════════════════════════
def test_db_rule_op_key_wildcard():
    rule = _fake_rule(op_keys=["refund.*"], effect="deny")
    identity = Identity(user_id="u1", role="admin")
    ctx = _ctx(op_key="refund.expedite", allowed_roles=["admin"])
    assert _match_db_rule(rule, identity, ctx) is not None


def test_db_rule_op_key_no_match():
    rule = _fake_rule(op_keys=["order.*"])
    identity = Identity(user_id="u1", role="admin")
    ctx = _ctx(op_key="refund.expedite", allowed_roles=["admin"])
    assert _match_db_rule(rule, identity, ctx) is None


# ═════════════════════════════════════════════════════════════════════
#  _match_db_rule — role filter
# ═════════════════════════════════════════════════════════════════════
def test_db_rule_role_filter_match():
    rule = _fake_rule(roles=["customer"], effect="deny")
    identity = Identity(user_id="u1", role="customer")
    ctx = _ctx(allowed_roles=["customer", "employee", "admin"])
    assert _match_db_rule(rule, identity, ctx) is not None


def test_db_rule_role_filter_no_match():
    rule = _fake_rule(roles=["customer"], effect="deny")
    identity = Identity(user_id="u1", role="admin")
    ctx = _ctx(allowed_roles=["admin"])
    assert _match_db_rule(rule, identity, ctx) is None


# ═════════════════════════════════════════════════════════════════════
#  _match_db_rule — risk_level filter
# ═════════════════════════════════════════════════════════════════════
def test_db_rule_risk_filter():
    rule = _fake_rule(risk_levels=["high", "critical"], effect="deny")
    identity = Identity(user_id="u1", role="admin")
    ctx_high = _ctx(risk="high", allowed_roles=["admin"])
    ctx_low = _ctx(risk="low", allowed_roles=["admin"])
    assert _match_db_rule(rule, identity, ctx_high) is not None
    assert _match_db_rule(rule, identity, ctx_low) is None


# ═════════════════════════════════════════════════════════════════════
#  _match_db_rule — conditions
# ═════════════════════════════════════════════════════════════════════
def test_db_rule_condition_amount_threshold():
    rule = _fake_rule(
        conditions=[{"field": "tool.amount", "op": "gte", "value": 5000}],
        effect="allow",
        confirm_escalation="dual",
    )
    identity = Identity(user_id="u1", role="employee")
    ctx = _ctx(
        op_key="refund.expedite",
        op_kind="mutation",
        kwargs={"amount": 6000},
        allowed_roles=["employee", "admin"],
    )
    d = _match_db_rule(rule, identity, ctx)
    assert d is not None
    assert d.required_confirm == "dual"


def test_db_rule_condition_amount_below_threshold():
    rule = _fake_rule(
        conditions=[{"field": "tool.amount", "op": "gte", "value": 5000}],
    )
    identity = Identity(user_id="u1", role="employee")
    ctx = _ctx(kwargs={"amount": 3000})
    assert _match_db_rule(rule, identity, ctx) is None


def test_db_rule_multiple_conditions_all_pass():
    rule = _fake_rule(
        conditions=[
            {"field": "tool.amount", "op": "gte", "value": 5000},
            {"field": "principal.role", "op": "eq", "value": "customer"},
        ],
    )
    identity = Identity(user_id="u1", role="customer")
    ctx = _ctx(kwargs={"amount": 6000})
    assert _match_db_rule(rule, identity, ctx) is not None


def test_db_rule_multiple_conditions_one_fails():
    rule = _fake_rule(
        conditions=[
            {"field": "tool.amount", "op": "gte", "value": 5000},
            {"field": "principal.role", "op": "eq", "value": "customer"},
        ],
    )
    identity = Identity(user_id="u1", role="employee")
    ctx = _ctx(kwargs={"amount": 6000})
    assert _match_db_rule(rule, identity, ctx) is None  # role doesn't match


# ═════════════════════════════════════════════════════════════════════
#  evaluate_step() with db_rules — merged decision
# ═════════════════════════════════════════════════════════════════════
def test_evaluate_step_db_deny_overrides_decorator():
    """A db DENY rule should override any decorator rule that allows."""
    db_rules = [
        _fake_rule(
            rule_id="block_refunds",
            op_keys=["refund.*"],
            effect="deny",
            priority=90,
            reason="block_refunds: 禁止退款操作",
        )
    ]
    identity = Identity(user_id="u1", role="admin")
    ctx = _ctx(
        op_key="refund.expedite",
        op_kind="mutation",
        risk="high",
        arg_caps=Capability.of("parsed"),
        allowed_roles=["admin"],
    )
    d = evaluate_step(identity, ctx, db_rules=db_rules)
    assert d.effect == "deny"
    assert "block_refunds" in d.reason


def test_evaluate_step_db_confirm_escalation():
    """A db ALLOW rule with confirm_escalation=dual should escalate."""
    db_rules = [
        _fake_rule(
            rule_id="high_value_dual",
            op_keys=["refund.*"],
            capability_tags=["parsed"],
            effect="allow",
            confirm_escalation="dual",
            priority=85,
        )
    ]
    identity = Identity(user_id="u1", role="employee")
    ctx = _ctx(
        op_key="refund.expedite",
        op_kind="mutation",
        risk="high",
        arg_caps=Capability.of("parsed"),
        allowed_roles=["employee", "admin"],
    )
    d = evaluate_step(identity, ctx, db_rules=db_rules)
    assert d.effect == "allow"
    assert d.required_confirm == "dual"


def test_evaluate_step_db_rule_not_matching_is_ignored():
    """A db rule that doesn't match should be silently skipped."""
    db_rules = [
        _fake_rule(
            rule_id="refund_rule",
            op_keys=["refund.*"],  # doesn't match order.cancel
            effect="deny",
        )
    ]
    identity = Identity(user_id="u1", role="admin")
    ctx = _ctx(
        op_key="order.cancel",
        op_kind="mutation",
        allowed_roles=["admin"],
    )
    d = evaluate_step(identity, ctx, db_rules=db_rules)
    # Should pass — no rule matched
    assert d.effect == "allow"


def test_evaluate_step_rbac_deny_comes_first():
    """RBAC deny happens before any db rules are checked."""
    db_rules = [
        _fake_rule(
            rule_id="allow_all", op_keys=["*"], effect="allow"
        )
    ]
    identity = Identity(user_id="u1", role="customer")
    ctx = _ctx(
        op_key="admin.only",
        allowed_roles=["admin"],  # customer NOT allowed
    )
    d = evaluate_step(identity, ctx, db_rules=db_rules)
    assert d.effect == "deny"
    assert "not permitted" in d.reason


def test_evaluate_step_disabled_rule_ignored():
    """Rules with status='disabled' should be skipped."""
    db_rules = [
        _fake_rule(
            rule_id="disabled_rule",
            op_keys=["*"],
            effect="deny",
            status="disabled",  # ← disabled
        )
    ]
    identity = Identity(user_id="u1", role="admin")
    ctx = _ctx(allowed_roles=["admin"])
    d = evaluate_step(identity, ctx, db_rules=db_rules)
    assert d.effect == "allow"  # disabled rule ignored


def test_evaluate_step_backward_compat_no_db_rules():
    """Calling evaluate_step without db_rules should work exactly as before."""
    identity = Identity(user_id="cust-1", role="customer")
    ctx = _ctx(
        op_key="order.query",
        permission_scope="self",
        allowed_roles=["customer", "employee", "admin"],
    )
    d = evaluate_step(identity, ctx)  # no db_rules arg
    assert d.effect == "allow"
    assert d.injected.get("user_id") == "cust-1"


# ═════════════════════════════════════════════════════════════════════
#  priority ordering — deny-overrides
# ═════════════════════════════════════════════════════════════════════
def test_priority_higher_wins():
    """Rule with priority=95 (deny) should beat priority=70 (confirm)."""
    db_rules = [
        _fake_rule(
            rule_id="low_prio_allow",
            op_keys=["refund.*"],
            effect="allow",
            confirm_escalation="confirm",
            priority=70,
        ),
        _fake_rule(
            rule_id="high_prio_deny",
            op_keys=["refund.*"],
            effect="deny",
            priority=95,
            reason="high_prio_deny: 高优先级阻断",
        ),
    ]
    identity = Identity(user_id="u1", role="admin")
    ctx = _ctx(
        op_key="refund.expedite",
        op_kind="mutation",
        allowed_roles=["admin"],
    )
    d = evaluate_step(identity, ctx, db_rules=db_rules)
    assert d.effect == "deny"
    assert "high_prio_deny" in d.reason


def test_priority_tie_deny_wins():
    """Same priority: deny beats allow."""
    db_rules = [
        _fake_rule(rule_id="allow_rule", op_keys=["*"], effect="allow", priority=80),
        _fake_rule(rule_id="deny_rule", op_keys=["*"], effect="deny", priority=80),
    ]
    identity = Identity(user_id="u1", role="admin")
    ctx = _ctx(allowed_roles=["admin"])
    d = evaluate_step(identity, ctx, db_rules=db_rules)
    assert d.effect == "deny"
