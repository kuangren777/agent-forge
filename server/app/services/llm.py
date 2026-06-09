"""OpenAI-compatible LLM client targeting the camel-hub gateway.

Two roles share this client but are configured with different models and,
crucially, different privilege envelopes enforced by the callers:

* P-LLM (planner)  — claude-sonnet-4-5, sees only its own code/plan, never raw data.
* Q-LLM (qparser)  — claude-haiku-4-5, quarantined: sees restricted data slices,
  output is never marked `trusted`.
"""
import json
import re
import time
from dataclasses import dataclass, field
from typing import Any

import httpx

from app.config import settings


@dataclass
class LLMResult:
    content: str
    model: str
    latency_ms: int
    usage: dict[str, Any] = field(default_factory=dict)
    raw: dict[str, Any] = field(default_factory=dict)


class LLMError(RuntimeError):
    pass


class LLMClient:
    def __init__(self, base_url: str | None = None, api_key: str | None = None):
        self.base_url = (base_url or settings.llm_base_url).rstrip("/")
        self.api_key = api_key or settings.llm_api_key
        self._client: httpx.AsyncClient | None = None

    def _http(self) -> httpx.AsyncClient:
        # one pooled client reused across calls (keep-alive); closed on shutdown
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                limits=httpx.Limits(max_connections=20, max_keepalive_connections=10)
            )
        return self._client

    async def aclose(self) -> None:
        if self._client is not None and not self._client.is_closed:
            await self._client.aclose()
        self._client = None

    async def chat(
        self,
        model: str,
        messages: list[dict[str, str]],
        *,
        temperature: float = 0.2,
        max_tokens: int = 1500,
        timeout: float = 90.0,
    ) -> LLMResult:
        if not self.api_key:
            raise LLMError("LLM_API_KEY is not configured")
        started = time.monotonic()
        resp = await self._http().post(
            f"{self.base_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            },
            timeout=timeout,
        )
        latency = int((time.monotonic() - started) * 1000)
        if resp.status_code != 200:
            raise LLMError(f"LLM {model} HTTP {resp.status_code}: {resp.text[:300]}")
        data = resp.json()
        if "error" in data:
            raise LLMError(f"LLM {model}: {data['error']}")
        try:
            content = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as exc:
            raise LLMError(f"LLM {model}: malformed response {data}") from exc
        return LLMResult(
            content=content,
            model=model,
            latency_ms=latency,
            usage=data.get("usage", {}),
            raw=data,
        )

    async def structured(
        self,
        model: str,
        system: str,
        user: str,
        *,
        temperature: float = 0.1,
        max_tokens: int = 1800,
    ) -> tuple[dict[str, Any], LLMResult]:
        """Ask for strict JSON and parse it (tolerant of ```json fences)."""
        result = await self.chat(
            model,
            [
                {"role": "system", "content": system + "\n\nReply with ONLY valid JSON, no prose."},
                {"role": "user", "content": user},
            ],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return _parse_json(result.content), result


def _parse_json(text: str) -> dict[str, Any]:
    text = text.strip()
    fenced = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.DOTALL)
    if fenced:
        text = fenced.group(1)
    else:
        brace = text.find("{")
        if brace > 0:
            text = text[brace:]
    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        raise LLMError(f"LLM did not return valid JSON: {text[:300]}") from exc


# module-level singletons
llm = LLMClient()
