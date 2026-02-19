---
name: FajarClaw RAG Engine
description: Full 12-component RAG pipeline — embedding, retrieval, reranking, prompt assembly, guardrails
version: 1.0.0
triggers:
  - /index
  - /search
  - /eval
  - /cache
---

# FajarClaw RAG Engine

## Fungsi
Full RAG (Retrieval-Augmented Generation) pipeline dengan 12 komponen:

### Layer 1 — Indexing (Background)
1. **Ingestion Pipeline** — File watcher + Git hooks → auto-index
2. **Smart Chunking** — Section-aware (markdown) + AST-aware (code via tree-sitter)
3. **Dual Embedding** — BGE-M3 (text) + Qwen3-VL (visual)
4. **Vector Indexing** — Milvus: 7 collections

### Layer 2 — Retrieval (Per Query)
5. **Query Transform** — Expansion, HyDE, decomposition
6. **Hybrid Retrieval** — Dense + sparse + metadata filter → RRF fusion
7. **Reranker** — Qwen3-Reranker (text) + Qwen3-VL-Reranker (visual)

### Layer 3 — Generation (Per Response)
8. **Prompt Assembly** — Dynamic template with ranked context
9. **Generation** — Claude Opus 4.6 (shared model)
10. **Guardrails** — Consistency, code standard, duplication, security, traceability

### Layer 4 — Optimization (Continuous)
11. **Cache** — L1 embedding + L2 retrieval + L3 rerank + L4 Claude prompt
12. **Evaluation** — RAGAS framework + feedback loop

## Status
Phase A1: Skill placeholder — implementation begins in Phase A2 (Minggu 3-4)

## Files (Phase A2+)
- `embedder.ts`, `milvus-client.ts`, `indexer.ts`, `chunker.ts`
- `retriever.ts`, `reranker.ts`, `prompt-builder.ts`, `query-transform.ts`
- `guardrails.ts`, `cache.ts`, `evaluator.ts`
