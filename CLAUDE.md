# CLAUDE.md — FajarClaw Codebase Context

## Project Overview
FajarClaw v4.0 — Automatic Digital Programmer System
Extension Layer di atas OpenClaw, dengan 4 custom skills.

## Tech Stack
- Runtime: Node.js ≥22, TypeScript 5.9 (strict mode)
- Package Manager: pnpm
- Testing: vitest
- Platform: OpenClaw (ws://127.0.0.1:18789)
- AI Model: Claude Opus 4.6 (shared by both engines)

## Project Structure
```
FajarClaw/
├── src/
│   ├── skills/
│   │   ├── fajarclaw-router/       → Task classification + routing
│   │   ├── fajarclaw-claude-code/  → Claude Code SDK wrapper + Git
│   │   ├── fajarclaw-antigravity/  → IDE connector + browser
│   │   └── fajarclaw-rag/          → RAG pipeline (Phase A2+)
│   ├── lib/                        → Shared utilities
│   └── types/                      → TypeScript interfaces
├── scripts/                        → Setup & utility scripts
├── AGENTS.md                       → FajarClaw persona
├── CLAUDE.md                       → This file
├── openclaw.json                   → OpenClaw configuration
├── tsconfig.json                   → TypeScript config (strict)
└── package.json                    → Project manifest
```

## Coding Standards
- TypeScript strict: no `any`, proper types everywhere
- Imports: use Node.js ESM (import/export)
- Comments: Bahasa Indonesia for logic, English for technical
- Error handling: try-catch on all async operations
- Pattern: @ref comments linking to spec documents

## Current Phase
Phase A1 — MVP Foundation (Week 1-2)
Building: Router (keyword) + Claude Code wrapper + Antigravity bridge
