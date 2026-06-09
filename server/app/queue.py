"""Arq (Redis-backed) job queue — durable background tasks.

A single shared pool is created lazily and reused. Used to enqueue exploration
jobs so they survive process restarts and run in a dedicated worker (app.worker),
instead of an in-process fire-and-forget asyncio task.
"""
from __future__ import annotations

from arq import create_pool
from arq.connections import ArqRedis, RedisSettings

from app.config import settings

_pool: ArqRedis | None = None


def redis_settings() -> RedisSettings:
    return RedisSettings.from_dsn(settings.redis_url)


async def get_pool() -> ArqRedis:
    global _pool
    if _pool is None:
        _pool = await create_pool(redis_settings())
    return _pool


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.aclose()
        _pool = None
