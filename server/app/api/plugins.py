"""Plugins — pluggable interface contracts and registered implementations."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import Principal, get_principal
from app.models.registry import Plugin, PluginRegistration

router = APIRouter(tags=["plugins"])


@router.get("/plugins")
async def list_plugins(p: Principal = Depends(get_principal), db: AsyncSession = Depends(get_db)) -> dict:
    plugins = (
        await db.execute(select(Plugin).where(Plugin.tenant_id == p.tenant_id).order_by(Plugin.created_at))
    ).scalars().all()
    items = []
    for pl in plugins:
        regs = (
            await db.execute(select(PluginRegistration).where(PluginRegistration.plugin_id == pl.id))
        ).scalars().all()
        items.append({
            "id": str(pl.id), "iface": pl.iface, "sub": pl.sub, "icon": pl.icon,
            "code": pl.code_signature,
            "impls": [{"name": r.impl_name, "status": r.status, "version": r.version,
                       "health": r.health} for r in regs],
        })
    return {"items": items}


class RegisterIn(BaseModel):
    plugin_id: uuid.UUID
    impl_name: str
    version: str = "0.1.0"


@router.post("/plugins/registrations")
async def register_impl(
    body: RegisterIn, p: Principal = Depends(get_principal), db: AsyncSession = Depends(get_db)
) -> dict:
    if p.role != "admin":
        raise HTTPException(status_code=403, detail="admin only")
    pl = await db.get(Plugin, body.plugin_id)
    if pl is None or pl.tenant_id != p.tenant_id:
        raise HTTPException(status_code=404, detail="plugin not found")
    reg = PluginRegistration(plugin_id=pl.id, impl_name=body.impl_name, version=body.version,
                             status="wait", health="unknown")
    db.add(reg)
    await db.commit()
    return {"id": str(reg.id), "impl_name": reg.impl_name, "status": reg.status}
