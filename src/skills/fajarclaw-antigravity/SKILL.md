---
name: FajarClaw Antigravity
description: Antigravity IDE connector, browser control, multi-agent spawning, dan workflow proxy
version: 1.0.0
triggers:
  - route:antigravity
  - /generate-component
  - /generate-crud
  - /generate-gworkspace
  - /review-security
  - /deploy-check
---

# FajarClaw Antigravity

## Fungsi
Bridge ke Antigravity IDE untuk visual/frontend tasks:
- IDE connection dan task dispatch
- Browser control via CDP (fallback)
- Multi-agent spawning untuk parallel tasks
- WF-01 workflow triggers

## Kapabilitas

### A. IDE Connection
- Detect Antigravity IDE running
- Connect via IDE API (if available)
- Fallback: OpenClaw browser CDP (Chromium)

### B. Multi-Agent Spawning
- `spawnParallel(tasks[])` → Multiple agents simultaneously
- `spawnSequential(tasks[])` → Chain of agents in order
- Fallback: sequential via single agent

### C. Workflow Triggers (WF-01)
- `/generate-component` → React component + test
- `/generate-function` → Cloud Function + middleware
- `/generate-crud` → CRUD operations
- `/generate-gworkspace` → Google Workspace API
- `/generate-tests` → Unit + integration tests
- `/review-security` → Security audit report
- `/deploy-check` → Deployment checklist

## Files
- `antigravity.ts` — IDE connector + browser control
- `agent-manager.ts` — Multi-agent spawning
- `workflow-triggers.ts` — WF-01 workflow proxy
