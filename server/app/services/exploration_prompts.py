"""Exploration prompts — the core of automatic adaptation.

The product is a *framework*: when it is pointed at a brand-new enterprise
system it must expand itself into an adapter for that system automatically, at
initialization time, by using an LLM. These prompts drive that expansion and are
therefore a primary optimization target. They are deliberately kept together,
versioned, and documented so they can be iterated on as first-class assets.

Three prompts, one per discovery mode:
  PROPOSE_ENDPOINTS  — no served spec: the LLM proposes candidate REST endpoints
                       for the identified system; the framework then PROBES each
                       against the live target and keeps only the real ones.
  SELECT_FROM_SPEC   — a real endpoint catalogue exists (parsed OpenAPI/spec or
                       probe-verified proposals): the LLM curates the high-value
                       business operations and writes business-language names/desc.
  DESCRIBE_METADATA  — last resort (no reachable API): metadata-only extraction.

Design rules baked into the prompts (do not weaken without measuring):
  * Never invent parameters or paths that a system does not have — under-propose
    rather than hallucinate; the probe step will drop wrong guesses anyway.
  * Output must be COMPACT JSON (bounded lists, short fields) so it never gets
    truncated by the token limit — truncation = invalid JSON = failed adaptation.
  * Operation keys are stable, snake-cased `area.verb`; descriptions are written
    for a NON-TECHNICAL domain expert (the end user), in the system's own domain
    language, not HTTP/tech jargon.
"""
from __future__ import annotations

PROMPT_VERSION = "2026-07-07.1"

# ── Mode A: propose endpoints for a spec-less system, to be probe-verified ──────
PROPOSE_ENDPOINTS = """\
You are the discovery module of a self-adapting enterprise-integration framework.
You are given the identity of a live system (its product name, kind, connection
string). Many well-known enterprise products expose a documented REST API even
when they do not serve a machine-readable spec.

Propose the REST endpoints this specific product most likely exposes, based on
its real public API. For each: HTTP method, exact path (leading slash, real
version prefix like /api/v1, /api/v4, /admin, {placeholders} for path params),
a one-line purpose, and its query/path params and JSON body field names.

HARD RULES:
- Propose ONLY endpoints you are confident are part of THIS product's real API.
  It is far better to propose 8 correct endpoints than 20 with guesses — every
  proposal will be probed against the live system and wrong ones are discarded,
  but confident wrong guesses waste the budget.
- Use the product's real path prefixes and parameter names, not invented ones.
- Cover a useful spread: listing/search reads, single-item reads, and the few
  most important writes (create/update). Skip auth/login/health/metrics/static.
- Do NOT include destructive bulk deletes.

Return COMPACT JSON (≤ 20 endpoints, short strings):
{"endpoints":[
  {"method":"GET","path":"/api/v1/...","summary":"≤10 words",
   "params":{"name":{"in":"query|path","required":true|false,"type":"string"}},
   "body_fields":["field1","field2"]}
]}"""

# ── Mode B: curate business operations from a real endpoint catalogue ───────────
SELECT_FROM_SPEC = """\
You are the capability-synthesis module of a self-adapting enterprise-integration
framework. You are given the REAL, verified endpoint catalogue of a live system
(from its OpenAPI spec or probe-confirmed routes).

Select the 6-12 most valuable operations to expose to a governed AI agent that
serves business users of THIS system. For each, copy the endpoint's method and
path EXACTLY from the catalogue (do not alter or invent paths), assign a stable
snake-cased key `area.verb`, and write a short description IN THE SYSTEM'S OWN
BUSINESS LANGUAGE for a non-technical domain expert (no HTTP/tech jargon).

HARD RULES:
- ONLY use endpoints present in the catalogue, verbatim method+path.
- Prefer business-meaningful reads (lists, search, detail) and a few key writes
  (create/update). Skip auth/login/health/metrics/static/internal endpoints.
- Descriptions describe the business outcome ("查看所有订阅者", not "GET /subscribers").

Return COMPACT JSON (≤ 4 entities/≤6 fields, ≤4 rules, ≤3 chains, desc ≤15 words):
{"entities":[{"name":"..","fields":[".."]}],
 "operations":[{"key":"area.verb","desc":"业务语言描述","method":"GET","path":"/api/.."}],
 "rules":["business rule"], "chains":["likely multi-step chain"]}"""

# ── Mode C: metadata-only (no reachable API) ────────────────────────────────────
DESCRIBE_METADATA = """\
You explore an enterprise data source and propose callable operations an AI agent
could expose, from its metadata alone (no live API was reachable).
Return COMPACT JSON (≤4 entities/≤6 fields, ≤4 rules, ≤3 chains):
{"entities":[{"name":..,"fields":[..]}],
 "operations":[{"key":"area.verb","kind":"query|mutation","desc":"业务语言描述"}],
 "rules":[".."], "chains":[".."]}
Keep it realistic and concise (3-6 operations)."""
