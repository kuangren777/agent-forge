"""FastAPI application entrypoint for agent-forge."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings

app = FastAPI(
    title="agent-forge API",
    version="0.1.0",
    description="CaMeL governance engine — sources, registry, plans, approvals, audit.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _include_routers() -> None:
    """Routers are registered lazily so a missing optional module never breaks boot."""
    from app.api import health

    app.include_router(health.router, prefix="/api/v1")

    for modname, attr in [
        ("identity", "router"),
        ("sources", "router"),
        ("registry", "router"),
        ("approvals", "router"),
        ("chat", "router"),
        ("traces", "router"),
        ("executions", "router"),
        ("plugins", "router"),
    ]:
        try:
            mod = __import__(f"app.api.{modname}", fromlist=[attr])
            app.include_router(getattr(mod, attr), prefix="/api/v1")
        except ModuleNotFoundError:
            pass


_include_routers()


@app.get("/")
async def root() -> dict:
    return {"service": "agent-forge", "docs": "/docs", "health": "/api/v1/health"}
