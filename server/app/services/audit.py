"""Append-only audit hash chain.

Each event hashes the canonical JSON of its payload together with the previous
event's hash and its sequence number, so any tampering breaks the chain. The
trace row is locked (`FOR UPDATE`) while appending to serialise sequence numbers.
"""
from __future__ import annotations

import hashlib
import json
import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditEvent, Trace

GENESIS = "GENESIS"


def _canonical(obj: dict) -> str:
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False, default=str)


def compute_hash(seq: int, event_type: str, payload: dict, prev_hash: str) -> str:
    blob = f"{seq}|{event_type}|{_canonical(payload)}|{prev_hash}"
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()[:48]


async def append_event(
    db: AsyncSession,
    trace_id: uuid.UUID,
    event_type: str,
    payload: dict,
    *,
    cap: str = "data",
    actor_id: uuid.UUID | None = None,
) -> AuditEvent:
    # lock the trace row to serialise concurrent appends
    trace = (
        await db.execute(select(Trace).where(Trace.id == trace_id).with_for_update())
    ).scalar_one()

    last = (
        await db.execute(
            select(AuditEvent)
            .where(AuditEvent.trace_id == trace_id)
            .order_by(AuditEvent.seq.desc())
            .limit(1)
        )
    ).scalar_one_or_none()

    seq = (last.seq + 1) if last else 1
    prev_hash = last.hash if last else GENESIS
    h = compute_hash(seq, event_type, payload, prev_hash)

    event = AuditEvent(
        trace_id=trace_id,
        seq=seq,
        event_type=event_type,
        actor_id=actor_id,
        cap=cap,
        payload_json=payload,
        prev_hash=prev_hash,
        hash=h,
        created_at=datetime.now(timezone.utc),
    )
    db.add(event)
    trace.root_hash = h  # running head
    await db.flush()
    return event


async def verify_chain(db: AsyncSession, trace_id: uuid.UUID) -> dict:
    """Recompute every hash; report the first break if any."""
    events = (
        await db.execute(
            select(AuditEvent).where(AuditEvent.trace_id == trace_id).order_by(AuditEvent.seq)
        )
    ).scalars().all()
    prev = GENESIS
    for ev in events:
        expected = compute_hash(ev.seq, ev.event_type, ev.payload_json, prev)
        if expected != ev.hash or ev.prev_hash != prev:
            return {"valid": False, "broken_at_seq": ev.seq, "count": len(events)}
        prev = ev.hash
    return {"valid": True, "count": len(events), "head": prev}


async def event_count(db: AsyncSession, trace_id: uuid.UUID) -> int:
    return (
        await db.execute(select(func.count()).select_from(AuditEvent).where(AuditEvent.trace_id == trace_id))
    ).scalar_one()
