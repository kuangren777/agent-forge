"""Admin API: view/switch the per-tenant LLM profiles (model + params), and
list the models the gateway currently offers. The API key is never exposed."""
from __future__ import annotations

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db import get_db
from app.deps import Principal, get_principal
from app.models.llmconfig import LLMProfile

router = APIRouter(tags=["llm-profiles"])


def _serialize(p: LLMProfile) -> dict:
    return {"role": p.role, "model": p.model, "temperature": p.temperature,
            "max_tokens": p.max_tokens, "timeout_s": p.timeout_s}


@router.get("/llm-profiles")
async def list_profiles(p: Principal = Depends(get_principal), db: AsyncSession = Depends(get_db)) -> dict:
    rows = (
        await db.execute(select(LLMProfile).where(LLMProfile.tenant_id == p.tenant_id))
    ).scalars().all()
    return {"base_url": settings.llm_base_url, "items": [_serialize(r) for r in rows]}


class ProfilePatch(BaseModel):
    model: str | None = None
    temperature: float | None = None
    max_tokens: int | None = None
    timeout_s: int | None = None


@router.patch("/llm-profiles/{role}")
async def patch_profile(
    role: str, body: ProfilePatch,
    p: Principal = Depends(get_principal), db: AsyncSession = Depends(get_db),
) -> dict:
    if not p.is_admin:
        raise HTTPException(status_code=403, detail="admin only")
    if role not in ("pllm", "qllm"):
        raise HTTPException(status_code=400, detail="role must be pllm|qllm")
    row = (
        await db.execute(
            select(LLMProfile).where(LLMProfile.tenant_id == p.tenant_id, LLMProfile.role == role)
        )
    ).scalar_one_or_none()
    if row is None:
        row = LLMProfile(tenant_id=p.tenant_id, role=role, model=settings.pllm_model)
        db.add(row)
    for field in ("model", "temperature", "max_tokens", "timeout_s"):
        val = getattr(body, field)
        if val is not None:
            setattr(row, field, val)
    await db.commit()
    return _serialize(row)


@router.get("/llm-models")
async def list_models(p: Principal = Depends(get_principal)) -> dict:
    """Proxy the gateway's model catalogue so the UI/installer can pick (admin)."""
    if not p.is_admin:
        raise HTTPException(status_code=403, detail="admin only")
    try:
        async with httpx.AsyncClient(timeout=20) as c:
            r = await c.get(f"{settings.llm_base_url}/models",
                            headers={"Authorization": f"Bearer {settings.llm_api_key}"})
            r.raise_for_status()
            data = r.json()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"gateway error: {exc}") from exc
    ids = sorted(m.get("id") for m in data.get("data", []) if m.get("id"))
    return {"models": ids}
