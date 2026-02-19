/**
 * FajarClaw RAG — Reranker Client
 * @ref FC-PRD-01 §10.7 (Cross-Encoder Reranking)
 *
 * TypeScript client for Qwen3-Reranker-0.6B server.
 * Reranks retrieval candidates using cross-encoder scoring.
 */

// === Types ===

export interface RerankCandidate {
    text: string;
    id?: string;
    metadata?: Record<string, unknown>;
}

export interface RankedResult {
    text: string;
    score: number;
    originalIndex: number;
    id?: string;
    metadata?: Record<string, unknown>;
}

export interface RerankResponse {
    ranked: RankedResult[];
    query: string;
    model: string;
    durationMs: number;
}

export interface RerankServerHealth {
    ready: boolean;
    model: string;
    device: string;
    status: string;
}

// === Config ===

let serverUrl = process.env['RERANKER_SERVER_URL'] ?? 'http://localhost:8101';

export function setRerankerUrl(url: string): void {
    serverUrl = url;
}

export function getRerankerUrl(): string {
    return serverUrl;
}

// === Core Functions ===

/**
 * Rerank candidates using cross-encoder scoring.
 *
 * @param query - The search query
 * @param candidates - List of candidate texts to rerank
 * @param topK - Number of top results to return (default: 5)
 */
export async function rerank(
    query: string,
    candidates: RerankCandidate[],
    topK: number = 5
): Promise<RerankResponse> {
    if (candidates.length === 0) {
        return { ranked: [], query, model: 'none', durationMs: 0 };
    }

    const response = await fetch(`${serverUrl}/rerank`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            query,
            candidates: candidates.map(c => ({
                text: c.text,
                id: c.id,
                metadata: c.metadata,
            })),
            top_k: topK,
        }),
        signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
        throw new Error(`Reranker error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as {
        ranked: Array<{
            text: string;
            score: number;
            original_index: number;
            id?: string;
            metadata?: Record<string, unknown>;
        }>;
        query: string;
        model: string;
        duration_ms: number;
    };

    return {
        ranked: data.ranked.map(r => ({
            text: r.text,
            score: r.score,
            originalIndex: r.original_index,
            id: r.id,
            metadata: r.metadata,
        })),
        query: data.query,
        model: data.model,
        durationMs: data.duration_ms,
    };
}

/**
 * Rerank plain text strings (convenience wrapper)
 */
export async function rerankTexts(
    query: string,
    texts: string[],
    topK: number = 5
): Promise<RerankResponse> {
    const candidates = texts.map((text, i) => ({
        text,
        id: String(i),
    }));
    return rerank(query, candidates, topK);
}

// === Health ===

/**
 * Check if reranker server is ready
 */
export async function isRerankerReady(): Promise<boolean> {
    try {
        const health = await getRerankerHealth();
        return health.ready;
    } catch {
        return false;
    }
}

/**
 * Get reranker server health details
 */
export async function getRerankerHealth(): Promise<RerankServerHealth> {
    const response = await fetch(`${serverUrl}/health`, {
        signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
        throw new Error(`Reranker health check failed: ${response.status}`);
    }

    return await response.json() as RerankServerHealth;
}

/**
 * Format reranker status for display
 */
export async function formatRerankerStatus(): Promise<string> {
    try {
        const health = await getRerankerHealth();
        const icon = health.ready ? '🟢' : '🟡';
        return `${icon} Reranker: ${health.model} on ${health.device} (${health.status})`;
    } catch {
        return '🔴 Reranker: server not reachable';
    }
}
