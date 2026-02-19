/**
 * FajarClaw RAG — Retriever
 * @ref FC-PRD-01 §10.4 (Retrieval Pipeline)
 *
 * Semantic search + hybrid retrieval across Milvus collections.
 * Builds context for Claude Code / Antigravity prompts.
 *
 * Phase A3 additions:
 * - Sparse search via BGE-M3 sparse vectors
 * - Reciprocal Rank Fusion (RRF) for hybrid scoring
 * - Reranker pipeline (Qwen3-Reranker-0.6B)
 */

import { search, sparseSearch } from './milvus-client.js';
import { embedSingle } from './embedder.js';
import { rerank, isRerankerReady, type RerankCandidate } from './reranker.js';

// === Types ===

export interface RetrieveOptions {
    /** Collections to search (default: fc_documents + fc_codebase) */
    collections?: string[];
    /** Max results per collection (default: 5) */
    topK?: number;
    /** Min similarity score 0-1 (default: 0.3) */
    minScore?: number;
    /** Filter by source file */
    sourceFilter?: string;
    /** Filter by doc_type */
    docTypeFilter?: string;
    /** Output fields to return */
    outputFields?: string[];
}

export interface HybridRetrieveOptions extends RetrieveOptions {
    /** RRF constant k (default: 60) */
    rrfK?: number;
    /** Number of candidates to pass to reranker (default: 20) */
    rerankerCandidates?: number;
    /** Final top-K after reranking (default: 5) */
    finalTopK?: number;
    /** Use reranker if available (default: true) */
    useReranker?: boolean;
    /** Use sparse search (default: true) */
    useSparse?: boolean;
}

export interface RetrievalResult {
    /** Matched text */
    text: string;
    /** Source file path */
    source: string;
    /** Similarity score (0-1) */
    score: number;
    /** Section or symbol name */
    section?: string;
    /** Collection it came from */
    collection: string;
    /** Additional metadata */
    metadata: Record<string, unknown>;
}

export interface RetrievalResponse {
    /** Ranked results across all collections */
    results: RetrievalResult[];
    /** Original query */
    query: string;
    /** Total duration in ms */
    durationMs: number;
    /** Number of collections searched */
    collectionsSearched: number;
    /** Retrieval mode used */
    mode?: 'dense' | 'hybrid' | 'hybrid+reranker';
}

// === Config ===

const DEFAULT_COLLECTIONS = ['fc_documents', 'fc_codebase'];
const DEFAULT_TOP_K = 5;
const DEFAULT_MIN_SCORE = 0.3;
const DEFAULT_OUTPUT_FIELDS = ['text', 'source', 'section', 'doc_type', 'language', 'symbol', 'chunk_type'];
const SPARSE_COLLECTIONS = new Set(['fc_documents', 'fc_codebase']);

// === Core Retrieval (Dense only — Phase A2 compatible) ===

/**
 * Retrieve relevant context for a query.
 * Pipeline: query → embed → search (multi-collection) → rank → format
 */
export async function retrieve(
    query: string,
    options?: RetrieveOptions
): Promise<RetrievalResponse> {
    const start = Date.now();
    const collections = options?.collections ?? DEFAULT_COLLECTIONS;
    const topK = options?.topK ?? DEFAULT_TOP_K;
    const minScore = options?.minScore ?? DEFAULT_MIN_SCORE;
    const outputFields = options?.outputFields ?? DEFAULT_OUTPUT_FIELDS;

    // Step 1: Embed query
    const embedding = await embedSingle(query);

    // Step 2: Search each collection
    const allResults: RetrievalResult[] = [];

    for (const collection of collections) {
        try {
            const raw = await search({
                collection,
                vector: embedding.dense,
                topK,
                outputFields,
                filter: buildFilter(options),
            });

            for (const hit of raw) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const record = hit as any;
                const score = typeof record.score === 'number' ? record.score : 0;
                if (score < minScore) continue;

                allResults.push({
                    text: String(record.text ?? ''),
                    source: String(record.source ?? ''),
                    score,
                    section: String(record.section ?? record.symbol ?? ''),
                    collection,
                    metadata: { ...record },
                });
            }
        } catch {
            // Collection might not exist yet — skip silently
        }
    }

    // Step 3: Sort by score (descending)
    allResults.sort((a, b) => b.score - a.score);

    // Step 4: Deduplicate by source+section
    const deduped = deduplicateResults(allResults);

    return {
        results: deduped,
        query,
        durationMs: Date.now() - start,
        collectionsSearched: collections.length,
        mode: 'dense',
    };
}

// === Hybrid Retrieval (Phase A3) ===

/**
 * Hybrid retrieval: dense + sparse + RRF + reranker
 *
 * Pipeline:
 *   1. Embed query → dense vector + sparse vector
 *   2. Dense search (BGE-M3 dense) across collections
 *   3. Sparse search (BGE-M3 sparse) across collections (if available)
 *   4. RRF fusion: combine rankings from dense + sparse
 *   5. Reranker: cross-encoder scoring on top candidates
 *   6. Return final top-K results
 *
 * @ref FC-PRD-01 §10.7 (Hybrid Retrieval)
 */
export async function hybridRetrieve(
    query: string,
    options?: HybridRetrieveOptions
): Promise<RetrievalResponse> {
    const start = Date.now();
    const collections = options?.collections ?? DEFAULT_COLLECTIONS;
    const topK = options?.topK ?? 10;
    const minScore = options?.minScore ?? DEFAULT_MIN_SCORE;
    const outputFields = options?.outputFields ?? DEFAULT_OUTPUT_FIELDS;
    const rrfK = options?.rrfK ?? 60;
    const rerankerCandidates = options?.rerankerCandidates ?? 20;
    const finalTopK = options?.finalTopK ?? 5;
    const useReranker = options?.useReranker ?? true;
    const useSparse = options?.useSparse ?? true;
    const filter = buildFilter(options);

    // Step 1: Embed query (both dense and sparse)
    const embedding = await embedSingle(query);

    // Step 2: Dense search across collections
    const denseResults: RetrievalResult[] = [];
    for (const collection of collections) {
        try {
            const raw = await search({
                collection,
                vector: embedding.dense,
                topK,
                outputFields,
                filter,
            });
            for (const hit of raw) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const record = hit as any;
                const score = typeof record.score === 'number' ? record.score : 0;
                denseResults.push({
                    text: String(record.text ?? ''),
                    source: String(record.source ?? ''),
                    score,
                    section: String(record.section ?? record.symbol ?? ''),
                    collection,
                    metadata: { ...record },
                });
            }
        } catch {
            // skip
        }
    }

    // Step 3: Sparse search across collections (only for collections with sparse_vector)
    const sparseResults: RetrievalResult[] = [];
    if (useSparse && embedding.sparse && Object.keys(embedding.sparse).length > 0) {
        for (const collection of collections) {
            if (!SPARSE_COLLECTIONS.has(collection)) continue;
            try {
                const raw = await sparseSearch({
                    collection,
                    sparseVector: embedding.sparse,
                    topK,
                    outputFields,
                    filter,
                });
                for (const hit of raw) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const record = hit as any;
                    const score = typeof record.score === 'number' ? record.score : 0;
                    sparseResults.push({
                        text: String(record.text ?? ''),
                        source: String(record.source ?? ''),
                        score,
                        section: String(record.section ?? record.symbol ?? ''),
                        collection,
                        metadata: { ...record },
                    });
                }
            } catch {
                // sparse not available for this collection — skip
            }
        }
    }

    // Step 4: RRF Fusion
    let fused: RetrievalResult[];
    if (sparseResults.length > 0) {
        fused = rrfFusion(denseResults, sparseResults, rrfK);
    } else {
        // Fallback to dense-only ranking
        denseResults.sort((a, b) => b.score - a.score);
        fused = denseResults;
    }

    // Filter by min score
    fused = fused.filter(r => r.score >= minScore);

    // Deduplicate
    fused = deduplicateResults(fused);

    // Take top candidates for reranking
    const candidates = fused.slice(0, rerankerCandidates);

    // Step 5: Reranker (if available)
    let mode: RetrievalResponse['mode'] = sparseResults.length > 0 ? 'hybrid' : 'dense';

    if (useReranker && candidates.length > 1) {
        try {
            const rerankerUp = await isRerankerReady();
            if (rerankerUp) {
                const rerankCandidates: RerankCandidate[] = candidates.map((r, i) => ({
                    text: r.text,
                    id: String(i),
                    metadata: { source: r.source, section: r.section, collection: r.collection },
                }));

                const reranked = await rerank(query, rerankCandidates, finalTopK);

                // Map back to RetrievalResult with reranker scores
                const rerankedResults: RetrievalResult[] = reranked.ranked.map(ranked => {
                    const original = candidates[ranked.originalIndex]!;
                    return {
                        ...original,
                        score: ranked.score,
                    };
                });

                mode = 'hybrid+reranker';

                return {
                    results: rerankedResults,
                    query,
                    durationMs: Date.now() - start,
                    collectionsSearched: collections.length,
                    mode,
                };
            }
        } catch {
            // Reranker failed — fallback to RRF results
        }
    }

    return {
        results: candidates.slice(0, finalTopK),
        query,
        durationMs: Date.now() - start,
        collectionsSearched: collections.length,
        mode,
    };
}

// === RRF Fusion ===

/**
 * Reciprocal Rank Fusion (RRF)
 *
 * Combines rankings from multiple retrieval methods:
 * score(doc) = Σ 1/(k + rank_i)
 *
 * @param denseResults - Results from dense retrieval (ranked)
 * @param sparseResults - Results from sparse retrieval (ranked)
 * @param k - RRF constant (default: 60)
 */
export function rrfFusion(
    denseResults: RetrievalResult[],
    sparseResults: RetrievalResult[],
    k: number = 60
): RetrievalResult[] {
    const scoreMap = new Map<string, { result: RetrievalResult; rrfScore: number }>();

    // Helper to create unique key per result
    const getKey = (r: RetrievalResult) => `${r.source}::${r.section ?? ''}::${r.text.slice(0, 100)}`;

    // Score dense results
    const sortedDense = [...denseResults].sort((a, b) => b.score - a.score);
    for (let rank = 0; rank < sortedDense.length; rank++) {
        const r = sortedDense[rank]!;
        const key = getKey(r);
        const rrfScore = 1 / (k + rank + 1);
        const existing = scoreMap.get(key);
        if (existing) {
            existing.rrfScore += rrfScore;
        } else {
            scoreMap.set(key, { result: r, rrfScore });
        }
    }

    // Score sparse results
    const sortedSparse = [...sparseResults].sort((a, b) => b.score - a.score);
    for (let rank = 0; rank < sortedSparse.length; rank++) {
        const r = sortedSparse[rank]!;
        const key = getKey(r);
        const rrfScore = 1 / (k + rank + 1);
        const existing = scoreMap.get(key);
        if (existing) {
            existing.rrfScore += rrfScore;
        } else {
            scoreMap.set(key, { result: r, rrfScore });
        }
    }

    // Sort by RRF score descending
    const fused = Array.from(scoreMap.values())
        .sort((a, b) => b.rrfScore - a.rrfScore)
        .map(({ result, rrfScore }) => ({
            ...result,
            score: rrfScore,
        }));

    return fused;
}

/**
 * Retrieve from a single collection
 */
export async function retrieveFrom(
    query: string,
    collection: string,
    options?: Omit<RetrieveOptions, 'collections'>
): Promise<RetrievalResponse> {
    return retrieve(query, { ...options, collections: [collection] });
}

// === A/B Comparison ===

/**
 * Compare basic retrieval vs hybrid+reranker retrieval
 */
export async function compareRetrieval(
    query: string,
    options?: RetrieveOptions
): Promise<{ basic: RetrievalResponse; hybrid: RetrievalResponse }> {
    const [basic, hybrid] = await Promise.all([
        retrieve(query, options),
        hybridRetrieve(query, { ...options, useReranker: true }),
    ]);
    return { basic, hybrid };
}

// === Context Building ===

/**
 * Build a formatted context string from retrieval results.
 * Used to inject into Claude Code / Antigravity prompts.
 *
 * @ref FC-PRD-01 §10.5 (Context Injection)
 */
export function buildContext(response: RetrievalResponse): string {
    if (response.results.length === 0) {
        return '';
    }

    const lines: string[] = [
        `<rag_context query="${escapeXml(response.query)}" results="${response.results.length}" mode="${response.mode ?? 'dense'}">`,
    ];

    for (const result of response.results) {
        lines.push(`<result source="${escapeXml(result.source)}" score="${result.score.toFixed(3)}" collection="${result.collection}">`);
        lines.push(result.text);
        lines.push('</result>');
    }

    lines.push('</rag_context>');
    return lines.join('\n');
}

/**
 * Build a concise context summary (shorter, for token-constrained prompts)
 */
export function buildContextSummary(response: RetrievalResponse, maxResults: number = 3): string {
    if (response.results.length === 0) {
        return '(no relevant context found)';
    }

    const top = response.results.slice(0, maxResults);
    const lines: string[] = [`Relevant context (${response.mode ?? 'dense'}):`];

    for (const r of top) {
        const source = r.source.split('/').pop() ?? r.source;
        const preview = r.text.slice(0, 200).replace(/\n/g, ' ');
        lines.push(`- [${source}] (${(r.score * 100).toFixed(0)}%) ${preview}...`);
    }

    return lines.join('\n');
}

// === Utility Functions ===

/**
 * Build Milvus filter expression from options
 */
function buildFilter(options?: RetrieveOptions): string | undefined {
    const conditions: string[] = [];

    if (options?.sourceFilter) {
        conditions.push(`source like "%${options.sourceFilter}%"`);
    }

    if (options?.docTypeFilter) {
        conditions.push(`doc_type == "${options.docTypeFilter}"`);
    }

    return conditions.length > 0 ? conditions.join(' && ') : undefined;
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Deduplicate results by source+section
 */
function deduplicateResults(results: RetrievalResult[]): RetrievalResult[] {
    const seen = new Set<string>();
    return results.filter(r => {
        const key = `${r.source}::${r.section}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

/**
 * Format retrieval results for display
 */
export function formatRetrievalResults(response: RetrievalResponse): string {
    const lines = [
        `🔍 Retrieval: "${response.query}" [${response.mode ?? 'dense'}]`,
        `  📊 Results: ${response.results.length} (from ${response.collectionsSearched} collections)`,
        `  ⏱️  Duration: ${response.durationMs}ms`,
        '',
    ];

    for (let i = 0; i < response.results.length; i++) {
        const r = response.results[i]!;
        const source = r.source.split('/').pop() ?? r.source;
        lines.push(`  ${i + 1}. [${(r.score * 100).toFixed(0)}%] ${source} — ${r.section}`);
    }

    return lines.join('\n');
}
