"""Capability lattice for CaMeL dataflow provenance.

A value carries a *set* of capability labels describing its provenance, not a
single tag. The core invariant (anti-laundering):

    Q-LLM output inherits the union of its inputs' capabilities — parsing
    untrusted data can never *raise* trust. A value is `trusted` only if every
    contributing input was trusted.

Trust ordering (lower rank = more trusted):
    trusted(0) < data(1) < parsed(2)

`write` is an *action* label (applied to a sink/result node), not a data
provenance level, so it is tracked separately.

`control_dep` is a *side-channel* label: a value produced inside a control-flow
branch that was influenced by untrusted data. It does NOT affect the trust rank
directly — instead it signals "this value's existence or content may reveal
information about untrusted data through a side channel." Policies targeting
control_dep escalate confirmation without denying the operation.
"""
from __future__ import annotations

from dataclasses import dataclass

TRUSTED = "trusted"
DATA = "data"
PARSED = "parsed"
WRITE = "write"
CONTROL_DEP = "control_dep"

# Data-flow trust rank (lower = more trusted). control_dep is NOT in this rank
# because it's a side-channel marker, not a data provenance level.
_RANK = {TRUSTED: 0, DATA: 1, PARSED: 2}


@dataclass(frozen=True)
class Capability:
    """The provenance of a single value."""
    labels: frozenset[str]

    @classmethod
    def of(cls, *labels: str) -> "Capability":
        return cls(frozenset(labels or {TRUSTED}))

    @property
    def trust_level(self) -> int:
        data_labels = [l for l in self.labels if l in _RANK]
        return max((_RANK[l] for l in data_labels), default=_RANK[TRUSTED])

    @property
    def dominant(self) -> str:
        """The single label used by the UI (the *least* trusted data label)."""
        if WRITE in self.labels:
            return WRITE
        level = self.trust_level
        for label, rank in _RANK.items():
            if rank == level:
                return label
        return DATA

    @property
    def is_trusted(self) -> bool:
        return self.trust_level == _RANK[TRUSTED] and WRITE not in self.labels

    def merge(self, other: "Capability") -> "Capability":
        """Union of provenance — used when combining inputs (no laundering)."""
        return Capability(self.labels | other.labels)

    def derive_parse(self) -> "Capability":
        """Q-LLM transform: output inherits inputs and is marked parsed."""
        return Capability(self.labels | {PARSED})

    def derive_control_dep(self) -> "Capability":
        """Mark a value as produced under control-flow influenced by untrusted data.

        This does NOT change the trust rank — it adds a side-channel marker
        that downstream policies can use to escalate confirmation without
        outright denial (no false positives from strict taint propagation).
        """
        return Capability(self.labels | {CONTROL_DEP})

    def as_list(self) -> list[str]:
        return sorted(self.labels)


def merge_all(caps: list[Capability]) -> Capability:
    out = Capability.of(TRUSTED)
    for c in caps:
        out = out.merge(c)
    # Drop the synthetic seed TRUSTED if other data labels exist
    if out.labels - {TRUSTED}:
        return Capability(out.labels - {TRUSTED}) if {DATA, PARSED} & out.labels else out
    return out


# confirm-level lattice (stricter wins)
_CONFIRM_RANK = {"auto": 0, "confirm": 1, "dual": 2}


def stricter_confirm(a: str, b: str) -> str:
    return a if _CONFIRM_RANK.get(a, 0) >= _CONFIRM_RANK.get(b, 0) else b


def required_confirm(op_kind: str, op_confirm: str, arg_caps: Capability, risk: str) -> str:
    """Decide the confirm level for a step.

    * queries never require human confirm.
    * a mutation whose arguments derive from `parsed` (Q-LLM) data is escalated
      to at least `confirm`.
    * a mutation whose arguments carry `control_dep` (side-channel marker) is
      escalated to at least `confirm` — this blocks timing/control-flow leaks
      without the false positives of full STRICT-taint propagation.
    * `dual` is forced for high-risk mutations.
    """
    if op_kind != "mutation":
        return "auto"
    level = op_confirm
    if PARSED in arg_caps.labels:
        level = stricter_confirm(level, "confirm")
    if CONTROL_DEP in arg_caps.labels:
        level = stricter_confirm(level, "confirm")
    if risk in ("high", "critical"):
        level = stricter_confirm(level, "dual")
    return level
