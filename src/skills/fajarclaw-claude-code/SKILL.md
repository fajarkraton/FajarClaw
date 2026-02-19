---
name: FajarClaw Claude Code
description: Claude Code SDK/CLI wrapper, Git automation, dan MCP integration
version: 1.0.0
triggers:
  - route:claude-code
  - /generate-function
  - /generate-tests
---

# FajarClaw Claude Code

## Fungsi
Wrapper untuk Claude Code SDK/CLI yang menangani:
- Eksekusi coding tasks via Claude Code
- Git automation (commit, branch, PR)
- MCP server orchestration

## Kapabilitas

### A. Claude Code Execution
- **SDK Mode** (primary): `@anthropic-ai/claude-code` programmatic API
- **CLI Mode** (fallback): `claude -p "prompt" --output-format json`

### B. Git Automation
- `commit(message, files?)` → Conventional Commits format
- `createBranch(name)` → feat/*, fix/*, chore/* prefixes
- `createPR(title, body, base)` → GitHub PR with description
- `merge(pr, strategy)` → Squash merge to main

### C. MCP Server Orchestration
- GitHub: list issues, create PR, review code
- Sentry: error tracking
- Firebase: deploy, manage projects

## Files
- `claude-code.ts` — SDK/CLI execution wrapper
- `git-flow.ts` — Git automation utilities
- `mcp-manager.ts` — MCP server management
