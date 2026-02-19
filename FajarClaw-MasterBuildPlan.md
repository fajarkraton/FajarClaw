# FAJARCLAW — MASTER BUILD PLAN

## Factory-First Strategy: Bangun Mesin Dulu, Produksi Kemudian

| Field | Detail |
|-------|--------|
| **Kode Dokumen** | FC-BP-01 (Build Plan) |
| **Versi** | 1.0 |
| **Tanggal** | 19 Februari 2026 |
| **Author** | Fajar AM + Claude Opus 4.6 |
| **Strategi** | FajarClaw-First — Build the Factory Before Products |
| **Target Hardware** | RTX 4090 Laptop, 16GB VRAM, 32GB RAM, 2TB NVMe |
| **Durasi** | Phase A: 10 Minggu (Build Factory) → Phase B: Produksi |
| **Status** | Ready for Execution |

---

## DAFTAR ISI

1. [Strategi FajarClaw-First](#1-strategi-fajarclaw-first)
2. [Progressive Self-Building Concept](#2-progressive-self-building-concept)
3. [Master Timeline](#3-master-timeline)
4. [Phase A1 — MVP Foundation (Minggu 1-2)](#4-phase-a1--mvp-foundation-minggu-1-2)
5. [Phase A2 — Text RAG Core (Minggu 3-4)](#5-phase-a2--text-rag-core-minggu-3-4)
6. [Phase A3 — Precision & Hybrid (Minggu 5-6)](#6-phase-a3--precision--hybrid-minggu-5-6)
7. [Phase A4 — Intelligence Layer (Minggu 7-8)](#7-phase-a4--intelligence-layer-minggu-7-8)
8. [Phase A5 — Visual RAG (Minggu 9-10)](#8-phase-a5--visual-rag-minggu-9-10)
9. [Phase A6 — Dogfooding & Release (Minggu 10)](#9-phase-a6--dogfooding--release-minggu-10)
10. [Phase B — Factory Produces Products](#10-phase-b--factory-produces-products)
11. [Quality Gates & Exit Criteria](#11-quality-gates--exit-criteria)
12. [Dependency Map & Critical Path](#12-dependency-map--critical-path)
13. [Daily Standup Template](#13-daily-standup-template)
14. [Troubleshooting Guide](#14-troubleshooting-guide)
15. [Dokumen Referensi](#15-dokumen-referensi)

---

## 1. Strategi FajarClaw-First

### 1.1 Core Insight

```
TRADISIONAL:
  Developer → manual coding → Project A (lambat)
  Developer → manual coding → Project B (lambat)
  Developer → manual coding → Project C (lambat)
  Total: 3 × lambat = lambat × 3

FAJARCLAW-FIRST:
  Developer → bangun FajarClaw (invest 10 minggu)
           → FajarClaw builds Project A (2-3× speed)
           → FajarClaw builds Project B (2-3× speed, + knowledge dari A)
           → FajarClaw builds Project C (3-4× speed, + knowledge dari A+B)
  Total: 1 × invest + N × cepat + compound intelligence
```

**FajarClaw bukan produk. FajarClaw adalah mesin yang memproduksi produk.**

### 1.2 Compound Returns

Setiap proyek yang FajarClaw kerjakan menambah knowledge di RAG:

```
PROYEK 1 (ITAMS): RAG learns 67 docs + ITAMS patterns + sprint decisions
                  → FajarClaw skill level: ██████░░░░ 60%

PROYEK 2 (???):   RAG has ITAMS knowledge + new project patterns
                  → FajarClaw skill level: ████████░░ 80%

PROYEK 3 (???):   RAG has accumulated knowledge from 2 projects
                  → FajarClaw skill level: █████████░ 90%

PROYEK N:         RAG = encyclopedia of patterns, decisions, solutions
                  → FajarClaw skill level: ██████████ 100%
```

### 1.3 First Customer: ITAMS TaxPrime

ITAMS TaxPrime (WF-01) adalah test case sempurna karena:

| Faktor | Alasan |
|--------|--------|
| 67+ dokumen sudah siap | RAG punya data untuk di-index |
| WF-01 workflow sudah detail | Sprint cycle bisa di-automate |
| 10 sprint × 2 minggu = 20 minggu | Cukup durasi untuk compound effect |
| Multi-domain (Firebase, Workspace, UI, API) | Test dual-engine secara lengkap |
| Semua spek sudah tertulis | Perfect untuk document-code traceability |

---

## 2. Progressive Self-Building Concept

### 2.1 The Bootstrap Problem

> "Siapa yang membangun FajarClaw kalau FajarClaw belum ada?"

Jawabannya: **FajarClaw membangun dirinya sendiri secara progresif.**

```
SELF-BUILDING PROGRESSION:

Minggu 1-2: MANUAL BUILD
┌─────────────────────────────────────────────────────────────┐
│ Developer + Claude Code (biasa, tanpa FajarClaw)            │
│ └→ Output: FajarClaw MVP (3 skills + AGENTS.md)             │
│    Capability: keyword routing, basic engine dispatch        │
│    Self-use: ❌ Belum cukup capable                         │
└─────────────────────────────────────────────────────────────┘
              │
              ▼ FajarClaw MVP jadi aktif
Minggu 3-4: SEMI-ASSISTED BUILD
┌─────────────────────────────────────────────────────────────┐
│ Developer + FajarClaw MVP (keyword router)                  │
│ └→ /build "implement BGE-M3 embedder"                       │
│    FajarClaw routes ke Claude Code → generates code          │
│    Developer review + refine                                 │
│ └→ Output: Skill 4 (RAG) + Milvus + BGE-M3                 │
│    Self-use: ⚠️ Parsial — bisa bantu generate, belum smart  │
└─────────────────────────────────────────────────────────────┘
              │
              ▼ RAG jadi aktif, FajarClaw bisa "baca" docs
Minggu 5-6: AI-ASSISTED BUILD
┌─────────────────────────────────────────────────────────────┐
│ Developer + FajarClaw + RAG (text retrieval aktif)          │
│ └→ /build "implement reranker pipeline"                     │
│    FajarClaw: RAG finds PRD section about reranker           │
│    FajarClaw: injects Qwen3-Reranker spec as context         │
│    FajarClaw: generates implementation sesuai spec           │
│ └→ Output: Reranker + Hybrid Search + Prompt Assembly       │
│    Self-use: ✅ FajarClaw membangun dirinya sendiri!        │
└─────────────────────────────────────────────────────────────┘
              │
              ▼ Full text RAG + reranking aktif
Minggu 7-8: SELF-BUILDING
┌─────────────────────────────────────────────────────────────┐
│ Developer + FajarClaw Full RAG                              │
│ └→ /build "implement guardrails system"                     │
│    FajarClaw: RAG finds guardrails spec di PRD §10.11       │
│    FajarClaw: finds existing code patterns                   │
│    FajarClaw: generates + self-checks consistency            │
│ └→ Output: Guardrails + Cache + Query Transform             │
│    Self-use: ✅✅ FajarClaw optimizes itself                │
└─────────────────────────────────────────────────────────────┘
              │
              ▼ Intelligence layer complete
Minggu 9-10: DOGFOODING
┌─────────────────────────────────────────────────────────────┐
│ FajarClaw refactors + optimizes FajarClaw                   │
│ └→ /build "optimize retrieval latency to <300ms"            │
│ └→ /build "add visual RAG with Qwen3-VL"                   │
│ └→ /build "create eval framework with RAGAS"                │
│ └→ FajarClaw v4.0 Release ✅                               │
│                                                             │
│ THEN: /index --full → 67 WF-01 docs → ITAMS development    │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Capability Growth Curve

```
Capability
100% ┤                                              ╭──── v4.0 Release
 90% ┤                                        ╭─────╯
 80% ┤                                  ╭─────╯
 70% ┤                            ╭─────╯     Visual RAG
 60% ┤                      ╭─────╯           + Dogfooding
 50% ┤                ╭─────╯  Intelligence
 40% ┤          ╭─────╯        Layer
 30% ┤    ╭─────╯  Precision
 20% ┤╭───╯       (Reranker)
 10% ┤│  Text RAG
  0% ┼│  Core              
     └┼───┼───┼───┼───┼───┼───┼───┼───┼───┼─── Minggu
      0   1   2   3   4   5   6   7   8   9  10
          │       │       │       │       │
          MVP     RAG     Precision Intel  Release
```

---

## 3. Master Timeline

```
PHASE A: BUILD THE FACTORY (10 Minggu)
══════════════════════════════════════

 Minggu 1    Minggu 2    Minggu 3    Minggu 4    Minggu 5
 ────────    ────────    ────────    ────────    ────────
 ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
 │ A1:    │ │ A1:    │ │ A2:    │ │ A2:    │ │ A3:    │
 │ Setup  │→│ Skills │→│ Milvus │→│ Index  │→│Reranker│
 │OpenClaw│ │ MVP    │ │ BGE-M3 │ │+ RAG   │ │Hybrid  │
 │+CC+AG  │ │+Test   │ │Ingest  │ │Router  │ │Prompt  │
 └────────┘ └────────┘ └────────┘ └────────┘ └────────┘
                            │           │          │
                            ▼           ▼          ▼
                        FajarClaw   FajarClaw   FajarClaw
                        mulai      bisa "baca"  makin
                        bantu      docs         akurat

 Minggu 6    Minggu 7    Minggu 8    Minggu 9    Minggu 10
 ────────    ────────    ────────    ────────    ──────────
 ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌──────────┐
 │ A3:    │ │ A4:    │ │ A4:    │ │ A5:    │ │ A6:      │
 │Prompt  │→│ Query  │→│Guard-  │→│Qwen3-VL│→│Dogfood + │
 │Assembly│ │Transfrm│ │rails   │ │Visual  │ │Eval +    │
 │+Eval   │ │+Cache  │ │+Memory │ │RAG     │ │ Release  │
 └────────┘ └────────┘ └────────┘ └────────┘ └──────────┘
     │           │          │          │           │
     ▼           ▼          ▼          ▼           ▼
 FajarClaw   FajarClaw  FajarClaw  FajarClaw   FajarClaw
 builds      builds     checks    "sees" UI    v4.0 ✅
 itself      smarter    own code

PHASE B: FACTORY PRODUCES (Minggu 11+)
══════════════════════════════════════
 Minggu 11+
 ──────────
 ┌───────────────────────────────────┐
 │ /index --full → 67 WF-01 docs    │
 │ /sprint 1 plan → ITAMS begins    │
 │ FajarClaw builds ITAMS TaxPrime  │
 │ 2-3× speed, compound knowledge   │
 └───────────────────────────────────┘
```

### Timeline Summary

| Phase | Minggu | Fokus | Self-Build Level | Exit Criteria |
|:-----:|:------:|-------|:----------------:|---------------|
| A1 | 1-2 | MVP Foundation | ❌ Manual build | `/build` routes + engines execute |
| A2 | 3-4 | Text RAG Core | ⚠️ Semi-assisted | RAG retrieves relevant docs |
| A3 | 5-6 | Precision & Hybrid | ✅ AI-assisted | Recall@5 ≥ 0.80, reranked |
| A4 | 7-8 | Intelligence Layer | ✅✅ Self-building | Guardrails + cache + smart query |
| A5 | 9-10 | Visual RAG + Release | ✅✅✅ Dogfooding | All 12 components, v4.0 release |
| B | 11+ | ITAMS Production | 🏭 Factory mode | Sprint 1 ITAMS via FajarClaw |

---

## 4. Phase A1 — MVP Foundation (Minggu 1-2)

### 4.1 Tujuan

> Bangun skeleton FajarClaw: 3 skills bisa menerima perintah, route ke engine yang tepat, dan mengeksekusi task sederhana.

### 4.2 Prerequisites

```
SEBELUM MULAI — pastikan sudah terinstall:
├── Node.js ≥ 22          → node --version
├── pnpm                   → pnpm --version
├── Git                    → git --version
├── Docker Desktop         → docker --version
├── Chrome/Chromium        → chrome --version
├── Python 3.11+           → python3 --version
├── CUDA Toolkit 12.x      → nvcc --version (untuk GPU nanti)
├── Anthropic API key      → export ANTHROPIC_API_KEY=sk-ant-...
└── GitHub account + SSH    → ssh -T git@github.com
```

### 4.3 Minggu 1 — Day-by-Day

#### Day 1 (Senin): Environment Setup

```
PAGI (3 jam):
├── 1. Install OpenClaw
│   └── npm install -g openclaw@latest
│   └── openclaw onboard --install-daemon
│   └── Verify: openclaw gateway --port 18789 → running
│
├── 2. Install Claude Code
│   └── curl -fsSL https://claude.ai/install.sh | bash
│   └── claude --version → verify
│   └── claude mcp list → verify MCP
│
├── 3. Setup Project Repository
│   └── mkdir fajarclaw && cd fajarclaw
│   └── git init
│   └── pnpm init
│   └── pnpm add typescript tsx vitest @types/node -D
│   └── Create tsconfig.json (strict mode)
│
└── 4. Verify Antigravity IDE
    └── Open Antigravity → Settings → AI Model → Claude Opus 4.6
    └── Test: simple prompt → responds
    └── Jika belum available: note fallback ke OpenClaw browser CDP

SIANG (3 jam):
├── 5. Create FajarClaw workspace structure
│   └── mkdir -p ~/.openclaw/workspace/skills/fajarclaw-router
│   └── mkdir -p ~/.openclaw/workspace/skills/fajarclaw-claude-code
│   └── mkdir -p ~/.openclaw/workspace/skills/fajarclaw-antigravity
│
├── 6. Deploy existing AGENTS.md + CLAUDE.md
│   └── cp AGENTS.md ~/.openclaw/workspace/
│   └── cp CLAUDE.md ~/.openclaw/workspace/
│   └── cp openclaw.json ~/.openclaw/
│
└── 7. End-of-day verification
    └── openclaw agent --message "Hello, siapa kamu?"
    └── Expected: FajarClaw persona responds (dari AGENTS.md)

✅ DAY 1 DONE: OpenClaw running, Claude Code installed, workspace ready
```

#### Day 2 (Selasa): Skill 1 — Router MVP

```
PAGI (3 jam):
├── 1. Create fajarclaw-router/SKILL.md
│   └── Skill definition: name, description, triggers
│   └── SKILL.md tells Pi Agent when to activate this skill
│
├── 2. Implement router.ts — Keyword Scoring (Phase 1)
│   └── CLAUDE_CODE_KEYWORDS array
│   └── ANTIGRAVITY_KEYWORDS array
│   └── DUAL_KEYWORDS array
│   └── scoreMessage(message) → { engine, confidence, keywords }
│   └── Basic: split message → match keywords → weighted sum
│
└── 3. Implement patterns.ts — Collaboration Patterns
    └── type CollabPattern = 'pipeline' | 'parallel' | 'verify'
    └── selectPattern(engine, taskType) → CollabPattern
    └── For MVP: always return 'pipeline' (sequential)

SIANG (3 jam):
├── 4. Implement merger.ts — Result Merging
│   └── mergeResults(ccResult?, agResult?) → UnifiedResult
│   └── For MVP: return whichever engine responded
│
├── 5. Unit tests for router
│   └── router.test.ts: test keyword scoring accuracy
│   └── Target: known prompts route correctly
│   └── pnpm vitest run
│
└── 6. Deploy + test
    └── Copy files ke ~/.openclaw/workspace/skills/fajarclaw-router/
    └── openclaw agent --message "/build push ke GitHub"
    └── Verify: routes to Claude Code (keyword: "push", "GitHub")
    └── openclaw agent --message "/build buat form login"
    └── Verify: routes to Antigravity (keyword: "form")

✅ DAY 2 DONE: Router MVP works, keyword scoring active
```

#### Day 3 (Rabu): Skill 2 — Claude Code Wrapper

```
PAGI (3 jam):
├── 1. Create fajarclaw-claude-code/SKILL.md
│   └── Skill definition: triggers on Claude Code routed tasks
│
├── 2. Implement claude-code.ts — Execution Wrapper
│   └── Option A: SDK mode (@anthropic-ai/claude-code)
│   │   └── import { ClaudeCode } from '@anthropic-ai/claude-code'
│   │   └── execute(prompt, { tools, model, maxTokens })
│   └── Option B: CLI mode (fallback)
│   │   └── execSync('claude -p "prompt" --output-format json')
│   └── Detect available mode → auto-select
│   └── Stream output to gateway
│
└── 3. Implement git-flow.ts — Git Automation
    └── commit(message, files?) → exec 'git commit'
    └── createBranch(name) → exec 'git checkout -b'
    └── getCurrentBranch() → exec 'git branch --show-current'
    └── Conventional Commits: enforced format

SIANG (3 jam):
├── 4. Implement mcp-manager.ts — MCP Basics
│   └── listServers() → claude mcp list
│   └── callTool(server, tool, args) → claude mcp call
│   └── For MVP: list only, full MCP later
│
├── 5. Unit tests
│   └── claude-code.test.ts: mock execution, verify output format
│   └── git-flow.test.ts: test commit message formatting
│
└── 6. Integration test
    └── openclaw agent --message "/build:cc create hello-world.ts"
    └── Verify: Claude Code generates file
    └── openclaw agent --message "/build:cc git commit -m 'test'"
    └── Verify: Git commit executed

✅ DAY 3 DONE: Claude Code engine operational
```

#### Day 4 (Kamis): Skill 3 — Antigravity Bridge

```
PAGI (3 jam):
├── 1. Create fajarclaw-antigravity/SKILL.md
│   └── Skill definition: triggers on Antigravity routed tasks
│
├── 2. Implement antigravity.ts — IDE Connector
│   └── detectIDE() → boolean (check if Antigravity running)
│   └── If available: connect via IDE API
│   └── If not: fallback ke OpenClaw browser CDP
│   └── executeInIDE(prompt) → send task to Antigravity
│   └── executeViaBrowser(prompt) → OpenClaw CDP fallback
│
└── 3. Implement agent-manager.ts — Multi-Agent (Basic)
    └── For MVP: single agent only
    └── spawnAgent(task) → execute one task
    └── Parallel spawn: planned for Phase A4

SIANG (3 jam):
├── 4. Implement workflow-triggers.ts — WF-01 Commands
│   └── Map /generate-* commands to prompt templates
│   └── triggerWorkflow(command, args) → formattedPrompt
│   └── For MVP: 3 workflows:
│   │   ├── /generate-component → React component prompt
│   │   ├── /generate-function → Cloud Function prompt
│   │   └── /generate-tests → Test suite prompt
│   └── Others: planned for later phases
│
├── 5. Unit + integration tests
│   └── antigravity.test.ts: mock IDE detection
│   └── workflow-triggers.test.ts: verify prompt formatting
│
└── 6. Integration test
    └── openclaw agent --message "/build:ag buat button component"
    └── Verify: routes to Antigravity (or browser fallback)
    └── openclaw agent --message "/generate-component LoginForm"
    └── Verify: workflow trigger generates prompt

✅ DAY 4 DONE: Antigravity engine operational (with fallback)
```

#### Day 5 (Jumat): End-to-End Integration + Polish

```
PAGI (3 jam):
├── 1. Full E2E Test Suite
│   └── Test 1: /build "buat REST API untuk asset CRUD"
│   │   └── Expected: routes to Claude Code ✓
│   └── Test 2: /build "buat dashboard component"
│   │   └── Expected: routes to Antigravity ✓
│   └── Test 3: /build:dual "buat full-stack fitur login"
│   │   └── Expected: both engines activate ✓
│   └── Test 4: /build:cc "git push origin main"
│   │   └── Expected: force Claude Code ✓
│   └── Test 5: /status
│   │   └── Expected: both engine status shown ✓
│
├── 2. Fix bugs from E2E testing
│   └── Likely issues: routing edge cases, fallback paths
│
└── 3. Polish AGENTS.md
    └── Add /help command documentation
    └── Add error messages in Bahasa Indonesia
    └── Add progress indicators

SIANG (3 jam):
├── 4. Setup automated testing
│   └── pnpm vitest run → all tests pass
│   └── Coverage report: target ≥ 80% untuk MVP
│
├── 5. Documentation
│   └── Update CLAUDE.md with current codebase state
│   └── Write CHANGELOG.md: v0.1.0 MVP
│
└── 6. Git: tag v0.1.0-mvp
    └── git tag -a v0.1.0-mvp -m "FajarClaw MVP: 3 skills + keyword router"
    └── git push origin main --tags

✅ MINGGU 1 DONE: FajarClaw MVP operational
```

### 4.4 Minggu 2 — Day-by-Day

#### Day 6 (Senin): Router Enhancement

```
PAGI (3 jam):
├── 1. Enhance keyword scoring
│   └── Add weighted keywords (not just presence, but position + frequency)
│   └── Add context detection: "buat ... dan ..." → DUAL mode
│   └── Add override commands: /build:cc, /build:ag, /build:dual
│
└── 2. Add confidence thresholds
    └── High (≥0.8): route directly, no confirmation
    └── Medium (0.5-0.8): route with info "Routing ke [engine]..."
    └── Low (<0.5): ask user "Task ini lebih cocok di [A] atau [B]?"

SIANG (3 jam):
├── 3. Implement parallel pattern (basic)
│   └── patterns.ts: parallel execution support
│   └── When DUAL mode: spawn CC task + AG task concurrently
│   └── Promise.allSettled([ccExecute, agExecute])
│
└── 4. Test parallel execution
    └── /build:dual "CC buat API + AG buat form"
    └── Verify: both execute, results merged
```

#### Day 7 (Selasa): Claude Code Enhancement

```
PAGI (3 jam):
├── 1. Implement streaming output
│   └── Claude Code SDK streaming → pipe to gateway
│   └── User sees real-time progress
│
└── 2. Enhance git-flow
    └── createPR(title, body, base) → full PR creation
    └── listBranches() → show active branches
    └── diff(file?) → show changes

SIANG (3 jam):
├── 3. MCP server setup (basic)
│   └── Configure GitHub MCP server
│   └── Test: list issues, create PR via MCP
│
└── 4. Tests + verify
```

#### Day 8 (Rabu): Antigravity Enhancement

```
PAGI (3 jam):
├── 1. Enhance workflow triggers
│   └── Add remaining 4 workflows:
│   │   ├── /generate-crud → Firestore CRUD prompt
│   │   ├── /generate-gworkspace → Google Workspace prompt
│   │   ├── /review-security → Security audit prompt
│   │   └── /deploy-check → Deployment checklist prompt
│   └── Each workflow reads rules from C-xx docs (if available)
│
└── 2. Browser CDP fallback improvements
    └── Screenshot capture → save to /tmp/screenshots/
    └── Basic visual verification after component generation

SIANG (3 jam):
├── 3. Multi-agent spawning (basic parallel)
│   └── spawnParallel([task1, task2]) → concurrent execution
│   └── Monitor progress per agent
│   └── Collect results → merger
│
└── 4. Tests + verify
```

#### Day 9 (Kamis): Integration Testing + Sprint Simulation

```
PAGI (4 jam):
├── 1. SPRINT SIMULATION — Simulated Sprint 1
│   └── Pretend ITAMS Sprint 1 stories:
│   │   ├── US-001: "Buat halaman login dengan Google Auth"
│   │   ├── US-002: "Buat data model untuk assets collection"
│   │   └── US-003: "Buat navigation sidebar"
│   └── /sprint 1 plan → FajarClaw creates task breakdown
│   └── /build "halaman login" → routes to AG (UI task)
│   └── /build "Firebase auth setup" → routes to CC (backend task)
│   └── /build:dual "sidebar + routing" → both engines
│   └── Evaluate: correct routing? useful output? completion?

SIANG (2 jam):
├── 2. Measure MVP baseline metrics
│   └── Routing accuracy: % correct engine assignment (target: ≥80%)
│   └── Execution success: % tasks completed without error
│   └── User intervention: % tasks needing manual correction
│
└── 3. Log lessons learned
    └── Apa yang berjalan baik?
    └── Apa yang routing salah?
    └── Apa yang output kurang bagus?
    └── → Input untuk Phase A2 improvements
```

#### Day 10 (Jumat): Phase A1 Gate + Release

```
PAGI (3 jam):
├── 1. PHASE A1 QUALITY GATE
│   └── Checklist:
│   │   ├── ☐ OpenClaw gateway running stabil?
│   │   ├── ☐ 3 skills installed + responding?
│   │   ├── ☐ Keyword routing accuracy ≥ 80%?
│   │   ├── ☐ Claude Code executes tasks?
│   │   ├── ☐ Antigravity (or fallback) executes tasks?
│   │   ├── ☐ Dual mode works (parallel)?
│   │   ├── ☐ Override commands work (/build:cc, /build:ag)?
│   │   ├── ☐ All unit tests pass?
│   │   ├── ☐ Coverage ≥ 80%?
│   │   └── ☐ Sprint simulation completed?
│   └── Decision: PASS → continue to A2 / BLOCKED → fix first
│
├── 2. Tag release
│   └── git tag -a v0.2.0-mvp-complete
│   └── Write release notes
│
└── 3. Prepare Phase A2
    └── List dependencies: Milvus, BGE-M3, pip packages
    └── Download models in background (BGE-M3 ~1.2GB)
    └── Prepare test documents (subset of 67 WF-01 docs)

✅ PHASE A1 COMPLETE: FajarClaw MVP operational, 3 skills, keyword routing
```

---

## 5. Phase A2 — Text RAG Core (Minggu 3-4)

### 5.1 Tujuan

> Menambahkan Skill 4 (RAG Engine) — Milvus + BGE-M3 + ingestion + chunking + basic retrieval. FajarClaw mulai "membaca" dokumen.

### 5.2 Minggu 3 — Infrastructure + Indexing

#### Day 11 (Senin): Milvus + BGE-M3 Setup

```
├── 1. Setup Milvus
│   ├── Option A (recommended): Milvus Lite (embedded, no Docker)
│   │   └── pip install pymilvus[model] --break-system-packages
│   │   └── Verify: python3 -c "from pymilvus import MilvusClient; print('OK')"
│   ├── Option B: Docker Standalone
│   │   └── docker-compose up -d milvus-standalone
│   │   └── Verify: curl http://localhost:19530/v1/vector/collections
│   └── Create 4 text collections: documents, codebase, routes, decisions
│
├── 2. Setup BGE-M3
│   ├── Option A: FlagEmbedding (Python, recommended)
│   │   └── pip install FlagEmbedding --break-system-packages
│   │   └── Verify: embed "hello" → 1024-dim vector
│   ├── Option B: Ollama
│   │   └── ollama pull bge-m3
│   │   └── Verify: ollama run bge-m3 "hello"
│   └── Create embedder.ts: Node ↔ Python bridge (child_process or HTTP)
│
└── 3. Create fajarclaw-rag/ skill structure
    └── SKILL.md, embedder.ts, milvus-client.ts
    └── Deploy ke ~/.openclaw/workspace/skills/fajarclaw-rag/
```

#### Day 12 (Selasa): Smart Chunking Engine

```
├── 1. Implement chunker.ts — Markdown Chunking
│   └── Input: .md file path
│   └── Split by ## headings (section boundaries)
│   └── Contextual header: prepend parent heading chain
│   │   "WF-01 > Stage 2 > Sprint Cycle > BUILD Phase"
│   └── Overlap: 50 tokens between chunks
│   └── Max: 512 tokens per chunk
│   └── Output: { text, metadata: { doc_id, section, heading_path } }[]
│
├── 2. Implement chunker.ts — Code Chunking
│   └── Install tree-sitter: pnpm add tree-sitter tree-sitter-typescript
│   └── Parse .ts/.tsx → AST
│   └── Split by: function declaration, class, component, interface
│   └── Preserve: signature + JSDoc + imports
│   └── Output: { text, metadata: { file_path, export_name, type } }[]
│
└── 3. Test chunking on sample documents
    └── Chunk FC-PRD-01 (this PRD) → verify sections correct
    └── Chunk a .ts file → verify function-level splits
    └── Log: chunk count, avg token length, metadata completeness
```

#### Day 13 (Rabu): Ingestion Pipeline

```
├── 1. Implement indexer.ts — Document Ingestion
│   └── indexDocuments(folderPath) → scan .md files → chunk → embed → store
│   └── indexCodebase(folderPath) → scan .ts/.tsx → chunk → embed → store
│   └── Incremental: hash file → compare → only re-embed changed
│   └── Progress: log each file indexed
│
├── 2. Implement file watcher (chokidar)
│   └── Watch project folder for .md and .ts changes
│   └── On change: re-index affected file only
│   └── On delete: remove vectors for that file
│
├── 3. Index FajarClaw's own documents (dogfooding prep!)
│   └── /index FC-PRD-01.md → documents collection
│   └── /index 00_IMPLEMENTATION_BLUEPRINT.md → documents collection
│   └── /index FajarClaw-RAG-FullAudit.md → documents collection
│   └── /index fajarclaw-rag/*.ts → codebase collection
│
└── 4. Verify: Milvus has data
    └── Query collection stats: document count, vector count
    └── Expected: ~100-200 document chunks, ~50+ code chunks
```

#### Day 14 (Kamis): Basic Retrieval

```
├── 1. Implement retriever.ts — Basic Search
│   └── search(query, collection, topK=10) → RetrievedChunk[]
│   └── Cosine similarity via Milvus
│   └── Return: { text, score, metadata }
│
├── 2. Test retrieval quality
│   └── Query: "form registrasi aset" → should find PRD form specs
│   └── Query: "reranker pipeline" → should find RAG audit section
│   └── Query: "BGE-M3 embedding" → should find embedding comparison
│   └── Log: top 5 results per query, relevance scores
│
└── 3. Connect RAG to Router
    └── Router: before dispatching, call retriever
    └── Inject retrieved chunks into engine prompt
    └── Test: /build "implement chunking" → RAG finds chunker spec!
```

#### Day 15 (Jumat): Integration + Milestone

```
├── 1. Full integration test
│   └── /build "implement embedder untuk BGE-M3"
│   │   └── RAG retrieves: PRD §10.4 (embedding spec)
│   │   └── RAG retrieves: embedder.ts (existing code!)
│   │   └── Router: routes to Claude Code
│   │   └── CC: generates code WITH context from RAG
│   └── Compare: output WITH RAG vs WITHOUT RAG
│   └── Expected: significantly better with RAG
│
├── 2. /index and /search commands
│   └── /index --full → re-index everything
│   └── /search "form registrasi" → show top 5 results
│
└── 3. Metrics
    └── Indexing speed: docs/second
    └── Retrieval latency: query → results (ms)
    └── Basic recall: % relevant docs in top 5
```

### 5.3 Minggu 4 — RAG Integration + Evaluation Gate

#### Day 16-17: Deep RAG Integration

```
├── 1. RAG-Enhanced Routing (Semantic Layer)
│   └── Router now uses BOTH keyword + RAG similarity
│   └── Query routing_rules collection for pattern matching
│   └── Seed routing_rules with 50+ example patterns:
│   │   ├── "buat API endpoint" → claude-code (0.95)
│   │   ├── "buat form component" → antigravity (0.92)
│   │   ├── "deploy ke staging" → claude-code (0.98)
│   │   ├── "screenshot halaman" → antigravity (0.96)
│   │   └── ... (50+ patterns)
│   └── Routing accuracy: target ≥ 90% (up from 80%)
│
├── 2. Context-Aware Task Execution
│   └── Every /build command now includes:
│   │   ├── Top 5 relevant doc chunks
│   │   ├── Top 3 relevant code chunks
│   │   └── Existing code awareness ("AssetForm.tsx SUDAH ADA → extend")
│   └── Test with complex multi-doc queries
│
└── 3. /sprint command enhancement
    └── /sprint 1 plan → RAG auto-retrieves:
    │   ├── A-04 (Sprint Backlog) sections
    │   ├── A-03 (PRD) acceptance criteria
    │   └── Relevant B-xx docs per story
    └── Output: task breakdown with doc references
```

#### Day 18-19: Testing + Evaluation Gate

```
├── 1. Comprehensive RAG testing
│   └── Create eval set: 30 queries with expected results
│   └── Run all queries → measure Recall@5
│   └── Target: Recall@5 ≥ 0.70 (basic, akan naik di Phase A3)
│
├── 2. Sprint simulation with RAG
│   └── Repeat Sprint 1 simulation from Phase A1
│   └── Compare: quality WITH RAG vs WITHOUT RAG (Phase A1 baseline)
│   └── Expected: better doc references, less hallucination
│
└── 3. ⭐ EVALUATION GATE: OPSI B vs OPSI C
    └── Skills API cukup untuk RAG integration? → Expected: Yes
    └── Tool streaming OK untuk context injection? → Expected: Yes
    └── Session model support shared state? → Expected: Yes
    └── Decision: CONTINUE Opsi B or ESCALATE to Opsi C
```

#### Day 20 (Jumat): Phase A2 Gate

```
PHASE A2 QUALITY GATE:
├── ☐ Milvus running + 4 collections populated?
├── ☐ BGE-M3 embedding working (CPU)?
├── ☐ Smart chunking: markdown section-aware + code AST-aware?
├── ☐ Ingestion pipeline: auto-index on file change?
├── ☐ Retrieval: query → relevant results (Recall@5 ≥ 0.70)?
├── ☐ RAG integrated into router (context injection)?
├── ☐ /index and /search commands working?
├── ☐ Opsi B Evaluation Gate: PASS?
├── ☐ FajarClaw mulai membantu membangun dirinya sendiri?
└── ☐ All tests pass, coverage maintained?

Tag: git tag -a v0.3.0-rag-core

✅ PHASE A2 COMPLETE: FajarClaw can "read" documents and code
```

---

## 6. Phase A3 — Precision & Hybrid (Minggu 5-6)

### 6.1 Tujuan

> Tingkatkan retrieval precision dengan reranker + hybrid search + optimized prompts. FajarClaw mulai membangun dirinya sendiri.

### 6.2 Minggu 5

#### Day 21-22: Qwen3-Reranker + Hybrid Search

```
├── 1. Setup Qwen3-Reranker-0.6B
│   └── huggingface-cli download Qwen/Qwen3-Reranker-0.6B
│   └── Implement reranker.ts: Python inference server (Flask/FastAPI)
│   └── Node.js client: sendForReranking(query, candidates[]) → ranked[]
│   └── Test: cross-encoder scores more accurate than bi-encoder
│
├── 2. Implement Hybrid Retrieval
│   └── retriever.ts: dense search (BGE-M3 dense vectors)
│   └── retriever.ts: sparse search (BGE-M3 sparse vectors)
│   └── Reciprocal Rank Fusion (RRF): combine scores
│   │   score(doc) = Σ 1/(k + rank_i), k=60
│   └── Pipeline: hybrid → top 20 → reranker → top 5
│
└── 3. A/B test: basic retrieval vs hybrid+reranker
    └── Same 30 eval queries
    └── Expected: +15-30% Recall@5 improvement
    └── Target: Recall@5 ≥ 0.80
```

#### Day 23-25: Prompt Assembly + Self-Building Test

```
├── 1. Implement prompt-builder.ts
│   └── Dynamic template: assemble retrieved context + rules + user query
│   └── Include: ranked results with source attribution
│   └── Include: code awareness warnings ("file X already exists")
│   └── Include: sprint context (current sprint, phase, story)
│
├── 2. ⭐ SELF-BUILDING TEST
│   └── Use FajarClaw to build its own prompt-builder:
│   │   /build "implement prompt assembly engine sesuai PRD §10.9"
│   │   FajarClaw:
│   │   ├── RAG retrieves PRD section 10.9 (prompt assembly spec)
│   │   ├── RAG retrieves existing prompt-builder.ts (if partial)
│   │   ├── Reranker selects most relevant chunks
│   │   ├── Router sends to Claude Code
│   │   └── CC generates implementation WITH spec context
│   └── Evaluate: did FajarClaw correctly implement its own spec?
│   └── This is the first real "self-building" moment!
│
└── 3. Baseline evaluation
    └── Run RAGAS eval on 30 queries → Recall@5, NDCG@5, MRR
    └── Record as Phase A3 baseline
    └── Compare with Phase A2 baseline
```

### 6.3 Minggu 6 — Polish + Gate

```
Day 26-28:
├── Iterate on prompt template based on output quality
├── Fine-tune chunk sizes (experiment: 256 vs 512 vs 1024 tokens)
├── Optimize embedding batch size for throughput
├── Add /eval command: run evaluation set on demand
└── More self-building: use FajarClaw to write its own tests

Day 29-30: Phase A3 Gate
├── ☐ Qwen3-Reranker-0.6B operational (CPU)?
├── ☐ Hybrid retrieval (dense + sparse + RRF) working?
├── ☐ Recall@5 ≥ 0.80?
├── ☐ Prompt assembly: dynamic, context-rich prompts?
├── ☐ Self-building test: FajarClaw built at least 1 component?
├── ☐ /eval command working?
└── ☐ All tests pass?

Tag: git tag -a v0.4.0-precision

✅ PHASE A3 COMPLETE: FajarClaw retrieval is precise, self-building begins
```

---

## 7. Phase A4 — Intelligence Layer (Minggu 7-8)

### 7.1 Tujuan

> Tambahkan query transformation, guardrails, caching, sprint memory. FajarClaw menjadi "intelligent" — bisa optimize query, check output quality, dan mengingat keputusan.

### 7.2 Minggu 7 — Intelligence Components

```
Day 31-32: Query Transformation
├── Implement query-transform.ts:
│   ├── expandQuery(q) → add synonyms, English equivalent
│   ├── hydeTransform(q) → Claude generates hypothetical doc → embed that
│   ├── decomposeQuery(q) → split complex query → multiple sub-queries
│   └── injectMetadataFilters(q, context) → add collection/type filters
├── ⭐ Build this using FajarClaw itself!
│   └── /build "implement query transformation sesuai PRD §10.6"
└── Test: ambiguous queries now return better results

Day 33-34: Caching System
├── Implement cache.ts:
│   ├── L1: embedding cache (SHA256 → vector, LRU 10k entries)
│   ├── L2: retrieval cache (query hash → results, TTL 5min)
│   ├── L3: rerank cache (query+candidates → ranked, TTL 5min)
│   └── Invalidation: on git commit, on /index, on sprint boundary
├── Measure: latency reduction from caching
└── Test: second identical query → instant results

Day 35: Sprint Memory
├── Create decisions collection in Milvus
├── /sprint [n] retro → save decisions/learnings as vectors
├── Test: ask "apa keputusan sprint 1?" → retrieve stored decisions
└── This enables FajarClaw to "remember" across sprints
```

### 7.3 Minggu 8 — Guardrails + Gate

```
Day 36-37: Guardrails System
├── Implement guardrails.ts:
│   ├── checkConsistency(output, retrievedDocs) → warnings
│   ├── checkCodeStandard(code) → TypeScript strict, Zod, etc.
│   ├── checkDuplication(code) → embed → search codebase → similarity
│   ├── checkSecurity(code) → no secrets, RBAC present
│   └── checkTraceability(code) → @ref comments present
├── ⭐ Self-check: run guardrails on FajarClaw's own code
│   └── /build "run guardrails on fajarclaw-rag/*.ts"
│   └── Fix any issues found
└── Integrate: every /build output goes through guardrails

Day 38-39: Integration + Self-Improvement
├── Full pipeline test: query → transform → hybrid → rerank → prompt → generate → guardrails
├── ⭐ Use FajarClaw to optimize FajarClaw:
│   └── /build "optimize retrieval latency — current p95 is [X]ms, target <500ms"
│   └── FajarClaw: RAG finds performance specs, caching docs
│   └── FajarClaw: suggests optimizations based on bottleneck analysis
├── Document: all self-building sessions, what worked, what didn't
└── Update CLAUDE.md with full codebase context

Day 40: Phase A4 Gate
├── ☐ Query transformation (expand, HyDE, decompose) working?
├── ☐ Caching: measurable latency reduction?
├── ☐ Sprint memory: decisions collection populated?
├── ☐ Guardrails: catching real issues in generated code?
├── ☐ Full pipeline: e2e latency < 500ms for retrieval?
├── ☐ Self-building: FajarClaw built multiple components?
├── ☐ Guardrails self-check on FajarClaw's own code: PASS?
└── ☐ All 8 text RAG components operational?

Tag: git tag -a v0.5.0-intelligence

✅ PHASE A4 COMPLETE: FajarClaw is intelligent — query, cache, guard, remember
```

---

## 8. Phase A5 — Visual RAG (Minggu 9-10)

### 8.1 Tujuan

> Menambahkan visual awareness — Qwen3-VL-Embedding + Qwen3-VL-Reranker. FajarClaw bisa "melihat" UI screenshot dan design mockup.

### 8.2 Minggu 9 — Visual Models + Collections

```
Day 41-42: Qwen3-VL Models Setup
├── Download Qwen3-VL-Embedding-2B (~4.5GB)
│   └── huggingface-cli download Qwen/Qwen3-VL-Embedding-2B
│   └── Test: embed image + text → 2048-dim vector
│   └── GPU allocation: ~4.5GB VRAM
│
├── Download Qwen3-VL-Reranker-2B (~4.5GB)
│   └── huggingface-cli download Qwen/Qwen3-VL-Reranker-2B
│   └── Test: cross-modal reranking (text query → image relevance)
│   └── GPU allocation: ~4.5GB VRAM (on-demand, share with embedding)
│
└── Create 3 visual collections in Milvus:
    ├── visual: UI screenshots (2048 dim)
    ├── mockups: design mockups (2048 dim)
    └── vistests: visual regression baselines (2048 dim)

Day 43-44: Visual Ingestion + Search
├── Extend indexer.ts:
│   └── indexScreenshots(folder) → scan images → Qwen3-VL embed → Milvus
│   └── Auto-capture: after /build:ag → screenshot result → index
│   └── Metadata: { page, component, sprint, viewport, timestamp }
│
├── Extend retriever.ts:
│   └── searchVisual(query, collection) → image results
│   └── Cross-modal: text query → image results (Qwen3-VL)
│
├── Extend reranker.ts:
│   └── rerankVisual(query, imageResults) → Qwen3-VL-Reranker
│
└── Test cases:
    └── Query: "login form design" → find screenshots of login pages
    └── Query: "dashboard layout" → find dashboard screenshots
    └── Upload mockup image → find similar existing components

Day 45: Visual-Code Bridge
├── Screenshot-to-code mapping:
│   └── Each screenshot linked to source code that generated it
│   └── Query: upload screenshot → find code that produces similar UI
│   └── This enables: "buat seperti halaman ini" → find existing code
│
└── Visual regression baseline:
    └── After every /build:ag → capture screenshot → index
    └── /visual-diff → compare current vs previous sprint
    └── Alert: "component X has visually changed"
```

### 8.3 Minggu 10 — Dogfooding + Release

```
Day 46-47: Full System Integration
├── All 12 RAG components integrated end-to-end
├── Dual embedding routing:
│   └── Text query → BGE-M3 path (90% of queries)
│   └── Visual query / has image → Qwen3-VL path (10%)
│   └── Mixed query → both paths + merge results
│
├── Complete eval set: 50 queries (40 text + 10 visual)
├── Run RAGAS evaluation → record all metrics
└── Target: Recall@5 ≥ 0.85, hallucination < 5%

Day 48: ⭐⭐⭐ DOGFOODING DAY
├── Use FajarClaw to refactor FajarClaw:
│   └── /build "refactor retriever.ts — split hybrid and visual search"
│   └── /build "add error handling to all async functions in fajarclaw-rag/"
│   └── /build "generate comprehensive test suite for guardrails.ts"
│   └── /build "optimize Milvus index configuration for <300ms search"
│
├── Guardrails self-check:
│   └── Run guardrails on entire FajarClaw codebase
│   └── Fix all Critical + High findings
│   └── Verify: @ref comments, TypeScript strict, no duplication
│
└── Record: complete dogfooding report
    └── What FajarClaw did well
    └── What still needed manual intervention
    └── What to improve in v4.1

Day 49: Release Preparation
├── Final test: all 12 components operational
├── Performance: retrieval p95 < 500ms
├── Documentation:
│   └── Update FC-PRD-01 with actual metrics
│   └── Update CLAUDE.md with final codebase
│   └── Write release notes v4.0
│   └── Create demo video / walkthrough
├── Package: zip all skills + configs
└── Tag: git tag -a v4.0.0 -m "FajarClaw v4.0: Dual-Engine + 12-Component RAG"

Day 50: Phase A5 Gate (FINAL) + Phase B Prep
├── FINAL QUALITY GATE:
│   ├── ☐ All 4 skills operational (router, CC, AG, RAG)?
│   ├── ☐ All 12 RAG components functional?
│   ├── ☐ Dual embedding: BGE-M3 (text) + Qwen3-VL (visual)?
│   ├── ☐ Reranking: both text and visual reranker?
│   ├── ☐ Recall@5 ≥ 0.85?
│   ├── ☐ Hallucination rate < 5%?
│   ├── ☐ Retrieval latency p95 < 500ms?
│   ├── ☐ Guardrails: all checks active?
│   ├── ☐ Dogfooding: FajarClaw successfully built/refactored itself?
│   ├── ☐ All tests pass, coverage ≥ 80%?
│   └── ☐ Documentation complete?
│
├── 🎉 FAJARCLAW v4.0 RELEASE
│
└── Prepare Phase B:
    └── /index --full → index 67 WF-01 ITAMS docs
    └── /index → index ITAMS codebase (if any existing)
    └── /sprint 1 plan → FajarClaw plans ITAMS Sprint 1
    └── ITAMS development begins! 🏭

✅ PHASE A COMPLETE: FACTORY IS BUILT
```

---

## 9. Phase A6 — Dogfooding & Release (Minggu 10)

*Sudah terintegrasi di Phase A5 akhir. Minggu 10 = final integration + dogfooding + release.*

---

## 10. Phase B — Factory Produces Products

### 10.1 ITAMS TaxPrime (First Product)

```
TRANSITION: FajarClaw v4.0 → ITAMS Production

Step 1: INDEX PROJECT KNOWLEDGE
├── /index /path/to/wf01-docs/ → 67+ docs → ~2000 chunks indexed
├── /index /path/to/itams-code/ → existing code (if any) indexed
├── Verify: /search "asset registration" → finds B-02, B-07, D-09
└── Verify: /search "security rules" → finds B-05, B-06, E-06

Step 2: SPRINT 1 PLANNING
├── /sprint 1 plan
│   FajarClaw:
│   ├── RAG retrieves A-04 (Sprint Backlog) → Sprint 1 stories
│   ├── RAG retrieves A-03 (PRD) → acceptance criteria
│   ├── Auto-identifies relevant B-xx docs per story
│   ├── Creates task breakdown with doc references
│   └── Assigns engine per task (CC/AG/DUAL)
│
└── Output: Sprint 1 plan with RAG-enhanced context

Step 3: EXECUTION
├── Per task:
│   /build "implement asset registration form"
│   FajarClaw:
│   ├── RAG: B-07 form spec + B-02 data model + D-09 templates
│   ├── RAG: existing code check → no AssetForm.tsx yet → create new
│   ├── Router: UI task → Antigravity
│   ├── AG: generates component with spec context
│   ├── Guardrails: TypeScript strict ✓, @ref comments ✓
│   └── Output: AssetForm.tsx + AssetForm.test.tsx
│
├── /build "implement asset CRUD API"
│   FajarClaw:
│   ├── RAG: B-03 API spec + B-02 data model + B-05 security
│   ├── Router: backend task → Claude Code
│   ├── CC: generates Cloud Function + Firestore rules
│   ├── Guardrails: Zod validation ✓, RBAC check ✓, audit trail ✓
│   └── CC: git commit -m "feat(assets): add CRUD API"
│
└── Sprint velocity: estimated 2-3× faster than manual

Step 4: QUALITY GATE
├── /gate
│   FajarClaw:
│   ├── RAG: retrieves QG-01 Phase 1 checklist
│   ├── CC: runs automated checks (build, lint, test, coverage)
│   ├── AG: runs Lighthouse, visual checks
│   ├── Compiles gate report: PASS / CONDITIONAL / BLOCKED
│   └── Lists gaps with specific doc references
│
└── Iterate: fix gaps → re-run /gate → PASS → next sprint
```

### 10.2 Compound Intelligence Over Time

```
SPRINT 1 → FajarClaw learns:
├── ITAMS-specific patterns (Firebase, Firestore, Google Workspace)
├── Team coding style (naming, structure, error handling)
├── Sprint decisions: "use zxing-js for QR scanner"
└── RAG: decisions collection grows

SPRINT 3 → FajarClaw knows:
├── All Sprint 1-2 patterns + decisions
├── Which approaches worked, which didn't
├── Common bug patterns → proactive guardrails
└── Routing accuracy: 95%+ (learned from feedback)

SPRINT 8 → FajarClaw expert:
├── Deep knowledge of entire ITAMS codebase
├── Can predict dependencies before asked
├── Suggests optimizations based on past sprints
├── Near-zero hallucination (massive context)
└── Sprint velocity: 3-4× manual
```

### 10.3 Next Products (After ITAMS)

```
PROJECT 2: (contoh — any new project)
├── /new-project "Project B"
├── /index /path/to/project-b-docs/
├── FajarClaw: carries over general patterns from ITAMS
│   ├── Firebase patterns → reusable
│   ├── Testing patterns → reusable
│   ├── Security patterns → reusable
│   └── Sprint management → reusable
├── Only project-specific docs are new
└── Faster startup: FajarClaw already knows "how to build apps"
```

---

## 11. Quality Gates & Exit Criteria

### 11.1 Gate Summary

| Gate | Minggu | Key Criteria | Decision |
|:----:|:------:|-------------|:--------:|
| **QG-A1** | 2 | 3 skills + keyword routing ≥ 80% accuracy | Pass → A2 |
| **QG-A2** | 4 | RAG retrieval + Recall@5 ≥ 0.70 + **Opsi B Evaluation** | Pass → A3 |
| **QG-A3** | 6 | Reranker + hybrid + Recall@5 ≥ 0.80 + self-building test | Pass → A4 |
| **QG-A4** | 8 | Intelligence layer + guardrails + e2e latency < 500ms | Pass → A5 |
| **QG-A5** | 10 | All 12 components + Recall@5 ≥ 0.85 + dogfooding + release | ✅ v4.0 |

### 11.2 Gate Process

```
SETIAP GATE:
├── 1. Run automated test suite → all pass?
├── 2. Run eval set → metrics meet targets?
├── 3. Check: all tasks in phase completed?
├── 4. Check: no Critical bugs outstanding?
├── 5. Review: lessons learned from phase
├── 6. Decision: PASS / CONDITIONAL (fix then pass) / BLOCKED (stay in phase)
├── 7. Git tag release version
└── 8. Prepare next phase dependencies
```

### 11.3 BLOCKED Resolution

```
JIKA GATE BLOCKED:
├── Identify: apa yang BLOCKED?
├── Classify: technical issue / scope issue / dependency issue
├── If technical: allocate 2-3 extra days to fix
├── If scope: de-scope non-critical items, carry to next phase
├── If dependency: find alternative or workaround
├── Re-run gate after resolution
└── Max 1 week delay per gate before escalation
```

---

## 12. Dependency Map & Critical Path

### 12.1 Component Dependencies

```
DEPENDENCY GRAPH:

OpenClaw Gateway (external, no build needed)
    │
    ├── Skill 1: Router ──────────────┐
    │   ├── Keyword scoring (A1)       │
    │   └── Semantic scoring (A2+) ────┼── requires BGE-M3 + Milvus
    │                                  │
    ├── Skill 2: Claude Code (A1) ─────┤ no RAG dependency
    │                                  │
    ├── Skill 3: Antigravity (A1) ─────┤ no RAG dependency
    │                                  │
    └── Skill 4: RAG Engine            │
        ├── Milvus (A2) ──────────────┤
        ├── BGE-M3 (A2) ──────────────┤
        ├── Chunker (A2) ─────────────┤
        ├── Indexer (A2) ──── requires Chunker + BGE-M3 + Milvus
        ├── Retriever (A2) ── requires BGE-M3 + Milvus
        ├── Reranker (A3) ─── requires Qwen3-Reranker + Retriever
        ├── Prompt Builder (A3) ── requires Retriever (or Reranker)
        ├── Query Transform (A4) ── requires Retriever
        ├── Guardrails (A4) ── requires Prompt Builder + Retriever
        ├── Cache (A4) ────── requires all components above
        ├── Qwen3-VL-Emb (A5) ── requires GPU + Milvus visual collections
        ├── Qwen3-VL-Rerank (A5) ── requires Qwen3-VL-Emb + Reranker
        └── Evaluator (A5) ── requires all components above
```

### 12.2 Critical Path

```
CRITICAL PATH (longest dependency chain):

OpenClaw → Router (A1) → BGE-M3 + Milvus (A2) → Retriever (A2)
→ Reranker (A3) → Prompt Builder (A3) → Guardrails (A4)
→ Qwen3-VL (A5) → Evaluator (A5) → Release

Total: 10 minggu (no slack on critical path)

PARALLEL TRACKS (can run concurrently):
├── Track A (Skills): Router + CC + AG → independent, can be built in parallel
├── Track B (Text RAG): Milvus + BGE-M3 + Chunk + Index + Retrieve
├── Track C (Precision): Reranker + Hybrid + Prompt
├── Track D (Intelligence): Query Transform + Cache + Guardrails + Memory
└── Track E (Visual): Qwen3-VL + Visual collections + Visual search
```

### 12.3 Risk Mitigation: Parallel Work

```
Saat menunggu dependency:
├── Phase A2 menunggu BGE-M3 download:
│   └── Paralel: seed routing_rules collection, create test queries
├── Phase A3 menunggu Qwen3-Reranker download:
│   └── Paralel: improve chunking quality, add more eval queries
├── Phase A5 menunggu Qwen3-VL download:
│   └── Paralel: optimize text RAG pipeline, fix bugs
└── Model downloads: schedule overnight, setiap akhir phase
```

---

## 13. Daily Standup Template

### Untuk Self-Use (Solo Developer)

```markdown
## Daily Log — [Tanggal]

### Apa yang selesai kemarin?
- [task completed]
- [task completed]

### Apa yang dikerjakan hari ini?
- [planned task]
- [planned task]

### Blockers?
- [blocker / none]

### FajarClaw Self-Build Progress
- Capability level: [X]% (refer curve §2.2)
- Self-build test: [what FajarClaw built today]
- RAG quality: Recall@5 = [current]

### Metrics
- Tests: [pass/fail count]
- Coverage: [%]
- Retrieval latency: [ms]
```

---

## 14. Troubleshooting Guide

### 14.1 Common Issues

| Issue | Kemungkinan Penyebab | Solusi |
|-------|---------------------|--------|
| OpenClaw gateway won't start | Port 18789 occupied | `lsof -i :18789` → kill process |
| Claude Code "model not available" | API key invalid/expired | Check ANTHROPIC_API_KEY |
| BGE-M3 out of memory | CPU RAM insufficient | Reduce batch size, or use Ollama |
| Milvus connection refused | Docker not running / Lite not initialized | Start Docker / check Milvus URI |
| Qwen3-VL CUDA error | VRAM exceeded | Load on-demand, not always-on |
| Routing selalu ke satu engine | Keyword weights imbalanced | Review scoring weights, add patterns |
| RAG returns irrelevant results | Bad chunking / wrong collection | Review chunk quality, check metadata |
| Reranker timeout | Model not loaded | Pre-load at startup, check GPU |
| Guardrails false positive | Too strict rules | Adjust thresholds, add exceptions |
| /index hangs | Large file / memory issue | Index in batches, increase timeout |

### 14.2 Performance Troubleshooting

```
JIKA retrieval latency > 500ms:
├── Check: embedding time → if slow: batch smaller, cache more
├── Check: Milvus search time → if slow: HNSW params, index rebuild
├── Check: reranker time → if slow: reduce candidates (20→10)
├── Check: network overhead → if slow: Milvus Lite vs Docker
└── Check: cache hit rate → if low: extend TTL, pre-warm cache

JIKA VRAM exceeded:
├── Check: nvidia-smi → which models loaded?
├── Solution: Qwen3-VL-Reranker → on-demand (unload after use)
├── Solution: reduce Qwen3-VL batch size
└── Solution: quantize models (int8)
```

---

## 15. Dokumen Referensi

### 15.1 FajarClaw Documents (sudah dibuat)

| Dokumen | Isi | Lokasi |
|---------|-----|--------|
| **FC-PRD-01** | PRD lengkap v4.0, 18 sections, 1500 baris | FajarClaw-v4-PRD-Complete.md |
| **FC-00** | Implementation Blueprint, file structure, Opsi B | 00_IMPLEMENTATION_BLUEPRINT.md |
| **FC-BP-01** | Dokumen ini — Master Build Plan | FajarClaw-MasterBuildPlan.md |
| **FC-RAG-01** | RAG Enhancement Analysis (Milvus + BGE-M3) | FajarClaw-RAG-Analysis.md |
| **FC-RAG-02** | Embedding Comparison (BGE-M3 vs Qwen3-VL) | FajarClaw-Embedding-Comparison.md |
| **FC-RAG-03** | Full RAG Pipeline Audit (12 components) | FajarClaw-RAG-FullAudit.md |
| **FC-IMPL** | Skills implementation package (ZIP) | fajarclaw-skills.zip |

### 15.2 WF-01 ITAMS Documents (Phase B reference)

| Kategori | Dokumen | Jumlah |
|----------|---------|:------:|
| A: Planning | Charter, PRD, Backlog, Risk, Comm, Change, DoD | 8 |
| B: Technical | Arch, Data Model, API, Integration, Security, UI, Perf | 10 |
| C: Antigravity | Rules, Workflows, Skills | 15 |
| D: Dev Artifacts | Boilerplate, Types, Hooks, Components, Templates | 12 |
| E: Testing | Strategy, Unit, Integration, UAT, Perf, Security | 6 |
| F: Deployment | CI/CD, Runbook, Monitoring, Backup, Incident, Cost | 7 |
| G: User Docs | Employee, Admin, Manager, SysAdmin, Dev Handover | 5 |
| QG + WF | Quality Gate, Workflow Blueprint | 2 |
| **Total** | | **67+** |

### 15.3 Quick Reference: Kapan Buka Dokumen Mana

| Situasi | Dokumen FajarClaw |
|---------|-------------------|
| "Mau mulai Phase A1" | FC-BP-01 §4 (ini) |
| "Mau setup RAG pipeline" | FC-PRD-01 §10, FC-RAG-03 |
| "Mau pilih embedding model" | FC-RAG-02 |
| "Mau cek arsitektur keseluruhan" | FC-PRD-01 §3 |
| "Mau cek hardware allocation" | FC-PRD-01 §13 |
| "Mau cek file structure" | FC-00 §3 |
| "Mau index ITAMS docs" | FC-BP-01 §10 |
| "Mau cek risk register" | FC-PRD-01 §16 |
| "Mau evaluasi RAG quality" | FC-PRD-01 §17 |

---

## Penutup

### The FajarClaw-First Manifesto

```
1. BUILD THE FACTORY, NOT THE PRODUCT.
   FajarClaw adalah mesin. ITAMS, dan setiap proyek setelahnya, adalah output mesin.

2. LET THE FACTORY BUILD ITSELF.
   Progressive self-building: setiap komponen yang selesai langsung
   dipakai untuk membangun komponen berikutnya.

3. COMPOUND, DON'T LINEAR.
   Setiap proyek menambah knowledge. Project ke-5 akan 5× lebih cepat dari ke-1.

4. MEASURE, DON'T ASSUME.
   Recall@5, NDCG, hallucination rate — setiap phase punya metrics, setiap gate punya target.

5. INVEST 10 WEEKS, SAVE 10 YEARS.
   10 minggu membangun FajarClaw = ribuan jam saved di proyek-proyek mendatang.
```

> *"Berikan aku 6 jam untuk menebang pohon, dan aku akan menggunakan*
> *4 jam pertama untuk mengasah kapak."*
>
> *— Prinsip FajarClaw-First*

---

> *FajarClaw Master Build Plan v1.0*
> *Factory-First Strategy: Bangun Mesin Dulu, Produksi Kemudian*
>
> *Project Fajar AM — 19 Februari 2026 | Confidential*
