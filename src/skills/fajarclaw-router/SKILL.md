---
name: FajarClaw Router
description: Task classification, RAG-enhanced routing, dan context injection untuk dual-engine architecture
version: 1.0.0
triggers:
  - /build
  - /build:cc
  - /build:ag
  - /build:dual
  - /sprint
  - /status
---

# FajarClaw Router

## Fungsi
Skill ini menerima perintah dari user, mengklasifikasikan task, dan mengarahkan ke engine yang tepat:
- **Claude Code** → terminal/backend tasks
- **Antigravity** → visual/frontend tasks
- **Dual Mode** → kedua engine bersamaan

## Cara Kerja
1. Receive task message dari gateway
2. Keyword scoring: match keywords → weighted sum → confidence
3. (Phase A2+) RAG: embed message → Milvus semantic search
4. Route decision: Claude Code / Antigravity / Dual
5. (Phase A2+) Inject: relevant docs + existing code → context
6. Dispatch to appropriate engine skill

## Override Commands
- `/build:cc [task]` — Force route ke Claude Code
- `/build:ag [task]` — Force route ke Antigravity  
- `/build:dual [task]` — Force kedua engine
- `/build [task]` — Auto-route (default)

## Files
- `router.ts` — Keyword + semantic classification logic
- `patterns.ts` — Pipeline, parallel, verify collaboration patterns
- `merger.ts` — Dual-engine result merging
