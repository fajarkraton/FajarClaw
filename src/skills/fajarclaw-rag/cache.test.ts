/**
 * FajarClaw RAG — Cache Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    LRUCache,
    hashKey,
    makeCacheKey,
    getCachedEmbedding,
    setCachedEmbedding,
    getCachedRetrieval,
    setCachedRetrieval,
    getCachedRerank,
    setCachedRerank,
    clearAllCaches,
    clearCache,
    getCacheStats,
    formatCacheStats,
} from './cache.js';

// === LRU Cache Core Tests ===

describe('LRUCache', () => {
    let cache: LRUCache<string>;

    beforeEach(() => {
        cache = new LRUCache<string>(3, 0); // max 3, no TTL
    });

    it('harus store and retrieve values', () => {
        cache.set('a', 'hello');
        expect(cache.get('a')).toBe('hello');
    });

    it('harus return undefined for missing keys', () => {
        expect(cache.get('missing')).toBeUndefined();
    });

    it('harus evict LRU entry when at capacity', () => {
        cache.set('a', '1');
        cache.set('b', '2');
        cache.set('c', '3');
        cache.set('d', '4'); // should evict 'a'

        expect(cache.get('a')).toBeUndefined();
        expect(cache.get('d')).toBe('4');
        expect(cache.size).toBe(3);
    });

    it('harus refresh position on get (LRU)', () => {
        cache.set('a', '1');
        cache.set('b', '2');
        cache.set('c', '3');
        cache.get('a'); // refresh 'a' — 'b' is now LRU
        cache.set('d', '4'); // should evict 'b'

        expect(cache.get('a')).toBe('1');
        expect(cache.get('b')).toBeUndefined();
    });

    it('harus support has()', () => {
        cache.set('a', '1');
        expect(cache.has('a')).toBe(true);
        expect(cache.has('b')).toBe(false);
    });

    it('harus support delete()', () => {
        cache.set('a', '1');
        expect(cache.delete('a')).toBe(true);
        expect(cache.get('a')).toBeUndefined();
    });

    it('harus clear all entries', () => {
        cache.set('a', '1');
        cache.set('b', '2');
        cache.clear();
        expect(cache.size).toBe(0);
        expect(cache.get('a')).toBeUndefined();
    });

    it('harus track hit/miss stats', () => {
        cache.set('a', '1');
        cache.get('a'); // hit
        cache.get('a'); // hit
        cache.get('b'); // miss

        const stats = cache.getStats('test');
        expect(stats.totalHits).toBe(2);
        expect(stats.totalMisses).toBe(1);
        expect(stats.hitRate).toBeCloseTo(2 / 3, 2);
    });
});

describe('LRUCache TTL', () => {
    it('harus expire entries after TTL', async () => {
        const cache = new LRUCache<string>(10, 50); // 50ms TTL

        cache.set('a', 'value');
        expect(cache.get('a')).toBe('value');

        // Wait for TTL to expire
        await new Promise(r => setTimeout(r, 60));

        expect(cache.get('a')).toBeUndefined();
    });

    it('harus not expire entries before TTL', () => {
        const cache = new LRUCache<string>(10, 10_000); // 10s TTL
        cache.set('a', 'value');
        expect(cache.get('a')).toBe('value');
    });
});

// === Hash Tests ===

describe('hashKey', () => {
    it('harus return consistent hash', () => {
        const h1 = hashKey('test input');
        const h2 = hashKey('test input');
        expect(h1).toBe(h2);
    });

    it('harus return different hash for different input', () => {
        const h1 = hashKey('input A');
        const h2 = hashKey('input B');
        expect(h1).not.toBe(h2);
    });

    it('harus return 16-char hex string', () => {
        const h = hashKey('test');
        expect(h.length).toBe(16);
        expect(/^[0-9a-f]+$/.test(h)).toBe(true);
    });
});

describe('makeCacheKey', () => {
    it('harus create key from parts', () => {
        const key = makeCacheKey(['query', { topK: 5 }]);
        expect(key.length).toBe(16);
    });

    it('harus be deterministic', () => {
        const k1 = makeCacheKey(['a', 'b']);
        const k2 = makeCacheKey(['a', 'b']);
        expect(k1).toBe(k2);
    });
});

// === L1/L2/L3 API Tests ===

describe('L1: Embedding Cache', () => {
    beforeEach(() => clearAllCaches());

    it('harus cache and retrieve embeddings', () => {
        const vector = [0.1, 0.2, 0.3];
        setCachedEmbedding('test text', vector);
        const cached = getCachedEmbedding('test text');
        expect(cached).toEqual(vector);
    });

    it('harus return undefined for uncached text', () => {
        expect(getCachedEmbedding('not cached')).toBeUndefined();
    });
});

describe('L2: Retrieval Cache', () => {
    beforeEach(() => clearAllCaches());

    it('harus cache and retrieve results', () => {
        const results = [{ text: 'result1', score: 0.9 }];
        setCachedRetrieval('query', { topK: 5 }, results);
        const cached = getCachedRetrieval('query', { topK: 5 });
        expect(cached).toEqual(results);
    });

    it('harus miss for different options', () => {
        setCachedRetrieval('query', { topK: 5 }, []);
        const cached = getCachedRetrieval('query', { topK: 10 });
        expect(cached).toBeUndefined();
    });
});

describe('L3: Rerank Cache', () => {
    beforeEach(() => clearAllCaches());

    it('harus cache and retrieve rerank results', () => {
        const ranked = [{ id: '0', score: 0.95 }];
        setCachedRerank('query', ['c1', 'c2'], ranked);
        const cached = getCachedRerank('query', ['c1', 'c2']);
        expect(cached).toEqual(ranked);
    });
});

// === Cache Management ===

describe('Cache Management', () => {
    beforeEach(() => clearAllCaches());

    it('harus clear specific layer', () => {
        setCachedEmbedding('test', [1, 2, 3]);
        setCachedRetrieval('q', {}, []);

        clearCache('l1');
        expect(getCachedEmbedding('test')).toBeUndefined();
        expect(getCachedRetrieval('q', {})).toBeDefined();
    });

    it('harus clear all caches', () => {
        setCachedEmbedding('test', [1, 2, 3]);
        setCachedRetrieval('q', {}, []);
        setCachedRerank('q', ['c'], []);

        clearAllCaches();
        expect(getCachedEmbedding('test')).toBeUndefined();
        expect(getCachedRetrieval('q', {})).toBeUndefined();
        expect(getCachedRerank('q', ['c'])).toBeUndefined();
    });
});

describe('getCacheStats', () => {
    beforeEach(() => clearAllCaches());

    it('harus return stats for all layers', () => {
        const stats = getCacheStats();
        expect(stats.l1Embedding).toBeDefined();
        expect(stats.l2Retrieval).toBeDefined();
        expect(stats.l3Rerank).toBeDefined();
        expect(stats.l1Embedding.maxSize).toBe(10_000);
        expect(stats.l2Retrieval.maxSize).toBe(1_000);
        expect(stats.l3Rerank.maxSize).toBe(500);
    });
});

describe('formatCacheStats', () => {
    it('harus format stats for display', () => {
        const formatted = formatCacheStats();
        expect(formatted).toContain('📦 RAG Cache Status');
        expect(formatted).toContain('L1:Embedding');
        expect(formatted).toContain('L2:Retrieval');
        expect(formatted).toContain('L3:Rerank');
    });
});
