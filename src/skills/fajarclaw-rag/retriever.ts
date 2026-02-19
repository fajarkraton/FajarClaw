/**
 * FajarClaw RAG — Retriever
 * @ref FC-PRD-01 §10.4 (Retrieval Pipeline)
 *
 * Semantic search + hybrid retrieval across Milvus collections.
 * Builds context for Claude Code / Antigravity prompts.
 */

import { search } from './milvus-client.js';
import { embedSingle } from './embedder.js';

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
}

// === Config ===

const DEFAULT_COLLECTIONS = ['fc_documents', 'fc_codebase'];
const DEFAULT_TOP_K = 5;
const DEFAULT_MIN_SCORE = 0.3;
const DEFAULT_OUTPUT_FIELDS = ['text', 'source', 'section', 'doc_type', 'language', 'symbol', 'chunk_type'];

// === Core Retrieval ===

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
    const seen = new Set<string>();
    const deduped = allResults.filter(r => {
        const key = `${r.source}::${r.section}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    return {
        results: deduped,
        query,
        durationMs: Date.now() - start,
        collectionsSearched: collections.length,
    };
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
        `<rag_context query="${escapeXml(response.query)}" results="${response.results.length}">`,
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
    const lines: string[] = ['Relevant context:'];

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
 * Format retrieval results for display
 */
export function formatRetrievalResults(response: RetrievalResponse): string {
    const lines = [
        `🔍 Retrieval: "${response.query}"`,
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
