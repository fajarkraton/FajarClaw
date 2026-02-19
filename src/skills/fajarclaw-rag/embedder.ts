/**
 * FajarClaw RAG — Embedder TypeScript Wrapper
 * @ref FC-PRD-01 §10.3 (Embedding Pipeline)
 *
 * TypeScript client for the Python BGE-M3 embedding server.
 * Calls http://localhost:8100/embed to get dense+sparse vectors.
 */

// === Types ===

export interface EmbedOptions {
    /** Texts to embed */
    texts: string[];
    /** Return sparse vectors (default: true) */
    returnSparse?: boolean;
}

export interface EmbedResult {
    /** Dense vector (1024d) */
    dense: number[];
    /** Sparse vector as {token_id: weight} */
    sparse?: Record<number, number>;
}

export interface EmbedResponse {
    results: EmbedResult[];
    model: string;
    durationMs: number;
}

export interface EmbedServerHealth {
    status: string;
    model: string;
    device: string;
    ready: boolean;
}

// === Config ===

const DEFAULT_BASE_URL = 'http://localhost:8100';

let _baseUrl = process.env['EMBEDDING_SERVER_URL'] ?? DEFAULT_BASE_URL;

/**
 * Set embedding server base URL
 */
export function setServerUrl(url: string): void {
    _baseUrl = url;
}

/**
 * Get current embedding server URL
 */
export function getServerUrl(): string {
    return _baseUrl;
}

// === Health Check ===

/**
 * Check if embedding server is running and ready
 */
export async function isServerReady(): Promise<boolean> {
    try {
        const health = await getHealth();
        return health.ready;
    } catch {
        return false;
    }
}

/**
 * Get server health details
 */
export async function getHealth(): Promise<EmbedServerHealth> {
    const response = await fetch(`${_baseUrl}/health`, {
        signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
    }

    return response.json() as Promise<EmbedServerHealth>;
}

// === Embedding ===

/**
 * Embed texts via BGE-M3 server
 * Returns dense (1024d) + optionally sparse vectors
 *
 * @ref FC-PRD-01 §10.3 (Dual Embedding)
 */
export async function embed(options: EmbedOptions): Promise<EmbedResponse> {
    const { texts, returnSparse = true } = options;

    if (texts.length === 0) {
        return { results: [], model: 'none', durationMs: 0 };
    }

    const response = await fetch(`${_baseUrl}/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            texts,
            return_sparse: returnSparse,
        }),
        signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Embedding failed (${response.status}): ${errorText}`);
    }

    const data = await response.json() as {
        results: Array<{ dense: number[]; sparse?: Record<string, number> }>;
        model: string;
        duration_ms: number;
    };

    return {
        results: data.results.map(r => ({
            dense: r.dense,
            sparse: r.sparse
                ? Object.fromEntries(
                    Object.entries(r.sparse).map(([k, v]) => [Number(k), v])
                )
                : undefined,
        })),
        model: data.model,
        durationMs: data.duration_ms,
    };
}

/**
 * Embed a single text — convenience wrapper
 */
export async function embedSingle(text: string): Promise<EmbedResult> {
    const response = await embed({ texts: [text] });
    if (response.results.length === 0) {
        throw new Error('No embedding result returned');
    }
    return response.results[0]!;
}

/**
 * Embed texts in batches to avoid overwhelming the server
 */
export async function embedBatch(
    texts: string[],
    batchSize: number = 32
): Promise<EmbedResult[]> {
    const results: EmbedResult[] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const response = await embed({ texts: batch });
        results.push(...response.results);
    }

    return results;
}

/**
 * Format embedding server status
 */
export async function formatEmbedStatus(): Promise<string> {
    try {
        const health = await getHealth();
        const icon = health.ready ? '🟢' : '🟡';
        return `${icon} Embedding: ${health.model} on ${health.device} (${health.status})`;
    } catch {
        return '🔴 Embedding: server not reachable';
    }
}
