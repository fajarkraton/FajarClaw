# FAJARCLAW v4.0 — PRODUCT REQUIREMENTS DOCUMENT

## Automatic Digital Programmer System with RAG-Enhanced Dual-Engine Architecture

| Field | Detail |
|-------|--------|
| **Kode Dokumen** | FC-PRD-01 |
| **Versi** | 4.0 |
| **Tanggal** | 19 Februari 2026 |
| **Author** | Fajar AM (Project Lead) |
| **AI Co-Architect** | Claude Opus 4.6 |
| **Status** | Draft — Ready for Development |
| **Klasifikasi** | Confidential |

---

## DAFTAR ISI

1. [Executive Summary](#1-executive-summary)
2. [Visi & Misi Produk](#2-visi--misi-produk)
3. [Arsitektur Sistem](#3-arsitektur-sistem)
4. [Platform Foundation — OpenClaw Extension Layer](#4-platform-foundation--openclaw-extension-layer)
5. [Dual-Engine Architecture](#5-dual-engine-architecture)
6. [Skill 1 — FajarClaw Router](#6-skill-1--fajarclaw-router)
7. [Skill 2 — FajarClaw Claude Code](#7-skill-2--fajarclaw-claude-code)
8. [Skill 3 — FajarClaw Antigravity](#8-skill-3--fajarclaw-antigravity)
9. [Skill 4 — FajarClaw RAG Engine](#9-skill-4--fajarclaw-rag-engine)
10. [RAG Pipeline — 12 Komponen](#10-rag-pipeline--12-komponen)
11. [Model Stack & Embedding Strategy](#11-model-stack--embedding-strategy)
12. [AGENTS.md — Persona & Identity](#12-agentsmd--persona--identity)
13. [Hardware Requirements & Resource Allocation](#13-hardware-requirements--resource-allocation)
14. [WF-01 Integration — Dual-Engine Workflow Mapping](#14-wf-01-integration--dual-engine-workflow-mapping)
15. [Implementation Roadmap](#15-implementation-roadmap)
16. [Risk Register & Mitigasi](#16-risk-register--mitigasi)
17. [Evaluation & Success Metrics](#17-evaluation--success-metrics)
18. [Appendix — Technical Reference](#18-appendix--technical-reference)

---

## 1. Executive Summary

### 1.1 Apa itu FajarClaw?

FajarClaw adalah **Automatic Digital Programmer System** — sebuah sistem AI yang mampu mengeksekusi tugas-tugas software development secara otonom, dari perencanaan hingga deployment, dengan kualitas production-grade.

FajarClaw bukan sekadar chatbot coding. FajarClaw adalah **programmers team simulation** yang mengorkestrasikan dua AI engine berbeda untuk menangani aspek yang berbeda dari software development:

- **Claude Code** untuk terminal-heavy tasks (Git, backend, CLI, testing, MCP)
- **Google Antigravity** untuk visual tasks (UI components, browser testing, Lighthouse, parallel frontend)

Keduanya disatukan oleh **RAG-enhanced routing** yang secara cerdas memahami konteks dari 67+ dokumen proyek, codebase existing, dan histori keputusan sprint — lalu mendistribusikan pekerjaan ke engine yang paling tepat.

### 1.2 Mengapa FajarClaw?

| Problem | Solusi FajarClaw |
|---------|-----------------|
| AI coding tools generik, tidak paham konteks proyek | RAG pipeline menginjeksi konteks 67+ dokumen secara semantik |
| Satu AI engine tidak bisa semua | Dual-engine: Claude Code (terminal) + Antigravity (visual) |
| Manual document loading, sering lupa | Semantic search otomatis menemukan dokumen relevan |
| AI menghasilkan kode duplikat | Code RAG: cari existing code sebelum generate |
| Tidak ada visual awareness | Qwen3-VL-Embedding: AI bisa "melihat" screenshot UI |
| Keputusan sprint hilang | Sprint Memory: embed retrospective, decisions, bugs |
| Setup kompleks, banyak tools terpisah | Extension Layer di atas OpenClaw — 1 gateway, 4 skills |

### 1.3 Tech Stack Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    FAJARCLAW v4.0 STACK                      │
│                                                             │
│  ORCHESTRATION          AI ENGINES          RAG LAYER       │
│  ─────────────          ──────────          ─────────       │
│  OpenClaw Gateway       Claude Code SDK     BGE-M3          │
│  AGENTS.md              Antigravity IDE     Qwen3-VL-Emb    │
│  4 Custom Skills        Claude Opus 4.6     Qwen3-Reranker  │
│  WebSocket (18789)      (shared model)      Qwen3-VL-Rerank │
│                                             Milvus           │
│                                             tree-sitter      │
│                                                             │
│  INFRASTRUCTURE                                             │
│  ──────────────                                             │
│  Node.js ≥22 | pnpm | TypeScript | Docker                  │
│  RTX 4090 (16GB) | 32GB RAM | 2TB NVMe                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Visi & Misi Produk

### 2.1 Visi

> **Membangun AI programmer yang tidak hanya "menulis kode sesuai instruksi" tetapi "memahami proyek secara holistik" — membaca dokumen, melihat UI, mengingat keputusan, dan mengeksekusi dengan konsistensi production-grade.**

### 2.2 Misi

1. **Automate** — Otomatisasi 80% task coding rutin (boilerplate, CRUD, tests, deployment)
2. **Augment** — Tingkatkan kualitas developer decision-making dengan context-aware AI
3. **Accelerate** — Percepat sprint velocity 2-3x melalui dual-engine parallelism
4. **Assure** — Jamin konsistensi kode terhadap 67+ dokumen spesifikasi secara otomatis

### 2.3 Target User

| User | Deskripsi | Use Case Utama |
|------|-----------|----------------|
| **Solo Developer** | Developer yang mengerjakan proyek sendirian | Full-stack automation, jadi "tim" satu orang |
| **Tech Lead** | Pemimpin tim kecil 2-5 orang | Delegasi task ke FajarClaw, review output |
| **Agency/Studio** | Software house yang handle banyak proyek | Standarisasi workflow, percepat delivery |

### 2.4 Non-Goals (Explicit Scope Exclusion)

- FajarClaw **BUKAN** pengganti developer. Human tetap decision maker.
- FajarClaw **BUKAN** general-purpose AI assistant. Fokus di software development.
- FajarClaw **BUKAN** cloud service. Self-hosted di mesin developer.
- FajarClaw **TIDAK** melakukan autonomous deployment tanpa human approval.

---

## 3. Arsitektur Sistem

### 3.1 High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        FAJARCLAW v4.0 ARCHITECTURE                       │
│                                                                          │
│  USER                                                                    │
│  ├── Terminal (CLI)                                                      │
│  ├── Chat Interface (OpenClaw channels)                                  │
│  └── IDE (Antigravity / VS Code)                                         │
│       │                                                                  │
│       ▼                                                                  │
│  ┌──────────────────────────────────────────────────────┐                │
│  │           OPENCLAW GATEWAY (ws://127.0.0.1:18789)     │                │
│  │           ─────────────────────────────────────────    │                │
│  │  Session Management | Auth | Message Routing           │                │
│  │  Multi-Channel (Terminal, Web, Telegram, Slack, etc.)  │                │
│  └────────────────────────┬─────────────────────────────┘                │
│                           │                                              │
│                           ▼                                              │
│  ┌────────────────────────────────────────────────────────┐              │
│  │              SKILL 1: FAJARCLAW-ROUTER                  │              │
│  │              ─────────────────────────                   │              │
│  │  1. Receive task message                                │              │
│  │  2. RAG: embed message → Milvus semantic search         │              │
│  │  3. Route: classify → Claude Code / Antigravity / Dual  │              │
│  │  4. Inject: relevant docs + existing code → context     │              │
│  │  5. Dispatch to appropriate engine                      │              │
│  └──────────┬──────────────────────────┬─────────────────┘              │
│             │                          │                                 │
│             ▼                          ▼                                 │
│  ┌─────────────────────┐   ┌──────────────────────┐                     │
│  │ SKILL 2:            │   │ SKILL 3:             │                     │
│  │ FAJARCLAW-CLAUDE-   │   │ FAJARCLAW-           │                     │
│  │ CODE                │   │ ANTIGRAVITY           │                     │
│  │ ───────────────     │   │ ─────────────         │                     │
│  │ • SDK/CLI wrapper   │   │ • IDE connector       │                     │
│  │ • Git automation    │   │ • Browser control     │                     │
│  │ • MCP integration   │   │ • Multi-agent spawn   │                     │
│  │ • Backend tasks     │   │ • Workflow triggers    │                     │
│  │ • Testing           │   │ • Visual tasks        │                     │
│  └─────────────────────┘   └──────────────────────┘                     │
│             │                          │                                 │
│             └──────────┬───────────────┘                                 │
│                        ▼                                                 │
│  ┌────────────────────────────────────────────────────────┐              │
│  │              SKILL 4: FAJARCLAW-RAG                     │              │
│  │              ─────────────────────                      │              │
│  │                                                         │              │
│  │  ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌──────────┐ │              │
│  │  │ Ingestion│ │ Chunking  │ │Embedding │ │ Retrieval│ │              │
│  │  │ Pipeline │→│ (Smart)   │→│ (Dual)   │→│ (Hybrid) │ │              │
│  │  └──────────┘ └───────────┘ └──────────┘ └──────────┘ │              │
│  │                                                         │              │
│  │  ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌──────────┐ │              │
│  │  │ Reranker │ │  Prompt   │ │Guardrails│ │  Cache   │ │              │
│  │  │          │→│ Assembly  │→│          │→│          │ │              │
│  │  └──────────┘ └───────────┘ └──────────┘ └──────────┘ │              │
│  │                                                         │              │
│  │  ┌──────────┐ ┌───────────┐                            │              │
│  │  │ Query    │ │Evaluation │                            │              │
│  │  │Transform │ │& Feedback │                            │              │
│  │  └──────────┘ └───────────┘                            │              │
│  │                                                         │              │
│  │  STORAGE: Milvus (7 collections)                        │              │
│  │  MODELS: BGE-M3 | Qwen3-VL-Emb | Qwen3-Reranker       │              │
│  └────────────────────────────────────────────────────────┘              │
│                                                                          │
│  ┌────────────────────────────────────────────────────────┐              │
│  │              SHARED RESOURCES                           │              │
│  │  • Claude Opus 4.6 (Anthropic API — shared model)       │              │
│  │  • Project Workspace (67+ docs + codebase)              │              │
│  │  • Git Repository                                       │              │
│  │  • Firebase Projects (dev/staging/prod)                  │              │
│  └────────────────────────────────────────────────────────┘              │
└──────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Data Flow — Task Execution

```
USER: "Buat form registrasi aset dengan QR scanner"
  │
  ▼
[1] GATEWAY receives message → route ke FajarClaw skills
  │
  ▼
[2] ROUTER — Task Analysis
  ├── RAG embed query → Milvus search → temukan:
  │   ├── B-07 §3.2 (Form Components)         relevance: 0.94
  │   ├── B-02 §4.1 (Asset Data Model)         relevance: 0.91
  │   ├── D-09 (Component Templates)            relevance: 0.87
  │   ├── B-04 §7 (QR Integration spec)        relevance: 0.85
  │   └── src/components/AssetForm.tsx           relevance: 0.82 [EXISTING!]
  │
  ├── Reranker: re-score → confirm top 5 order
  │
  ├── Route decision: DUAL MODE (UI component + QR library)
  │   ├── Antigravity: generate UI form component
  │   └── Claude Code: implement QR scanner with zxing
  │
  └── Assemble prompt with retrieved context
  │
  ▼
[3] DUAL EXECUTION (parallel)
  ├── Antigravity:
  │   ├── Receives: B-07 specs + existing AssetForm.tsx + D-09 templates
  │   ├── Action: EXTEND AssetForm.tsx (not create new)
  │   ├── Output: Updated React component + Tailwind styling
  │   └── Screenshot: capture rendered result
  │
  └── Claude Code:
      ├── Receives: B-04 QR spec + package requirements
      ├── Action: npm install @aspect-ratio/qr + implement useQRScanner hook
      ├── Output: Hook + unit tests
      └── Git: commit with conventional format
  │
  ▼
[4] MERGER — Combine Results
  ├── Merge Antigravity UI + Claude Code hook
  ├── Verify consistency between outputs
  ├── Guardrails: check @ref docs, TypeScript strict, no duplication
  └── Present unified result to user
  │
  ▼
[5] USER reviews → approve / request changes → iterate
```

---

## 4. Platform Foundation — OpenClaw Extension Layer

### 4.1 Strategi: Extension Layer (Opsi B)

FajarClaw dibangun sebagai **Extension Layer** di atas OpenClaw (196k★, 10,729 commits, MIT License), bukan sebagai fork. Pendekatan ini dipilih karena:

| Faktor | Alasan |
|--------|--------|
| **~70% infrastruktur sudah ada** | Gateway, channels, sessions, browser, skills, Docker sandbox |
| **Zero maintenance burden** | OpenClaw upstream handles bug fixes, security patches |
| **Instant updates** | `npm update openclaw` = gratis dapat fitur baru |
| **Focus on value-add** | Kita hanya bangun 4 skills yang menjadi differentiator |
| **Exit strategy** | Bisa eskalasi ke Opsi C (thin fork) jika skills API tidak cukup |

### 4.2 Apa yang OpenClaw Sediakan (Gratis)

```
OPENCLAW BUILT-IN (tidak perlu kita bangun):
├── Gateway WS control plane (ws://127.0.0.1:18789)
├── Multi-channel: Terminal, Web, Telegram, Slack, Discord, WhatsApp, dll.
├── Pi agent runtime (RPC mode, tool streaming)
├── Browser control (Chrome/Chromium CDP)
├── Skills platform (bundled/managed/workspace)
├── Docker sandbox per-session isolation
├── CLAUDE.md + AGENTS.md support (native)
├── Cron, webhooks, session management
├── Multi-agent routing
└── Tech stack identik: Node.js ≥22, pnpm, TypeScript
```

### 4.3 Apa yang FajarClaw Tambahkan (4 Custom Skills)

```
FAJARCLAW EXTENSION (yang kita bangun):
├── Skill 1: fajarclaw-router/        → Task classification + RAG-enhanced routing
├── Skill 2: fajarclaw-claude-code/    → Claude Code SDK/CLI wrapper + Git + MCP
├── Skill 3: fajarclaw-antigravity/    → Antigravity IDE connector + workflow proxy
├── Skill 4: fajarclaw-rag/           → Full RAG pipeline (12 komponen)
├── AGENTS.md                          → FajarClaw persona + commands
├── CLAUDE.md                          → Persistent codebase context
└── openclaw.json                      → Configuration template
```

### 4.4 Evaluation Gate (Minggu 4)

Sebelum lanjut ke fase production, evaluasi apakah Opsi B (Extension Layer) memadai:

| Kriteria | Pass | Eskalasi ke Opsi C |
|----------|:----:|:---------:|
| Skills API bisa handle dual-engine dispatch? | Ya → Lanjut B | Tidak → Fork |
| Tool streaming cukup untuk parallel execution? | Ya → Lanjut B | Tidak → Fork |
| Session model bisa shared state antar engine? | Ya → Lanjut B | Tidak → Fork |
| Upstream update tidak break custom skills? | Ya → Lanjut B | Tidak → Pin version |

**Ekspektasi: 90% Opsi B memadai.** OpenClaw skills API cukup fleksibel.

---

## 5. Dual-Engine Architecture

### 5.1 Mengapa Dua Engine?

Tidak ada satu AI engine yang optimal untuk semua tugas development:

| Aspek | Claude Code | Antigravity |
|-------|:-----------:|:-----------:|
| **Terminal/CLI** | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| **Git operations** | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| **Backend/API** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **UI components** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Visual testing** | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Browser automation** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Parallel execution** | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **MCP integrations** | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| **Refactoring** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Lighthouse/Perf** | ⭐⭐ | ⭐⭐⭐⭐⭐ |

### 5.2 Routing Rules

```
CLAUDE CODE → Tugas yang dominan terminal/backend:
├── Git: commit, push, PR, merge, branch, rebase
├── Backend: Cloud Functions, API endpoints, middleware
├── CLI: npm scripts, firebase CLI, deployment commands
├── Refactoring: large-scale code restructuring
├── Testing: unit tests, integration tests, test runners
├── MCP: GitHub issues, Sentry errors, Slack notifications
└── Infrastructure: Docker, CI/CD, environment setup

ANTIGRAVITY → Tugas yang dominan visual/frontend:
├── UI: React components, forms, dashboards, layouts
├── Visual Testing: screenshot comparison, Lighthouse audit
├── Browser: E2E testing, user flow simulation
├── Parallel: spawn multiple agents untuk task independen
├── Styling: Tailwind, responsive design, dark mode
└── Design-to-Code: mockup → component implementation

DUAL MODE → Tugas yang butuh kedua engine:
├── Sprint Execution: PLAN (both) → BUILD (route per task) → TEST (both)
├── Deploy + Verify: CC deploys → AG verifies in browser
├── Security Audit: CC scans code → AG tests in browser
├── E2E Testing: CC runs test suite → AG captures screenshots
├── Full-Stack Feature: CC does backend → AG does frontend → merge
└── Performance: AG runs Lighthouse → CC optimizes based on results
```

### 5.3 Collaboration Patterns

| Pattern | Cara Kerja | Contoh |
|---------|-----------|--------|
| **Pipeline** | Engine A output → Engine B input (sequential) | CC deploy → AG verify in browser |
| **Parallel** | Engine A dan B kerja bersamaan (independent) | CC build API + AG build UI |
| **Verify** | Engine A execute → Engine B verify result | AG generate component → CC run tests |

### 5.4 Fallback Strategy

```
JIKA Claude Code tidak tersedia:
└── Route ke Antigravity + OpenClaw Pi agent (slower, but works)

JIKA Antigravity tidak tersedia:
└── Route ke Claude Code + OpenClaw browser CDP (basic visual)

JIKA keduanya tidak tersedia:
└── Fall back ke OpenClaw Pi agent only (basic mode)
```

---

## 6. Skill 1 — FajarClaw Router

### 6.1 Spesifikasi

| Field | Detail |
|-------|--------|
| **Nama** | `fajarclaw-router` |
| **Lokasi** | `~/.openclaw/workspace/skills/fajarclaw-router/` |
| **Fungsi** | Task classification, RAG-enhanced routing, context injection |
| **Files** | `SKILL.md`, `router.ts`, `patterns.ts`, `merger.ts` |

### 6.2 Task Classification Logic

Router menggunakan **dual strategy** — keyword scoring (fast) + semantic search (accurate):

```
CLASSIFICATION PIPELINE:

User message
     │
     ├──→ [Layer 1: Keyword Scoring] ← FAST (~1ms)
     │    ├── CLAUDE_CODE_KEYWORDS: git, commit, push, npm, deploy, backend,
     │    │   function, test, cli, docker, mcp, refactor, migrate...
     │    ├── ANTIGRAVITY_KEYWORDS: component, ui, form, page, layout, style,
     │    │   design, screenshot, lighthouse, visual, parallel, responsive...
     │    ├── DUAL_KEYWORDS: sprint, feature, full-stack, crud, deploy+verify,
     │    │   security-audit, e2e, performance...
     │    └── Score: weighted sum → confidence 0-1
     │
     ├──→ [Layer 2: Semantic Search] ← ACCURATE (~200ms, Phase 3+)
     │    ├── BGE-M3 embed message
     │    ├── Milvus search "routing_rules" collection
     │    ├── Match: top-3 routing patterns with similarity score
     │    └── Score: semantic similarity → confidence 0-1
     │
     └──→ [Fusion] combine scores → final decision
          ├── High confidence (≥0.8): route directly
          ├── Medium confidence (0.5-0.8): use semantic result
          └── Low confidence (<0.5): ask user for clarification

OVERRIDE COMMANDS (user explicit):
├── /build:cc [task]     → force Claude Code
├── /build:ag [task]     → force Antigravity
├── /build:dual [task]   → force both engines
└── /build [task]        → auto-route (default)
```

### 6.3 Context Injection (RAG-Enhanced)

Setelah routing decision, router meng-inject retrieved context:

```typescript
interface RoutedTask {
  originalMessage: string;
  engine: 'claude-code' | 'antigravity' | 'dual';
  confidence: number;
  context: {
    documents: RetrievedChunk[];    // dari Milvus "documents" collection
    existingCode: RetrievedChunk[]; // dari Milvus "codebase" collection
    decisions: RetrievedChunk[];    // dari Milvus "decisions" collection
    screenshots?: RetrievedChunk[]; // dari Milvus "visual" collection (Qwen3-VL)
  };
  pattern: 'pipeline' | 'parallel' | 'verify';
  sprintContext: {
    sprintNumber: number;
    phase: string;
    currentStory: string;
  };
}
```

---

## 7. Skill 2 — FajarClaw Claude Code

### 7.1 Spesifikasi

| Field | Detail |
|-------|--------|
| **Nama** | `fajarclaw-claude-code` |
| **Lokasi** | `~/.openclaw/workspace/skills/fajarclaw-claude-code/` |
| **Fungsi** | Claude Code SDK/CLI wrapper, Git automation, MCP integration |
| **Files** | `SKILL.md`, `claude-code.ts`, `git-flow.ts`, `mcp-manager.ts` |

### 7.2 Kapabilitas

**A. Claude Code Execution**
```
Modes:
├── SDK Mode (primary): @anthropic-ai/claude-code package
│   ├── Programmatic API: execute(prompt, options)
│   ├── Streaming output
│   └── Tool use control
└── CLI Mode (fallback): claude CLI binary
    ├── Shell execution: claude -p "prompt" --output-format json
    └── Non-interactive mode
```

**B. Git Automation**
```
├── commit(message, files?)     → Conventional Commits format (C-01)
├── createBranch(name)          → feat/*, fix/*, chore/* prefixes
├── createPR(title, body, base) → GitHub PR with description
├── fixIssue(issueId)           → End-to-end: branch → fix → test → PR
├── merge(pr, strategy)         → Squash merge to main
└── All operations include @ref document traceability
```

**C. MCP Server Orchestration**
```
Built-in MCP Servers:
├── GitHub: list issues, create PR, review code
├── Sentry: get errors, track releases
├── Firebase: deploy, manage projects
├── Slack: send notifications, create channels
└── Custom: extensible via ~/.claude/mcp_servers.json
```

---

## 8. Skill 3 — FajarClaw Antigravity

### 8.1 Spesifikasi

| Field | Detail |
|-------|--------|
| **Nama** | `fajarclaw-antigravity` |
| **Lokasi** | `~/.openclaw/workspace/skills/fajarclaw-antigravity/` |
| **Fungsi** | Antigravity IDE connector, browser control, workflow proxy |
| **Files** | `SKILL.md`, `antigravity.ts`, `agent-manager.ts`, `workflow-triggers.ts` |

### 8.2 Kapabilitas

**A. IDE Connection**
```
├── Detect Antigravity IDE running
├── Connect via IDE API (if available)
├── Fallback: OpenClaw browser CDP (Chromium)
└── Status: check /health endpoint
```

**B. Multi-Agent Spawning**
```
├── spawnParallel(tasks[])   → Multiple agents work simultaneously
│   Contoh: Agent 1 builds AssetForm + Agent 2 builds AssetList
├── spawnSequential(tasks[]) → Chain of agents in order
│   Contoh: Agent 1 builds page → Agent 2 adds styling
├── estimateTime(tasks[])    → Predict parallel vs sequential duration
└── Fallback: sequential via Pi agent if Agent Manager unavailable
```

**C. WF-01 Workflow Triggers**
```
Proxy untuk Antigravity workflows (C-06 s/d C-12):
├── /generate-component  → React component + test (C-06)
├── /generate-function   → Cloud Function + middleware (C-07)
├── /generate-crud       → Firestore CRUD + rules (C-08)
├── /generate-gworkspace → Google Workspace API (C-09)
├── /generate-tests      → Unit + integration tests (C-10)
├── /review-security     → Security audit report (C-11)
└── /deploy-check        → Deployment checklist (C-12)

Fallback: jika Antigravity tidak available, execute via Claude Code
dengan prompt yang mencakup workflow rules dari dokumen C-xx.
```

---

## 9. Skill 4 — FajarClaw RAG Engine

### 9.1 Spesifikasi

| Field | Detail |
|-------|--------|
| **Nama** | `fajarclaw-rag` |
| **Lokasi** | `~/.openclaw/workspace/skills/fajarclaw-rag/` |
| **Fungsi** | Full 12-component RAG pipeline |
| **Files** | `SKILL.md`, `embedder.ts`, `milvus-client.ts`, `indexer.ts`, `retriever.ts`, `chunker.ts`, `reranker.ts`, `prompt-builder.ts`, `query-transform.ts`, `guardrails.ts`, `cache.ts`, `evaluator.ts` |

### 9.2 Mengapa RAG Dibutuhkan

FajarClaw mengelola proyek dengan 67+ dokumen (~500k tokens total). Context window Claude Opus 4.6 terbatas ~200k tokens. Tanpa RAG:

- Harus manual memilih dokumen → sering salah/tidak lengkap
- Load semua dokumen → melebihi context window
- AI tidak tahu kode existing → generate duplikat
- Keputusan sprint lama terlupakan

**Dengan RAG:** AI secara otomatis menemukan **top 5 chunks paling relevan** dari seluruh knowledge base — termasuk dokumen, kode, screenshot, dan histori sprint — dalam ~200-500ms.

### 9.3 Tiga Use Case Utama RAG

| # | Use Case | Impact | Engine |
|:-:|----------|:------:|--------|
| 1 | **Document Retrieval** — semantic search 67+ WF-01 docs, inject relevant sections | ⭐⭐⭐⭐⭐ | BGE-M3 |
| 2 | **Code Awareness** — cari existing code sebelum generate, extend bukan duplikat | ⭐⭐⭐⭐ | BGE-M3 |
| 3 | **Visual Search** — embed screenshot UI, cari komponen mirip secara visual | ⭐⭐⭐⭐ | Qwen3-VL |

---

## 10. RAG Pipeline — 12 Komponen

### 10.1 Pipeline Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    FAJARCLAW RAG PIPELINE (12 Komponen)                  │
│                                                                         │
│  LAYER 1 — INDEXING (Background / On-Change)                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │ 1.INGEST │→│ 2.CHUNK  │→│ 3.EMBED  │→│ 4.INDEX  │               │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘               │
│                                                                         │
│  LAYER 2 — RETRIEVAL (Per Query, ~200-500ms)                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                             │
│  │ 5.QUERY  │→│ 6.HYBRID │→│ 7.RERANK │                             │
│  │ TRANSFORM│  │ RETRIEVE │  │          │                             │
│  └──────────┘  └──────────┘  └──────────┘                             │
│                                     │                                   │
│  LAYER 3 — GENERATION (Per Response)│                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────┴───┐                             │
│  │10.GUARD- │←│ 9.CLAUDE  │←│ 8.PROMPT │                             │
│  │ RAILS    │  │ GENERATE │  │ ASSEMBLY │                             │
│  └──────────┘  └──────────┘  └──────────┘                             │
│                                                                         │
│  LAYER 4 — OPTIMIZATION (Continuous)                                    │
│  ┌──────────┐  ┌──────────┐                                           │
│  │11.CACHE  │  │12.EVAL & │                                           │
│  │          │  │ FEEDBACK │                                           │
│  └──────────┘  └──────────┘                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

### 10.2 Komponen 1: Ingestion Pipeline

**Fungsi:** Memasukkan data dari berbagai sumber ke Milvus secara otomatis dan incremental.

```
SUMBER DATA:
├── 67+ WF-01 documents (.md)          → watch folder, parse on change
├── Codebase (.ts/.tsx/.json files)     → Git hooks, parse on commit
├── Sprint artifacts (retro, decisions) → manual trigger / sprint boundary
├── Screenshots (dari Antigravity)      → auto-capture, embed with Qwen3-VL
└── Git history (commits, PRs, issues)  → Git hooks, parse commit messages

TRIGGERS:
├── File watcher (chokidar)  → detect .md / .ts changes → re-index affected chunks
├── Git post-commit hook     → index new/changed code files
├── /index [path]            → manual force re-index command
├── /index --full            → full re-index all collections
└── Sprint boundary          → index sprint artifacts automatically

INCREMENTAL STRATEGY:
├── Hash each file → compare with stored hash
├── Only re-embed chunks from changed files
├── Delete vectors for removed files
└── Estimated: full re-index 67 docs = ~2 minutes (one-time)
```

**Tools:** chokidar (file watcher), simple-git (Git hooks), tree-sitter (TypeScript AST)

### 10.3 Komponen 2: Smart Chunking

**Fungsi:** Memecah dokumen dan kode menjadi chunks optimal untuk retrieval.

```
STRATEGI PER TIPE KONTEN:

┌───────────────────────────────────────────────────────────┐
│ WF-01 DOCUMENTS (.md)                                     │
│ ─────────────────────                                     │
│ Strategy: Section-aware chunking                          │
│ ├── Split by ## heading (section boundary)                │
│ ├── Contextual header: prepend parent headings            │
│ │   "WF-01 > Stage 2 > Sprint Cycle > BUILD Phase"       │
│ ├── Overlap: 50 tokens antar chunk                        │
│ ├── Max: 512 tokens per chunk                             │
│ ├── Metadata: {doc_id, section, heading_path, sprint_ref} │
│ └── Estimated: 67 docs → ~2000 chunks                    │
├───────────────────────────────────────────────────────────┤
│ CODEBASE (.ts/.tsx)                                       │
│ ──────────────────                                        │
│ Strategy: AST-aware chunking (tree-sitter)                │
│ ├── Split by: function, class, component, interface       │
│ ├── Preserve: function signature + JSDoc + imports         │
│ ├── Metadata: {file_path, export_name, type, deps}        │
│ ├── Special: types.ts → 1 chunk per interface             │
│ └── Estimated: project → ~500-5000 chunks                 │
├───────────────────────────────────────────────────────────┤
│ SPRINT ARTIFACTS                                          │
│ ────────────────                                          │
│ Strategy: Decision-level chunking                         │
│ ├── Split by: decision, action item, bug report           │
│ ├── Metadata: {sprint, date, status, category}            │
│ ├── Tags: "decision" | "retro" | "bug" | "action"        │
│ └── Estimated: ~200 chunks over project lifetime          │
├───────────────────────────────────────────────────────────┤
│ SCREENSHOTS                                               │
│ ───────────                                               │
│ Strategy: No chunking (1 screenshot = 1 vector)           │
│ ├── Metadata: {url, timestamp, viewport, sprint, page}    │
│ ├── Paired text: component name, page title, description  │
│ └── Estimated: ~100-500 screenshots over project          │
└───────────────────────────────────────────────────────────┘
```

### 10.4 Komponen 3: Dual Embedding

**Fungsi:** Convert chunks menjadi vector representations menggunakan 2 model yang saling melengkapi.

```
DUAL EMBEDDING STRATEGY:

┌────────────────────────────────────────────────────────┐
│  TEXT TASKS (90% queries)          VISUAL TASKS (10%)   │
│                                                         │
│  ┌───────────────┐                ┌─────────────────┐  │
│  │   BGE-M3      │                │ Qwen3-VL-Emb-2B │  │
│  │   568M params │                │ 2B params        │  │
│  │   1024 dim    │                │ 2048 dim (MRL)   │  │
│  │   CPU OK      │                │ GPU required     │  │
│  │   ~20ms/query │                │ ~200ms/query     │  │
│  │               │                │                   │  │
│  │   Dense ✅    │                │ Dense ✅          │  │
│  │   Sparse ✅   │                │ Sparse ❌         │  │
│  │   Multi-vec ✅│                │ Multi-vec ❌      │  │
│  │               │                │                   │  │
│  │   100+ langs  │                │ 30+ langs         │  │
│  │   8K tokens   │                │ 32K tokens        │  │
│  └───────────────┘                └─────────────────┘  │
│         │                                │              │
│         ▼                                ▼              │
│  Collections:                     Collections:          │
│  documents, codebase,             ui_screenshots,       │
│  routing_rules, decisions         design_mockups,       │
│                                   visual_tests          │
└────────────────────────────────────────────────────────┘

ROUTING LOGIC:
├── hasImage || hasScreenshot || hasVideo → Qwen3-VL
├── type == 'visual-search' → Qwen3-VL
├── type == 'screenshot-to-code' → Qwen3-VL
└── else → BGE-M3 (default, faster)
```

### 10.5 Komponen 4: Vector Indexing (Milvus)

**Fungsi:** Menyimpan dan mengindeks vectors untuk fast similarity search.

```
MILVUS COLLECTIONS:

┌───────────┬───────────┬───────┬────────────┬──────────────────────────┐
│ Collection│ Embedder  │ Dims  │ Est. Count │ Isi                      │
├───────────┼───────────┼───────┼────────────┼──────────────────────────┤
│ documents │ BGE-M3    │ 1024  │ ~2,000     │ 67+ WF-01 docs per §     │
│ codebase  │ BGE-M3    │ 1024  │ ~500-5,000 │ .ts/.tsx per function    │
│ routes    │ BGE-M3    │ 1024  │ ~100       │ Routing pattern examples │
│ decisions │ BGE-M3    │ 1024  │ ~200       │ Sprint retro, bugs       │
│ visual    │ Qwen3-VL  │ 2048  │ ~100-500   │ UI screenshots           │
│ mockups   │ Qwen3-VL  │ 2048  │ ~50-200    │ Design mockups           │
│ vistests  │ Qwen3-VL  │ 2048  │ ~200-1,000 │ Visual regression base   │
└───────────┴───────────┴───────┴────────────┴──────────────────────────┘

MILVUS CONFIGURATION:
├── Mode: Milvus Lite (development) / Standalone Docker (production)
├── Index type: HNSW (best for <1M vectors)
├── Distance metric: Cosine similarity
├── RAM usage: ~3-4GB
└── Storage: ~2-5GB on NVMe
```

### 10.6 Komponen 5: Query Transformation

**Fungsi:** Mengubah query user menjadi query yang lebih efektif untuk retrieval.

```
TRANSFORM PIPELINE:

Original: "bikin form registrasi aset"
     │
     ▼
[1. Language Expansion]
    + "asset registration form" (English equivalent)
    + "CreateAssetInput" (technical term dari D-07)
     │
     ▼
[2. HyDE — Hypothetical Document Embedding]
    Claude generates: "Dokumen ideal yang menjelaskan form registrasi aset
    mencakup field: nama aset, kategori, serial number, lokasi, PIC,
    tanggal pembelian, nilai pembelian, QR code..."
    → Embed dokumen hipotetis ini (bukan query asli)
    → Retrieval jauh lebih akurat
     │
     ▼
[3. Query Decomposition — untuk query kompleks]
    "Buat full-stack CRUD aset dengan security"
    → Sub-query 1: "asset data model fields collections"
    → Sub-query 2: "asset CRUD API endpoints REST"
    → Sub-query 3: "asset security rules RBAC firestore"
    → Retrieve per sub-query → merge + deduplicate
     │
     ▼
[4. Metadata Filter Injection]
    Dari routing context:
    → Engine: claude-code → filter: type IN [code, backend-doc]
    → Engine: antigravity → filter: type IN [component, screenshot, ui-doc]
    → Sprint 5 context → prioritize: sprint <= 5
```

### 10.7 Komponen 6: Hybrid Retrieval

**Fungsi:** Kombinasi dense + sparse + metadata filtering dengan score fusion.

```
HYBRID SEARCH PIPELINE:

Query (transformed) → BGE-M3:
├── Dense search:  cosine similarity → top 50 (semantic meaning)
├── Sparse search: BM25-like → top 50 (keyword matching)
└── Metadata filter: collection, type, sprint, engine tag

     ↓ Reciprocal Rank Fusion (RRF)

     Score(doc) = Σ  1 / (k + rank_i)    k=60 (standard)
                  i∈{dense, sparse}

     ↓ Sort by fused score → top 20 candidates

     → Pass ke Reranker (komponen 7)

CATATAN:
├── Milvus 2.6 native support hybrid search + RRF
├── Dense menangkap: "form registrasi" ≈ "asset input component"
├── Sparse menangkap: exact terms "CreateAssetInput", "B-02"
└── Gabungan keduanya = recall tertinggi
```

### 10.8 Komponen 7: Reranker

**Fungsi:** Cross-encoder yang re-score top-N candidates untuk precision tinggi.

**Mengapa critical:**
- Embedding = bi-encoder (encode query dan doc terpisah) → cepat tapi lossy
- Reranker = cross-encoder (encode query + doc bersamaan) → lambat tapi akurat
- **+15-30% precision improvement** (konsisten di benchmark 2025)
- **-35% hallucination rate** (Databricks benchmark)

```
RERANKER PIPELINE:

Text results (top 20 dari hybrid retrieval)
     │
     ▼
┌─────────────────────────────────────────┐
│ Qwen3-Reranker-0.6B (CPU, ~30ms)       │
│ ─────────────────────────────────       │
│ Cross-encode: (query, doc) → score 0-1  │
│ Re-sort by relevance score              │
│ Output: top 5 most relevant             │
└─────────────────────────────────────────┘
     │
     ▼
Top 5 text results → Prompt Assembly


Visual results (top 10 dari Qwen3-VL search)
     │
     ▼
┌─────────────────────────────────────────┐
│ Qwen3-VL-Reranker-2B (GPU, ~100ms)     │
│ ─────────────────────────────────       │
│ Cross-modal: (query, image+text) → score│
│ Re-sort by relevance score              │
│ Output: top 3 most relevant             │
└─────────────────────────────────────────┘
     │
     ▼
Top 3 visual results → Prompt Assembly
```

### 10.9 Komponen 8: Prompt Assembly

**Fungsi:** Menyusun retrieved context ke dalam prompt optimal untuk Claude Opus 4.6.

```
DYNAMIC PROMPT TEMPLATE:

┌────────────────────────────────────────────────────────────┐
│ SYSTEM: [AGENTS.md — FajarClaw persona + coding standards] │
│                                                            │
│ RETRIEVED CONTEXT (ranked by relevance):                   │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ [#1] B-07 §3.2 — Form Components (rel: 0.94)          │ │
│ │ Source: WF-01 docs | Sprint: all                       │ │
│ │ "Form registrasi aset memerlukan field: nama_aset..."  │ │
│ ├────────────────────────────────────────────────────────┤ │
│ │ [#2] B-02 §4.1 — Asset Data Model (rel: 0.91)         │ │
│ │ Source: WF-01 docs | Sprint: all                       │ │
│ │ "Collection 'assets': {nama, kategori, serial...}"     │ │
│ ├────────────────────────────────────────────────────────┤ │
│ │ [#3] src/components/AssetForm.tsx (rel: 0.82)          │ │
│ │ Source: codebase | Last modified: Sprint 3             │ │
│ │ "export function AssetForm({ onSubmit }) { ... }"      │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│ CODE AWARENESS:                                            │
│ ⚠️ AssetForm.tsx SUDAH ADA → EXTEND, jangan buat baru     │
│                                                            │
│ SPRINT CONTEXT:                                            │
│ Sprint 5 | Phase 2 | US-024 "Asset Registration + QR"     │
│ Decision Sprint 4: "Pakai zxing-js untuk QR scanner"      │
│                                                            │
│ USER: "Buat form registrasi aset dengan QR scanner"        │
│                                                            │
│ RULES:                                                     │
│ - Ikuti spesifikasi dari retrieved context                 │
│ - Extend existing code, jangan duplikat                    │
│ - TypeScript strict, no 'any'                              │
│ - Sertakan @ref ke dokumen sumber di komentar              │
│ - Komentar dalam Bahasa Indonesia                          │
└────────────────────────────────────────────────────────────┘
```

### 10.10 Komponen 9: Generation

**Sudah ada** — Claude Opus 4.6 via Anthropic API (shared model untuk kedua engine).

### 10.11 Komponen 10: Guardrails

**Fungsi:** Post-generation quality checks sebelum output ke user.

```
GUARDRAIL CHECKS:

[1] CONSISTENCY CHECK
    ├── Compare output vs retrieved docs
    ├── Flag: "Generated field 'brand' tapi B-02 bilang 'merk'"
    └── Action: auto-fix atau warning

[2] CODE STANDARD CHECK
    ├── TypeScript strict: no 'any', proper types
    ├── Zod validation present for inputs
    ├── Comments in Bahasa Indonesia
    ├── Error handling: try-catch on async
    └── ESLint + Prettier compliance

[3] DUPLICATION DETECTION
    ├── Embed generated code → search codebase collection
    ├── Similarity > 0.85 → WARNING: "Fungsi serupa ada di [file]"
    └── Suggest: import existing instead of recreating

[4] SECURITY SCAN
    ├── No hardcoded secrets/keys
    ├── RBAC check present (B-05)
    ├── Input validation present (Zod)
    └── Audit trail write present (C-03)

[5] DOCUMENT TRACEABILITY
    ├── Every function MUST have @ref comment
    ├── Pattern: @ref B-02 §4.1 — Asset Collection
    └── Fail if no cross-reference found
```

### 10.12 Komponen 11: Caching

**Fungsi:** Reduce latency dan cost melalui multi-layer caching.

```
CACHE LAYERS:

[L1] EMBEDDING CACHE — In-memory
├── Key: SHA256(text) → Value: vector[1024]
├── Size: LRU, max 10k entries (~40MB)
├── Hit rate: ~30% (repeated queries)
└── Benefit: skip BGE-M3 inference

[L2] RETRIEVAL CACHE — In-memory
├── Key: SHA256(query + filters) → Value: top-N results
├── TTL: 5 minutes (invalidate on git commit)
├── Hit rate: ~20% (similar queries within sprint)
└── Benefit: skip Milvus search

[L3] RERANK CACHE — In-memory
├── Key: SHA256(query + candidate_ids) → Value: reranked list
├── TTL: 5 minutes
├── Hit rate: ~15%
└── Benefit: skip cross-encoder inference (slowest step)

[L4] CLAUDE PROMPT CACHE — Anthropic native
├── Automatic for >1024 token prefix match
├── Benefit: 90% token cost savings on repeated system prompt
└── Built-in, no configuration needed

INVALIDATION:
├── Git commit → invalidate L2, L3 for codebase queries
├── Document change → invalidate L1, L2, L3 for doc queries
├── Sprint boundary → flush all caches
└── /cache clear → manual flush
```

### 10.13 Komponen 12: Evaluation & Feedback

**Fungsi:** Mengukur RAG quality dan continuously improve.

```
METRICS:

Retrieval Quality:
├── Recall@5: % dokumen relevan di top 5 results. Target: ≥ 0.85
├── NDCG@5: Kualitas ranking (posisi tepat). Target: ≥ 0.80
├── MRR: Mean Reciprocal Rank. Target: ≥ 0.75
└── Latency: p95 retrieval time. Target: < 500ms

Generation Quality:
├── Faithfulness: Output konsisten dengan context? Target: ≥ 0.90
├── Relevance: Output menjawab pertanyaan? Target: ≥ 0.90
├── Hallucination: Info yang tidak ada di context? Target: < 5%
└── Code compilability: Generated code bisa compile? Target: 100%

FEEDBACK LOOP:
├── 👍 Positive → boost retrieval weights untuk query pattern serupa
├── 👎 Negative → analyze: retrieval problem atau generation problem?
│   ├── Retrieval: adjust chunk strategy, add training examples
│   └── Generation: adjust prompt template, add guardrail
├── Explicit: "Dokumen X harusnya dipakai" → relevance signal ke Milvus
├── Implicit: user re-asks atau says "bukan itu" → negative signal
└── Auto: if guardrails trigger → log for analysis

EVAL TOOLS:
├── RAGAS framework (automated RAG evaluation)
├── Custom eval set: 50-100 query-answer pairs dari WF-01
└── Weekly eval runs during active development
```

---

## 11. Model Stack & Embedding Strategy

### 11.1 Complete Model Inventory

| # | Model | Role | Size | Hardware | Latency | License |
|:-:|-------|------|:----:|:--------:|:-------:|:-------:|
| 1 | **BGE-M3** | Text embedding (dense+sparse+multi-vec) | 568M | CPU | ~20ms | MIT |
| 2 | **Qwen3-VL-Embedding-2B** | Visual embedding (text+image+screenshot+video) | 2B | GPU 4.5GB | ~200ms | Apache 2.0 |
| 3 | **Qwen3-Reranker-0.6B** | Text reranking (cross-encoder) | 0.6B | CPU | ~30ms | Apache 2.0 |
| 4 | **Qwen3-VL-Reranker-2B** | Visual reranking (cross-modal) | 2B | GPU 4.5GB | ~100ms | Apache 2.0 |
| 5 | **Claude Opus 4.6** | Generation (shared by both engines) | — | API | ~2-5s | Anthropic |
| 6 | **tree-sitter** | TypeScript AST parsing for code chunking | — | CPU | <1ms | MIT |

### 11.2 Mengapa Dual Embedding (BGE-M3 + Qwen3-VL)?

FajarClaw punya dua engine — satu text-centric (Claude Code), satu visual-centric (Antigravity). Embedding strategy mirrors this:

| Aspek | BGE-M3 (Text) | Qwen3-VL (Visual) |
|-------|:-------------:|:-----------------:|
| **Documents** | ✅ Primary | ❌ |
| **Code** | ✅ Primary | ❌ |
| **Routing** | ✅ Primary | ❌ |
| **Sprint decisions** | ✅ Primary | ❌ |
| **Screenshots** | ❌ | ✅ Primary |
| **Design mockups** | ❌ | ✅ Primary |
| **Visual regression** | ❌ | ✅ Primary |
| **Cross-modal search** | ❌ | ✅ (text query → image results) |

**Keuntungan dual:**
- 90% queries = text → BGE-M3 (fast, CPU, no GPU needed)
- 10% queries = visual → Qwen3-VL (GPU, slower but unique capability)
- Graceful degradation: jika GPU mati → text RAG tetap jalan

### 11.3 Alternatif yang Dipertimbangkan

| Opsi | Pro | Con | Keputusan |
|------|-----|-----|:---------:|
| BGE-M3 only | Ringan, CPU, hybrid search | Buta terhadap visual | ❌ Kurang |
| Qwen3-VL only | Bisa text + visual | Tidak ada sparse/hybrid, lambat untuk text | ❌ Overkill untuk text |
| Qwen3-Embedding + Qwen3-VL | Konsisten ecosystem | Qwen3-Emb tidak punya sparse retrieval | ⚠️ Acceptable |
| **BGE-M3 + Qwen3-VL** | Best of both: hybrid text + multimodal visual | 2 models to maintain | ✅ **Dipilih** |

---

## 12. AGENTS.md — Persona & Identity

### 12.1 Persona

```markdown
# AGENTS.md — FajarClaw v4.0

## Identitas
Nama: FajarClaw
Versi: 4.0
Role: Automatic Digital Programmer — Dual-Engine Architecture
Bahasa: Bahasa Indonesia (code comments) + English (code + technical terms)
Model: Claude Opus 4.6

## Prinsip Kerja
1. Documentation-First: selalu cek dokumen sebelum coding
2. Extend, Don't Duplicate: cari existing code dulu via RAG
3. Quality Gate: setiap output harus melewati guardrails
4. Traceability: setiap fungsi punya @ref ke dokumen sumber
5. Dual-Engine Aware: pilih engine yang tepat untuk task yang tepat

## Chat Commands
/build [task]           → Auto-route ke engine terbaik
/build:cc [task]        → Force Claude Code
/build:ag [task]        → Force Antigravity
/build:dual [task]      → Force kedua engine
/sprint [n] plan        → Sprint planning dengan RAG context
/sprint [n] review      → Sprint review + quality gate
/index [path]           → Re-index file/folder ke Milvus
/index --full           → Full re-index semua collections
/search [query]         → Manual semantic search
/status                 → System health check
/cache clear            → Clear all caches
```

---

## 13. Hardware Requirements & Resource Allocation

### 13.1 Target Hardware

| Komponen | Spesifikasi |
|----------|------------|
| **GPU** | NVIDIA RTX 4090 Laptop — 16GB VRAM |
| **RAM** | 32GB DDR5 |
| **Storage** | 2TB NVMe SSD |
| **CPU** | (any modern 8+ core) |
| **OS** | Ubuntu 24.04 / WSL2 |

### 13.2 VRAM Allocation (16GB)

| Model | VRAM | Bisa CPU? | Loaded |
|-------|:----:|:---------:|:------:|
| Qwen3-VL-Embedding-2B | ~4.5GB | Lambat | Always |
| Qwen3-VL-Reranker-2B | ~4.5GB | Lambat | On-demand |
| BGE-M3 | — | ✅ Primary di CPU | Always (CPU) |
| Qwen3-Reranker-0.6B | — | ✅ Primary di CPU | Always (CPU) |
| **Total GPU** | **~9-11GB** | | |
| **Sisa VRAM** | **~5-7GB** | | Headroom |

**Strategi:** Qwen3-VL models di GPU (wajib). BGE-M3 + Qwen3-Reranker di CPU (cukup cepat).

### 13.3 RAM Allocation (32GB)

| Komponen | RAM | Catatan |
|----------|:---:|---------|
| Milvus Standalone (Docker) | ~3-4GB | 7 collections |
| BGE-M3 (CPU inference) | ~2GB | Always loaded |
| Qwen3-Reranker-0.6B (CPU) | ~1.5GB | Always loaded |
| OpenClaw Gateway + Node.js | ~1-2GB | Background |
| Claude Code CLI | ~0.5GB | On-demand |
| tree-sitter + tooling | ~0.3GB | On-demand |
| OS + Browser + IDE | ~6-8GB | Background |
| **Total** | **~15-18GB** | |
| **Sisa RAM** | **~14-17GB** | Milvus cache + file I/O |

### 13.4 Storage Allocation (2TB NVMe)

| Item | Size | % of Total |
|------|:----:|:----------:|
| All model files | ~12GB | 0.6% |
| Milvus data (all collections) | ~2-5GB | 0.25% |
| Docker images | ~5-10GB | 0.5% |
| Project codebase + 67 docs | ~1GB | 0.05% |
| **Total** | **~25-30GB** | **1.5%** |
| **Free** | **~1,970GB** | **98.5%** |

### 13.5 Verdict

```
VRAM:    ████████████░░░░  69% used — ✅ Comfortable
RAM:     █████████░░░░░░░  56% used — ✅ Plenty headroom
Storage: ░░░░░░░░░░░░░░░░  1.5% used — ✅ Overkill
```

**Laptop ini ideal untuk full FajarClaw stack. Semua 12 komponen RAG + kedua engine bisa jalan bersamaan.**

---

## 14. WF-01 Integration — Dual-Engine Workflow Mapping

### 14.1 Stage-by-Stage Mapping

FajarClaw mengikuti WF-01 Master Workflow Blueprint untuk proyek ITAMS TaxPrime:

| WF-01 Stage | FajarClaw Role | Engine |
|-------------|---------------|--------|
| **Stage 0: Documentation** | RAG indexes 67+ docs, Claude Code validates consistency | CC + RAG |
| **Stage 1: Bootstrap** | CC: CLI setup (Firebase, Git, CI/CD). AG: browser verify | CC + AG |
| **Stage 2: Sprint Cycle** | Full dual-engine per sprint phase (detail below) | DUAL |
| **Stage 3: Hardening** | AG: Lighthouse + visual tests. CC: security scan + optimize | DUAL |
| **Stage 4: Launch** | CC: deploy production. AG: UAT browser testing | DUAL |
| **Stage 5: Post-Launch** | CC: monitoring + bug fixes. AG: visual regression | DUAL |

### 14.2 Sprint Cycle Detail (Stage 2)

```
PLAN (Day 1-2):
├── RAG: auto-retrieve relevant docs untuk sprint stories
├── CC: analyze dependencies, breakdown tasks
├── AG: parallel — prepare component scaffolds
└── Output: task list with doc references + engine assignment

BUILD (Day 3-7):
├── Per task, router assigns engine:
│   ├── Backend task → Claude Code
│   ├── Frontend task → Antigravity
│   └── Full-stack task → Dual (parallel)
├── RAG: inject relevant context per task
├── Guardrails: check every output before commit
└── CC: git commit + PR creation

TEST (Day 8-9):
├── CC: run unit tests + integration tests
├── AG: run Lighthouse + E2E browser tests
├── CC: npm audit + security scan
└── Dual: cross-verify results

GATE (Day 10):
├── RAG: retrieve QG-01 checklist for current phase
├── CC: automated checks (build, lint, test, coverage)
├── AG: visual regression check
└── Output: gate report (PASS / CONDITIONAL / BLOCKED)
```

---

## 15. Implementation Roadmap

### 15.1 Phase Overview

```
Phase 1          Phase 2          Phase 3          Phase 4          Phase 5          Phase 6
MVP Foundation   Text RAG         Precision        Intelligence     Visual RAG       Production
Minggu 1-2       Minggu 3-4       Minggu 5-6       Minggu 7-8       Minggu 9-10      Minggu 11+
                                                                                      
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ 3 Skills │    │ + BGE-M3 │    │+ Reranker│    │+ Query   │    │+ Qwen3-VL│    │+ Eval    │
│ AGENTS.md│───►│ + Milvus │───►│+ Hybrid  │───►│  Transform│──►│+ Visual  │───►│+ Feedback│
│ Keyword  │    │ + Ingest │    │+ Prompt  │    │+ Guard-  │    │  RAG     │    │+ Fine-   │
│ Router   │    │ + Chunk  │    │  Assembly│    │  rails   │    │+ VL-     │    │  tune    │
│          │    │          │    │          │    │+ Cache   │    │  Reranker│    │          │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
                                                                                      
 Eval Gate ─────────────────────────────────── Minggu 4: Opsi B vs Opsi C decision
```

### 15.2 Phase Detail

#### Phase 1: MVP Foundation (Minggu 1-2)

| Task | Output | Effort |
|------|--------|:------:|
| Install OpenClaw + Claude Code | Working gateway | 1 day |
| Implement `fajarclaw-router` (keyword scoring) | Basic routing | 2 days |
| Implement `fajarclaw-claude-code` (SDK wrapper + git) | CC engine | 2 days |
| Implement `fajarclaw-antigravity` (browser + workflows) | AG engine | 2 days |
| Write AGENTS.md + CLAUDE.md | Persona configured | 1 day |
| End-to-end test: `/build` → routed → executed | Working MVP | 2 days |

**Exit Criteria:** `/build "Hello World"` routes correctly and both engines execute.

#### Phase 2: Text RAG (Minggu 3-4)

| Task | Output | Effort |
|------|--------|:------:|
| Setup Milvus (Lite or Docker) | Running instance | 0.5 day |
| Implement ingestion pipeline (file watcher + Git hooks) | Auto-indexing | 2 days |
| Implement smart chunking (markdown + tree-sitter) | Quality chunks | 2 days |
| Setup BGE-M3 (Ollama or FlagEmbedding) | Text embedding | 0.5 day |
| Index 67+ WF-01 documents | `documents` collection populated | 1 day |
| Index codebase | `codebase` collection populated | 1 day |
| Basic retrieval: query → top 5 results | Semantic search working | 1 day |
| Integrate RAG into router | Context-injected routing | 2 days |

**Exit Criteria:** `/build "buat form registrasi"` → auto-retrieves B-07, B-02, existing code.

#### Phase 3: Precision (Minggu 5-6)

| Task | Output | Effort |
|------|--------|:------:|
| Setup Qwen3-Reranker-0.6B | Text reranking | 0.5 day |
| Implement hybrid retrieval (dense + sparse + RRF) | Better recall | 2 days |
| Implement reranker pipeline | +15-30% precision | 1 day |
| Implement prompt assembly (dynamic template) | Optimal context injection | 2 days |
| Test: retrieval quality (Recall@5, NDCG@5) | Baseline metrics | 1 day |

**Exit Criteria:** Recall@5 ≥ 0.80, generated code references correct document sections.

#### Phase 4: Intelligence (Minggu 7-8)

| Task | Output | Effort |
|------|--------|:------:|
| Implement query transformation (expand, HyDE, decompose) | Better retrieval | 2 days |
| Implement guardrails (consistency, dedup, security, traceability) | Quality checks | 3 days |
| Implement caching (L1-L3) | Reduced latency | 1 day |
| Sprint memory: index decisions, retros, bugs | `decisions` collection | 1 day |
| Routing rules collection: seed with patterns | `routes` collection | 1 day |
| **EVALUATION GATE: Opsi B vs Opsi C decision** | Go/No-Go | 1 day |

**Exit Criteria:** Full text RAG pipeline working, latency < 500ms, guardrails catching errors.

#### Phase 5: Visual RAG (Minggu 9-10)

| Task | Output | Effort |
|------|--------|:------:|
| Setup Qwen3-VL-Embedding-2B (GPU) | Visual embedding | 1 day |
| Setup Qwen3-VL-Reranker-2B (GPU) | Visual reranking | 0.5 day |
| Implement screenshot capture → auto-embed | `visual` collection | 2 days |
| Implement visual search: text query → screenshot results | Cross-modal search | 2 days |
| Implement screenshot-to-code: find code for visual component | Code awareness | 2 days |
| Visual regression baseline | `vistests` collection | 1 day |

**Exit Criteria:** Upload mockup → find visually similar existing component.

#### Phase 6: Production (Minggu 11+)

| Task | Output | Effort |
|------|--------|:------:|
| Setup RAGAS evaluation framework | Automated eval | 2 days |
| Create eval set: 50-100 query-answer pairs | Benchmark dataset | 2 days |
| Implement feedback loop (positive/negative signals) | Continuous improvement | 2 days |
| Performance optimization (batch embedding, index tuning) | < 300ms p95 | 2 days |
| Security hardening (access control, data isolation) | Production-safe | 1 day |
| Documentation + demo | Release-ready | 2 days |
| **v4.0 Release** | 🎉 | — |

**Exit Criteria:** All 12 RAG components operational, Recall@5 ≥ 0.85, hallucination < 5%.

---

## 16. Risk Register & Mitigasi

| # | Risk | Probability | Impact | Mitigasi |
|:-:|------|:----------:|:------:|----------|
| R1 | OpenClaw breaking change | Medium | High | Pin version, test before upgrade, evaluation gate |
| R2 | Skills API insufficient for dual-engine | Low | High | Evaluation gate Minggu 4, eskalasi ke thin fork |
| R3 | Claude Code SDK API changes | Medium | Medium | Abstraction layer in `claude-code.ts` |
| R4 | Antigravity IDE not production-ready | Medium | Medium | Fallback ke OpenClaw browser CDP |
| R5 | High token cost (Claude API) | Medium | Medium | Prompt caching, smart routing, cost tracking |
| R6 | GPU memory exceeded | Low | Medium | Load Qwen3-VL models on-demand, not always |
| R7 | RAG retrieval quality insufficient | Medium | High | Iterative tuning, feedback loop, eval metrics |
| R8 | Milvus data corruption | Low | High | Daily backup, version-controlled Milvus data |
| R9 | Multi-hop latency too high | Medium | Medium | Streaming, progress updates, caching |
| R10 | BGE-M3 sparse retrieval inadequate for code | Medium | Medium | Supplement with tree-sitter symbol search |

---

## 17. Evaluation & Success Metrics

### 17.1 Quantitative Metrics

| Metric | Target | Measurement |
|--------|:------:|-------------|
| **RAG Recall@5** | ≥ 0.85 | % relevant docs in top 5 results |
| **RAG NDCG@5** | ≥ 0.80 | Quality of ranking |
| **Faithfulness** | ≥ 0.90 | Output consistent with retrieved context |
| **Hallucination Rate** | < 5% | Info not in context |
| **Retrieval Latency (p95)** | < 500ms | Query → top 5 results |
| **E2E Latency (p95)** | < 8s | Query → full response |
| **Code Compilability** | 100% | Generated code compiles without errors |
| **Routing Accuracy** | ≥ 90% | Correct engine assigned |
| **Duplication Prevention** | ≥ 95% | Detect existing similar code |

### 17.2 Qualitative Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Document Traceability** | Every function has @ref | Code review sample |
| **Sprint Velocity Improvement** | 2-3x baseline | Story points per sprint |
| **Developer Satisfaction** | Positive | User feedback |
| **Consistency with WF-01** | 100% compliance | QG-01 audit pass |

---

## 18. Appendix — Technical Reference

### 18.1 File Structure

```
~/.openclaw/workspace/skills/
├── fajarclaw-router/
│   ├── SKILL.md              # Skill definition
│   ├── router.ts             # Keyword + semantic classification
│   ├── patterns.ts           # Pipeline, parallel, verify patterns
│   └── merger.ts             # Dual-engine result merging
│
├── fajarclaw-claude-code/
│   ├── SKILL.md
│   ├── claude-code.ts        # SDK/CLI wrapper
│   ├── git-flow.ts           # Git automation
│   └── mcp-manager.ts        # MCP server orchestration
│
├── fajarclaw-antigravity/
│   ├── SKILL.md
│   ├── antigravity.ts        # IDE connector + browser control
│   ├── agent-manager.ts      # Multi-agent spawning
│   └── workflow-triggers.ts  # WF-01 workflow proxy
│
└── fajarclaw-rag/
    ├── SKILL.md
    ├── embedder.ts           # BGE-M3 + Qwen3-VL wrapper
    ├── milvus-client.ts      # Milvus connection + CRUD
    ├── indexer.ts            # Document/code ingestion pipeline
    ├── chunker.ts            # Smart chunking (section + AST-aware)
    ├── retriever.ts          # Hybrid retrieval + RRF
    ├── reranker.ts           # Qwen3-Reranker + Qwen3-VL-Reranker
    ├── prompt-builder.ts     # Dynamic prompt assembly
    ├── query-transform.ts    # Expansion, HyDE, decomposition
    ├── guardrails.ts         # Post-generation quality checks
    ├── cache.ts              # Multi-layer caching
    └── evaluator.ts          # RAGAS integration + feedback loop

Project root:
├── AGENTS.md                 # FajarClaw persona + commands
├── CLAUDE.md                 # Persistent codebase context
├── openclaw.json             # Configuration template
└── scripts/
    └── setup.sh              # Automated installation
```

### 18.2 Installation Quick Start

```bash
# 1. Prerequisites
# Node.js ≥22, pnpm, Git, Docker, Chromium

# 2. OpenClaw
npm install -g openclaw@latest
openclaw onboard --install-daemon

# 3. Claude Code
curl -fsSL https://claude.ai/install.sh | bash

# 4. Milvus
pip install pymilvus[model] --break-system-packages  # Milvus Lite
# OR: docker-compose up -d milvus-standalone          # Docker mode

# 5. Embedding Models
pip install FlagEmbedding --break-system-packages     # BGE-M3
# OR: ollama pull bge-m3

pip install transformers torch --break-system-packages # Qwen3-VL
# Download: huggingface-cli download Qwen/Qwen3-VL-Embedding-2B
# Download: huggingface-cli download Qwen/Qwen3-Reranker-0.6B
# Download: huggingface-cli download Qwen/Qwen3-VL-Reranker-2B

# 6. FajarClaw Skills
unzip fajarclaw-skills.zip -d ~/.openclaw/workspace/skills/
cp AGENTS.md ~/.openclaw/workspace/
cp CLAUDE.md ~/.openclaw/workspace/

# 7. Index Documents
openclaw agent --message "/index --full"

# 8. Test
openclaw agent --message "/build Hello World" --thinking high
```

### 18.3 Key Commands Reference

| Command | Fungsi |
|---------|--------|
| `openclaw gateway --port 18789 --verbose` | Start gateway |
| `openclaw agent --message "/build [task]"` | Execute task |
| `/build:cc [task]` | Force Claude Code |
| `/build:ag [task]` | Force Antigravity |
| `/build:dual [task]` | Force dual engine |
| `/sprint [n] plan` | Sprint planning |
| `/sprint [n] review` | Sprint review + gate |
| `/index [path]` | Re-index specific path |
| `/index --full` | Full re-index |
| `/search [query]` | Manual semantic search |
| `/status` | System health check |
| `/cache clear` | Clear all caches |

### 18.4 Model Download Sizes

| Model | Download | Disk (loaded) | Source |
|-------|:--------:|:-------------:|--------|
| BGE-M3 | ~1.2GB | ~2GB RAM | `ollama pull bge-m3` or FlagEmbedding |
| Qwen3-VL-Embedding-2B | ~4.5GB | ~4.5GB VRAM | HuggingFace |
| Qwen3-Reranker-0.6B | ~1.3GB | ~1.5GB RAM | HuggingFace |
| Qwen3-VL-Reranker-2B | ~4.5GB | ~4.5GB VRAM | HuggingFace |
| **Total download** | **~11.5GB** | | |

### 18.5 Environment Variables

```bash
# .env (FajarClaw configuration)
ANTHROPIC_API_KEY=sk-ant-...          # Claude Opus 4.6
OPENCLAW_GATEWAY_PORT=18789
MILVUS_URI=http://localhost:19530      # or "milvus_lite.db" for embedded
BGE_M3_MODEL=BAAI/bge-m3
QWEN_VL_EMB_MODEL=Qwen/Qwen3-VL-Embedding-2B
QWEN_RERANKER_MODEL=Qwen/Qwen3-Reranker-0.6B
QWEN_VL_RERANKER_MODEL=Qwen/Qwen3-VL-Reranker-2B
DEVICE=cuda:0                          # GPU device for Qwen3-VL models
RAG_TOP_K=50                           # Retrieval candidates
RERANK_TOP_K=5                         # Final results after reranking
CACHE_TTL=300                          # Cache TTL in seconds
```

---

## Changelog

| Versi | Tanggal | Perubahan |
|:-----:|---------|-----------|
| 1.0 | 18 Feb 2026 | Initial FajarClaw concept + documentation |
| 2.0 | 18 Feb 2026 | Dual-engine architecture (Claude Code + Antigravity) |
| 3.0 | 18 Feb 2026 | OpenClaw integration + Extension Layer strategy |
| 4.0 | 19 Feb 2026 | Full RAG pipeline (12 komponen) + Model stack + Hardware spec |

---

> *FajarClaw v4.0 — Automatic Digital Programmer System*
> *Bukan AI yang menulis kode. AI yang memahami proyek.*
>
> *"Embed. Retrieve. Rank. Generate. Verify."*
>
> *Project Fajar AM — Februari 2026 | Confidential*
