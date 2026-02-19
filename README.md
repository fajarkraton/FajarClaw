# FajarClaw v4.0

> Automatic Digital Programmer — Dual-Engine Architecture with RAG-Enhanced Routing

FajarClaw mengorkestrasikan dua AI engine — **Claude Code** (terminal/backend) dan **Antigravity** (visual/frontend) — dengan RAG-enhanced routing untuk develop software secara otonom.

## Quick Start

```bash
# Prerequisites
node --version   # ≥22
pnpm --version   # ≥10

# Install dependencies
pnpm install

# Run tests
pnpm test

# Type check
pnpm typecheck

# Dev mode
pnpm dev
```

## Architecture

```
User Message → Router (keyword scoring) → Engine Selection
                                            ├── Claude Code (terminal/backend)
                                            ├── Antigravity (visual/frontend)
                                            └── Dual Mode (both engines)
                                          → Result Merger → Response
```

## Skills

| Skill | Directory | Function |
|-------|-----------|----------|
| **Router** | `src/skills/fajarclaw-router/` | Task classification + routing |
| **Claude Code** | `src/skills/fajarclaw-claude-code/` | SDK/CLI wrapper + Git + MCP |
| **Antigravity** | `src/skills/fajarclaw-antigravity/` | IDE connector + agents + workflows |
| **RAG** | `src/skills/fajarclaw-rag/` | RAG pipeline (Phase A2) |

## Commands

```
/build [task]           Auto-route to best engine
/build:cc [task]        Force Claude Code
/build:ag [task]        Force Antigravity
/build:dual [task]      Force both engines
/generate-component     React component + test
/generate-crud          Full CRUD (API + UI)
/generate-tests         Unit + integration tests
/review-security        Security audit
/deploy-check           Pre-deploy checklist
```

## Development

```bash
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
pnpm typecheck         # TypeScript strict check
pnpm build             # Compile to dist/
```

## Roadmap

- **Phase A1** ✅ MVP Foundation (Skills 1-3)
- **Phase A2** ⬜ Text RAG Core (Milvus + BGE-M3)
- **Phase A3** ⬜ Precision & Hybrid RAG
- **Phase A4** ⬜ Intelligence Layer
- **Phase A5** ⬜ Visual RAG + v4.0 Release

## License

MIT © Fajar AM
