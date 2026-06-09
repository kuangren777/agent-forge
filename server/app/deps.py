"""Request dependencies — server-enforced identity & RBAC."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.identity import Role, Session, User, UserRole
from app.policies.engine import Identity

# server-side source of truth for which screens a role may see
ALLOWED_SCREENS = {
    "customer": ["chat", "flow"],
    "employee": ["chat", "flow", "live", "ops"],
    "admin": ["explore", "live", "chat", "flow", "ops", "audit", "plugins"],
}


class Principal:
    def __init__(self, user: User, role: str, tenant_id: uuid.UUID):
        self.user = user
        self.role = role
        self.tenant_id = tenant_id

    @property
    def identity(self) -> Identity:
        return Identity(user_id=str(self.user.id), role=self.role, display_name=self.user.display_name)


async def get_principal(
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> Principal:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="missing bearer token")
    token = authorization.split(" ", 1)[1].strip()
    sess = (
        await db.execute(select(Session).where(Session.token == token, Session.revoked.is_(False)))
    ).scalar_one_or_none()
    if sess is None:
        raise HTTPException(status_code=401, detail="invalid token")
    if sess.expires_at and sess.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="session expired")
    user = await db.get(User, sess.user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="user inactive")
    return Principal(user=user, role=sess.acting_role, tenant_id=user.tenant_id)


async def user_role_keys(db: AsyncSession, user_id: uuid.UUID) -> list[str]:
    rows = (
        await db.execute(
            select(Role.key)
            .join(UserRole, UserRole.role_id == Role.id)
            .where(UserRole.user_id == user_id)
        )
    ).scalars().all()
    return list(rows)
