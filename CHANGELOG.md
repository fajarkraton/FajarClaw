# Changelog

All notable changes to FajarClaw will be documented in this file.

## [0.1.0-mvp] — 2026-02-19

### 🎉 Phase A1 — MVP Foundation (Week 1)

First release of FajarClaw v4.0 MVP. Establishes the dual-engine architecture
with 3 operational skills on top of OpenClaw.

### Added

#### Skill 1 — FajarClaw Router
- Keyword-weighted scoring for task classification (Claude Code / Antigravity / Dual)
- Override commands: `/build:cc`, `/build:ag`, `/build:dual`, `/build`
- Collaboration patterns: pipeline, parallel, verify
- Dual-engine result merger with pattern-aware formatting

#### Skill 2 — FajarClaw Claude Code
- SDK/CLI dual-mode wrapper with auto-detection
- Git automation with Conventional Commits format
- Branch management (feat/*, fix/*, chore/* prefixes)
- MCP server listing and status display

#### Skill 3 — FajarClaw Antigravity
- IDE/Browser dual-mode connector with fallback
- Multi-agent spawning: parallel, sequential, dependency-aware
- 7 WF-01 workflow triggers with argument parsing and prompt templates
- Workflow registry: generate-component, generate-function, generate-crud, generate-gworkspace, generate-tests, review-security, deploy-check

#### Infrastructure
- TypeScript 5.9 strict mode, ESM, Node.js ≥22
- vitest test suite with 93+ unit tests + E2E integration tests
- OpenClaw v2026.2.17 integration
- AGENTS.md persona + CLAUDE.md codebase context
- 4 SKILL.md definitions

### Technical Stack
- Node.js v22.22.0
- OpenClaw 2026.2.17
- Claude Code 2.1.47
- TypeScript 5.9.3
- vitest 4.0.18
