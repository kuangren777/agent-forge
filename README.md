# agent-forge

> Workbench to **forge and govern enterprise AI agents** — explore your systems, generate capability-scoped operations, visualize dataflow, and audit every action.

`agent-forge` is the operations console (工作台) for building safe, business-facing AI agents on top of the **CaMeL dual-LLM pattern** (a privileged planner LLM + a quarantined parser LLM, with every value carrying a security capability). Instead of letting an agent run free over your databases and APIs, you map the systems once, mint operations with explicit permissions and confirmation levels, watch data flow through the capability graph, and keep a full audit trail.

This repo is the **frontend prototype** — Vite + React + TypeScript + Tailwind.

## What's inside

The console is organized into screens (`src/screens/`):

| Screen | Purpose |
| --- | --- |
| **Explore** | Connect & map data sources — source code, DB, API (OpenAPI), admin panels, docs — through phased cognition (全局认知 → 深度探索 → 操作生成 → 能力标注). |
| **Flow** | Dataflow graph annotating each value with a capability: `trusted` / `data` / `parsed` / `write`. |
| **Ops** | Operation Registry — every callable op with its type (query/mutation), permission tier, confirmation level (auto / confirm / dual), and allowed roles. |
| **Audit** | Per-trace audit chain for replaying what an agent did and why. |
| **Chat** | Operator-facing chat surface driving the agent. |
| **Live** | Live execution view. |
| **Plugins** | Extensibility center for adding capabilities. |

## Quick start

```bash
npm install
npm run dev        # Vite dev server
npm run test       # vitest + React Testing Library
npm run build      # tsc + vite build
```

## Stack

React 18 · TypeScript · Vite 5 · Tailwind CSS 3 · Vitest + Testing Library.

## Status

Early prototype (`v0.1`). UI and mock data only — see `src/lib/data.ts` for the fixtures driving each screen.
