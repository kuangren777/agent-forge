"""Per-tenant LLM profile — which model + params each role (P-LLM/Q-LLM) uses.

Lets operators switch models / tune params at runtime (via the admin API or the
installer) without editing env or restarting. The API key stays in env (a secret);
only the non-secret model selection lives here.
"""
import uuid

from sqlalchemy import Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, uuid_pk


class LLMProfile(Base, TimestampMixin):
    __tablename__ = "llm_profiles"
    __table_args__ = (UniqueConstraint("tenant_id", "role", name="uq_llm_profile_role"),)

    id: Mapped[uuid.UUID] = uuid_pk()
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(10), nullable=False)  # pllm | qllm
    model: Mapped[str] = mapped_column(String(80), nullable=False)
    temperature: Mapped[float] = mapped_column(Float, default=0.1, nullable=False)
    max_tokens: Mapped[int] = mapped_column(Integer, default=1500, nullable=False)
    timeout_s: Mapped[int] = mapped_column(Integer, default=90, nullable=False)
