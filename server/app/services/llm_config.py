"""Resolve which model + params a tenant uses for a given LLM role.

Reads the per-tenant `llm_profiles` row; falls back to the env defaults when no
row exists. The API key/base-url always come from env (secret) — only the model
selection is data.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.llmconfig import LLMProfile

_ENV_DEFAULTS = {
    "pllm": {"max_tokens": 1600},
    "qllm": {"max_tokens": 900},
}


@dataclass
class ResolvedProfile:
    model: str
    temperature: float
    max_tokens: int
    timeout_s: int


async def resolve(db: AsyncSession, tenant_id: uuid.UUID, role: str) -> ResolvedProfile:
    row = (
        await db.execute(
            select(LLMProfile).where(LLMProfile.tenant_id == tenant_id, LLMProfile.role == role)
        )
    ).scalar_one_or_none()
    if row is not None:
        return ResolvedProfile(row.model, row.temperature, row.max_tokens, row.timeout_s)
    env_model = settings.pllm_model if role == "pllm" else settings.qllm_model
    return ResolvedProfile(env_model, 0.1, _ENV_DEFAULTS.get(role, {}).get("max_tokens", 1500), 90)
