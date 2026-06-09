"""Health + LLM connectivity probe."""
from fastapi import APIRouter

from app.config import settings
from app.services.llm import LLMError, llm

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict:
    return {"status": "ok", "env": settings.app_env}


@router.get("/health/llm")
async def health_llm() -> dict:
    """Verify the camel-hub gateway answers for both model roles."""
    out: dict = {"base_url": settings.llm_base_url}
    for role, model in (("pllm", settings.pllm_model), ("qllm", settings.qllm_model)):
        try:
            res = await llm.chat(
                model,
                [{"role": "user", "content": "reply with exactly: PONG"}],
                max_tokens=8,
            )
            out[role] = {"model": model, "ok": "PONG" in res.content.upper(), "latency_ms": res.latency_ms}
        except LLMError as exc:
            out[role] = {"model": model, "ok": False, "error": str(exc)}
    return out
