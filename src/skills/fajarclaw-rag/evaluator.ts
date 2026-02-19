/**
 * FajarClaw RAG — Evaluator
 * @ref FC-PRD-01 §10.10 (RAG Evaluation)
 *
 * /eval command: run evaluation queries against retrieval pipeline,
 * compute Recall@5, NDCG@5, MRR metrics. Compare baseline vs hybrid.
 *
 * Phase A3: Self-building test + automated evaluation.
 */

import { retrieve, hybridRetrieve, type RetrievalResponse, type HybridRetrieveOptions } from './retriever.js';

// === Types ===

export interface EvalQuery {
    /** Query text */
    query: string;
    /** Expected relevant source files/sections */
    expectedSources: string[];
    /** Category for grouping results */
    category: string;
}

export interface EvalResult {
    query: string;
    category: string;
    /** Sources found in top-K */
    foundSources: string[];
    /** Expected sources */
    expectedSources: string[];
    /** Recall@K: fraction of expected sources found */
    recall: number;
    /** Reciprocal Rank: 1/rank of first relevant result */
    mrr: number;
    /** NDCG@K: normalized discounted cumulative gain */
    ndcg: number;
    /** Duration in ms */
    durationMs: number;
    /** Retrieval mode used */
    mode: string;
}

export interface EvalSummary {
    /** Average Recall@K */
    avgRecall: number;
    /** Average MRR */
    avgMRR: number;
    /** Average NDCG@K */
    avgNDCG: number;
    /** Total queries evaluated */
    totalQueries: number;
    /** Queries with at least one hit */
    queriesWithHits: number;
    /** Total duration in ms */
    totalDurationMs: number;
    /** Per-query results */
    results: EvalResult[];
    /** Retrieval mode */
    mode: string;
}

// === Evaluation Dataset ===

/**
 * 30 evaluation queries covering FajarClaw's domain.
 * Expected sources are file paths or section names that should appear in results.
 */
export const EVAL_DATASET: EvalQuery[] = [
    // Router (5 queries)
    { query: 'How does FajarClaw route tasks to engines?', expectedSources: ['router.ts', 'routeTask'], category: 'router' },
    { query: 'What keywords trigger Claude Code execution?', expectedSources: ['router.ts', 'keywords'], category: 'router' },
    { query: 'How does confidence scoring work in routing?', expectedSources: ['router.ts', 'confidence'], category: 'router' },
    { query: 'What patterns does FajarClaw support for task execution?', expectedSources: ['patterns', 'pipeline', 'parallel'], category: 'router' },
    { query: 'How to add a new routing pattern?', expectedSources: ['router.ts', 'pattern'], category: 'router' },

    // RAG Pipeline (5 queries)
    { query: 'How does the embedding pipeline work?', expectedSources: ['embedder.ts', 'embed'], category: 'rag' },
    { query: 'What collections does Milvus store?', expectedSources: ['collection-schemas', 'milvus'], category: 'rag' },
    { query: 'How does document ingestion work?', expectedSources: ['ingestion', 'chunk'], category: 'rag' },
    { query: 'How does semantic search retrieve context?', expectedSources: ['retriever.ts', 'search'], category: 'rag' },
    { query: 'What is the BGE-M3 embedding model?', expectedSources: ['embedder', 'bge-m3'], category: 'rag' },

    // Hybrid Retrieval (5 queries)
    { query: 'How does hybrid retrieval combine dense and sparse search?', expectedSources: ['retriever.ts', 'hybrid'], category: 'hybrid' },
    { query: 'What is Reciprocal Rank Fusion?', expectedSources: ['retriever.ts', 'rrf', 'fusion'], category: 'hybrid' },
    { query: 'How does the reranker improve search quality?', expectedSources: ['reranker', 'cross-encoder'], category: 'hybrid' },
    { query: 'What is the Qwen3 reranker model?', expectedSources: ['reranker', 'qwen3'], category: 'hybrid' },
    { query: 'How does the prompt builder assemble context?', expectedSources: ['prompt-builder', 'buildPrompt'], category: 'hybrid' },

    // Architecture (5 queries)
    { query: 'What is FajarClaw v4.0 ADPS?', expectedSources: ['README', 'FajarClaw', 'ADPS'], category: 'architecture' },
    { query: 'What are the main skills in FajarClaw?', expectedSources: ['router', 'claude-code', 'antigravity'], category: 'architecture' },
    { query: 'How does the Antigravity bridge work?', expectedSources: ['antigravity', 'bridge'], category: 'architecture' },
    { query: 'What is the Claude Code wrapper skill?', expectedSources: ['claude-code', 'wrapper'], category: 'architecture' },
    { query: 'How is FajarClaw structured as a monorepo?', expectedSources: ['package.json', 'src', 'skills'], category: 'architecture' },

    // Code Operations (5 queries)
    { query: 'How to create a new file with FajarClaw?', expectedSources: ['create', 'file', 'write'], category: 'codeops' },
    { query: 'How does FajarClaw handle TypeScript compilation?', expectedSources: ['tsconfig', 'typescript'], category: 'codeops' },
    { query: 'What testing framework does FajarClaw use?', expectedSources: ['vitest', 'test'], category: 'codeops' },
    { query: 'How does FajarClaw manage dependencies?', expectedSources: ['package.json', 'pnpm'], category: 'codeops' },
    { query: 'How to run the FajarClaw test suite?', expectedSources: ['vitest', 'pnpm test'], category: 'codeops' },

    // Build Plan (5 queries)
    { query: 'What phases are in the FajarClaw master build plan?', expectedSources: ['MasterBuildPlan', 'phase'], category: 'buildplan' },
    { query: 'What was achieved in Phase A1?', expectedSources: ['Phase A1', 'MVP', 'foundation'], category: 'buildplan' },
    { query: 'What is Phase A2 about?', expectedSources: ['Phase A2', 'RAG', 'text'], category: 'buildplan' },
    { query: 'What does Phase A3 precision cover?', expectedSources: ['Phase A3', 'precision', 'hybrid'], category: 'buildplan' },
    { query: 'What is the target for Phase A5?', expectedSources: ['Phase A5', 'visual', 'UI'], category: 'buildplan' },
];

// === Metrics ===

/**
 * Compute Recall@K: fraction of expected sources found in results
 */
export function computeRecall(foundSources: string[], expectedSources: string[]): number {
    if (expectedSources.length === 0) return 1.0;
    let hits = 0;
    for (const expected of expectedSources) {
        const found = foundSources.some(s =>
            s.toLowerCase().includes(expected.toLowerCase())
        );
        if (found) hits++;
    }
    return hits / expectedSources.length;
}

/**
 * Compute MRR: 1/rank of first relevant result
 */
export function computeMRR(foundSources: string[], expectedSources: string[]): number {
    for (let rank = 0; rank < foundSources.length; rank++) {
        const source = foundSources[rank]!;
        const isRelevant = expectedSources.some(e =>
            source.toLowerCase().includes(e.toLowerCase())
        );
        if (isRelevant) return 1 / (rank + 1);
    }
    return 0;
}

/**
 * Compute NDCG@K: normalized discounted cumulative gain
 */
export function computeNDCG(foundSources: string[], expectedSources: string[], k: number = 5): number {
    // DCG: sum relevance_i / log2(i+2)
    let dcg = 0;
    for (let i = 0; i < Math.min(foundSources.length, k); i++) {
        const source = foundSources[i]!;
        const isRelevant = expectedSources.some(e =>
            source.toLowerCase().includes(e.toLowerCase())
        );
        if (isRelevant) {
            dcg += 1.0 / Math.log2(i + 2);
        }
    }

    // Ideal DCG: all relevant results at top
    let idcg = 0;
    const idealHits = Math.min(expectedSources.length, k);
    for (let i = 0; i < idealHits; i++) {
        idcg += 1.0 / Math.log2(i + 2);
    }

    return idcg > 0 ? dcg / idcg : 0;
}

// === Evaluation Runner ===

/**
 * Run a single evaluation query
 */
async function evalSingleQuery(
    evalQuery: EvalQuery,
    mode: 'basic' | 'hybrid',
    topK: number = 5
): Promise<EvalResult> {
    const start = Date.now();

    let response: RetrievalResponse;
    if (mode === 'hybrid') {
        const options: HybridRetrieveOptions = {
            finalTopK: topK,
            topK: topK * 2,
            rerankerCandidates: topK * 4,
            minScore: 0.01,
        };
        response = await hybridRetrieve(evalQuery.query, options);
    } else {
        response = await retrieve(evalQuery.query, { topK, minScore: 0.01 });
    }

    const foundSources = response.results.map(r =>
        `${r.source} ${r.section ?? ''} ${r.text.slice(0, 200)}`
    );

    const recall = computeRecall(foundSources, evalQuery.expectedSources);
    const mrr = computeMRR(foundSources, evalQuery.expectedSources);
    const ndcg = computeNDCG(foundSources, evalQuery.expectedSources, topK);

    return {
        query: evalQuery.query,
        category: evalQuery.category,
        foundSources: response.results.map(r => r.source),
        expectedSources: evalQuery.expectedSources,
        recall,
        mrr,
        ndcg,
        durationMs: Date.now() - start,
        mode: response.mode ?? mode,
    };
}

/**
 * Run full evaluation suite
 */
export async function runEval(
    mode: 'basic' | 'hybrid' = 'hybrid',
    dataset: EvalQuery[] = EVAL_DATASET,
    topK: number = 5
): Promise<EvalSummary> {
    const results: EvalResult[] = [];
    const totalStart = Date.now();

    for (const evalQuery of dataset) {
        try {
            const result = await evalSingleQuery(evalQuery, mode, topK);
            results.push(result);
        } catch {
            // Skip queries that fail (e.g., embedding server down)
            results.push({
                query: evalQuery.query,
                category: evalQuery.category,
                foundSources: [],
                expectedSources: evalQuery.expectedSources,
                recall: 0,
                mrr: 0,
                ndcg: 0,
                durationMs: 0,
                mode: 'error',
            });
        }
    }

    const avgRecall = results.reduce((s, r) => s + r.recall, 0) / results.length;
    const avgMRR = results.reduce((s, r) => s + r.mrr, 0) / results.length;
    const avgNDCG = results.reduce((s, r) => s + r.ndcg, 0) / results.length;
    const queriesWithHits = results.filter(r => r.recall > 0).length;

    return {
        avgRecall,
        avgMRR,
        avgNDCG,
        totalQueries: results.length,
        queriesWithHits,
        totalDurationMs: Date.now() - totalStart,
        results,
        mode,
    };
}

/**
 * Run A/B comparison: basic vs hybrid
 */
export async function runEvalComparison(
    dataset: EvalQuery[] = EVAL_DATASET,
    topK: number = 5
): Promise<{ basic: EvalSummary; hybrid: EvalSummary; delta: Record<string, number> }> {
    const basic = await runEval('basic', dataset, topK);
    const hybrid = await runEval('hybrid', dataset, topK);

    const delta = {
        recallDelta: hybrid.avgRecall - basic.avgRecall,
        mrrDelta: hybrid.avgMRR - basic.avgMRR,
        ndcgDelta: hybrid.avgNDCG - basic.avgNDCG,
        recallImprovement: basic.avgRecall > 0 ? ((hybrid.avgRecall - basic.avgRecall) / basic.avgRecall) * 100 : 0,
        ndcgImprovement: basic.avgNDCG > 0 ? ((hybrid.avgNDCG - basic.avgNDCG) / basic.avgNDCG) * 100 : 0,
    };

    return { basic, hybrid, delta };
}

// === Formatting ===

/**
 * Format evaluation summary for display
 */
export function formatEvalSummary(summary: EvalSummary): string {
    const lines = [
        `📊 RAG Evaluation Report [${summary.mode}]`,
        `${'─'.repeat(50)}`,
        `  Recall@5:  ${(summary.avgRecall * 100).toFixed(1)}%${summary.avgRecall >= 0.80 ? ' ✅' : ' ⚠️'}`,
        `  NDCG@5:   ${(summary.avgNDCG * 100).toFixed(1)}%`,
        `  MRR:      ${(summary.avgMRR * 100).toFixed(1)}%`,
        `  Queries:  ${summary.totalQueries} (${summary.queriesWithHits} with hits)`,
        `  Duration: ${summary.totalDurationMs}ms`,
        '',
    ];

    // Per-category breakdown
    const categories = [...new Set(summary.results.map(r => r.category))];
    lines.push('  Category breakdown:');
    for (const cat of categories) {
        const catResults = summary.results.filter(r => r.category === cat);
        const catRecall = catResults.reduce((s, r) => s + r.recall, 0) / catResults.length;
        const catNDCG = catResults.reduce((s, r) => s + r.ndcg, 0) / catResults.length;
        lines.push(`    ${cat.padEnd(12)} | Recall: ${(catRecall * 100).toFixed(0)}% | NDCG: ${(catNDCG * 100).toFixed(0)}%`);
    }

    return lines.join('\n');
}

/**
 * Format A/B comparison
 */
export function formatEvalComparison(
    basic: EvalSummary,
    hybrid: EvalSummary,
    delta: Record<string, number>
): string {
    const lines = [
        `📊 A/B Evaluation Comparison`,
        `${'═'.repeat(50)}`,
        '',
        `  Metric      | Basic       | Hybrid+RR   | Delta`,
        `  ${'─'.repeat(46)}`,
        `  Recall@5    | ${(basic.avgRecall * 100).toFixed(1).padStart(8)}%  | ${(hybrid.avgRecall * 100).toFixed(1).padStart(8)}%  | ${delta['recallImprovement']!.toFixed(1)}%`,
        `  NDCG@5      | ${(basic.avgNDCG * 100).toFixed(1).padStart(8)}%  | ${(hybrid.avgNDCG * 100).toFixed(1).padStart(8)}%  | ${delta['ndcgImprovement']!.toFixed(1)}%`,
        `  MRR         | ${(basic.avgMRR * 100).toFixed(1).padStart(8)}%  | ${(hybrid.avgMRR * 100).toFixed(1).padStart(8)}%  | ${(delta['mrrDelta']! * 100).toFixed(1)}%`,
        '',
        `  Gate: Recall@5 ≥ 80%: ${hybrid.avgRecall >= 0.80 ? '✅ PASS' : '⚠️ BELOW TARGET'}`,
    ];

    return lines.join('\n');
}
