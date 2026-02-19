/**
 * FajarClaw RAG — Caching System
 * @ref FC-PRD-01 §10.8 (Caching)
 *
 * 3-layer cache for RAG pipeline latency reduction:
 * - L1: Embedding cache (SHA256 → vector, LRU)
 * - L2: Retrieval cache (query hash → results, TTL)
 * - L3: Rerank cache (query+candidates hash → ranked, TTL)
 *
 * Phase A4: Intelligence Layer
 */

import { createHash } from 'crypto';

// === Types ===

export interface CacheEntry<T> {
    /** Cached value */
    value: T;
    /** When this entry was created */
    createdAt: number;
    /** Number of times this entry was accessed */
    hits: number;
}

export interface CacheStats {
    /** Cache layer name */
    layer: string;
    /** Current number of entries */
    size: number;
    /** Maximum capacity */
    maxSize: number;
    /** Total cache hits */
    totalHits: number;
    /** Total cache misses */
    totalMisses: number;
    /** Hit rate (0-1) */
    hitRate: number;
    /** TTL in ms (0 = no TTL) */
    ttlMs: number;
}

export interface AllCacheStats {
    l1Embedding: CacheStats;
    l2Retrieval: CacheStats;
    l3Rerank: CacheStats;
    /** Total memory estimate in bytes */
    estimatedMemoryBytes: number;
}

// === LRU Cache Implementation ===

/**
 * Generic LRU cache with optional TTL.
 * Uses Map insertion order for LRU eviction.
 */
export class LRUCache<T> {
    private cache = new Map<string, CacheEntry<T>>();
    private readonly maxSize: number;
    private readonly ttlMs: number;
    private totalHits = 0;
    private totalMisses = 0;

    constructor(maxSize: number, ttlMs: number = 0) {
        this.maxSize = maxSize;
        this.ttlMs = ttlMs;
    }

    /**
     * Get a value from cache. Returns undefined on miss or TTL expiry.
     */
    get(key: string): T | undefined {
        const entry = this.cache.get(key);

        if (!entry) {
            this.totalMisses++;
            return undefined;
        }

        // Check TTL
        if (this.ttlMs > 0 && Date.now() - entry.createdAt > this.ttlMs) {
            this.cache.delete(key);
            this.totalMisses++;
            return undefined;
        }

        // Move to end (most recently used)
        this.cache.delete(key);
        entry.hits++;
        this.cache.set(key, entry);
        this.totalHits++;

        return entry.value;
    }

    /**
     * Set a value in cache. Evicts LRU entry if at capacity.
     */
    set(key: string, value: T): void {
        // Delete existing entry to refresh position
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }

        // Evict LRU (first entry in Map) if at capacity
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey !== undefined) {
                this.cache.delete(firstKey);
            }
        }

        this.cache.set(key, {
            value,
            createdAt: Date.now(),
            hits: 0,
        });
    }

    /**
     * Check if key exists (and is not expired)
     */
    has(key: string): boolean {
        const entry = this.cache.get(key);
        if (!entry) return false;
        if (this.ttlMs > 0 && Date.now() - entry.createdAt > this.ttlMs) {
            this.cache.delete(key);
            return false;
        }
        return true;
    }

    /**
     * Delete a specific key
     */
    delete(key: string): boolean {
        return this.cache.delete(key);
    }

    /**
     * Clear all entries
     */
    clear(): void {
        this.cache.clear();
        this.totalHits = 0;
        this.totalMisses = 0;
    }

    /**
     * Get cache statistics
     */
    getStats(layer: string): CacheStats {
        const total = this.totalHits + this.totalMisses;
        return {
            layer,
            size: this.cache.size,
            maxSize: this.maxSize,
            totalHits: this.totalHits,
            totalMisses: this.totalMisses,
            hitRate: total > 0 ? this.totalHits / total : 0,
            ttlMs: this.ttlMs,
        };
    }

    /** Current cache size */
    get size(): number {
        return this.cache.size;
    }
}

// === Cache Instances ===

/** L1: Embedding cache — SHA256(text) → dense vector. LRU 10K, no TTL. */
const l1EmbeddingCache = new LRUCache<number[]>(10_000, 0);

/** L2: Retrieval cache — SHA256(query+options) → results. LRU 1K, TTL 5min. */
const l2RetrievalCache = new LRUCache<unknown>(1_000, 5 * 60 * 1000);

/** L3: Rerank cache — SHA256(query+candidates) → ranked. LRU 500, TTL 5min. */
const l3RerankCache = new LRUCache<unknown>(500, 5 * 60 * 1000);

// === Hash Helpers ===

/**
 * Create a SHA256 hash of the input string
 */
export function hashKey(input: string): string {
    return createHash('sha256').update(input).digest('hex').slice(0, 16);
}

/**
 * Create a cache key from query + options
 */
export function makeCacheKey(parts: unknown[]): string {
    const serialized = JSON.stringify(parts);
    return hashKey(serialized);
}

// === Public API ===

// --- L1: Embedding Cache ---

/**
 * Get cached embedding vector
 */
export function getCachedEmbedding(text: string): number[] | undefined {
    const key = hashKey(text);
    return l1EmbeddingCache.get(key);
}

/**
 * Store embedding vector in cache
 */
export function setCachedEmbedding(text: string, vector: number[]): void {
    const key = hashKey(text);
    l1EmbeddingCache.set(key, vector);
}

// --- L2: Retrieval Cache ---

/**
 * Get cached retrieval results
 */
export function getCachedRetrieval<T>(query: string, options?: unknown): T | undefined {
    const key = makeCacheKey([query, options]);
    return l2RetrievalCache.get(key) as T | undefined;
}

/**
 * Store retrieval results in cache
 */
export function setCachedRetrieval(query: string, options: unknown, results: unknown): void {
    const key = makeCacheKey([query, options]);
    l2RetrievalCache.set(key, results);
}

// --- L3: Rerank Cache ---

/**
 * Get cached rerank results
 */
export function getCachedRerank<T>(query: string, candidateIds: string[]): T | undefined {
    const key = makeCacheKey([query, ...candidateIds]);
    return l3RerankCache.get(key) as T | undefined;
}

/**
 * Store rerank results in cache
 */
export function setCachedRerank(query: string, candidateIds: string[], ranked: unknown): void {
    const key = makeCacheKey([query, ...candidateIds]);
    l3RerankCache.set(key, ranked);
}

// --- Cache Management ---

/**
 * Clear all caches (e.g., after /index or git commit)
 */
export function clearAllCaches(): void {
    l1EmbeddingCache.clear();
    l2RetrievalCache.clear();
    l3RerankCache.clear();
}

/**
 * Clear specific cache layer
 */
export function clearCache(layer: 'l1' | 'l2' | 'l3'): void {
    switch (layer) {
        case 'l1': l1EmbeddingCache.clear(); break;
        case 'l2': l2RetrievalCache.clear(); break;
        case 'l3': l3RerankCache.clear(); break;
    }
}

/**
 * Get statistics for all cache layers
 */
export function getCacheStats(): AllCacheStats {
    const l1 = l1EmbeddingCache.getStats('L1:Embedding');
    const l2 = l2RetrievalCache.getStats('L2:Retrieval');
    const l3 = l3RerankCache.getStats('L3:Rerank');

    // Rough memory estimate: 1024 floats × 4 bytes per embedding + overhead
    const estimatedMemoryBytes =
        l1.size * (1024 * 4 + 100) +   // L1: vectors
        l2.size * 2000 +                 // L2: result objects
        l3.size * 1000;                  // L3: ranked lists

    return { l1Embedding: l1, l2Retrieval: l2, l3Rerank: l3, estimatedMemoryBytes };
}

/**
 * Format cache stats for display
 */
export function formatCacheStats(stats?: AllCacheStats): string {
    const s = stats ?? getCacheStats();
    const memMB = (s.estimatedMemoryBytes / (1024 * 1024)).toFixed(1);

    const lines = [
        `📦 RAG Cache Status (${memMB} MB est.)`,
        `${'─'.repeat(45)}`,
    ];

    for (const layer of [s.l1Embedding, s.l2Retrieval, s.l3Rerank]) {
        const hitPct = (layer.hitRate * 100).toFixed(0);
        const ttl = layer.ttlMs > 0 ? `TTL ${layer.ttlMs / 1000}s` : 'no TTL';
        lines.push(
            `  ${layer.layer.padEnd(15)} ${String(layer.size).padStart(5)}/${layer.maxSize} | ${hitPct}% hit | ${ttl}`
        );
    }

    return lines.join('\n');
}

// Export the LRUCache class for direct usage/testing
export { LRUCache as RAGCache };
