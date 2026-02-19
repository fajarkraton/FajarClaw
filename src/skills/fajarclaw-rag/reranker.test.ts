/**
 * FajarClaw RAG — Reranker Tests
 *
 * Unit tests: always run
 * Integration tests: auto-skip if reranker server offline
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
    rerank,
    rerankTexts,
    isRerankerReady,
    setRerankerUrl,
    getRerankerUrl,
    formatRerankerStatus,
    type RerankCandidate,
} from './reranker.js';

// === Unit Tests (always run) ===

describe('Reranker — Unit Tests', () => {
    it('harus return empty untuk no candidates', async () => {
        const result = await rerank('test query', []);
        expect(result.ranked).toHaveLength(0);
        expect(result.query).toBe('test query');
        expect(result.durationMs).toBe(0);
    });

    it('harus configure server URL', () => {
        const original = getRerankerUrl();
        setRerankerUrl('http://custom:9999');
        expect(getRerankerUrl()).toBe('http://custom:9999');
        setRerankerUrl(original);
    });
});

// === Integration Tests (skip if server offline) ===

describe('Reranker — Integration Tests', () => {
    let serverUp = false;

    beforeAll(async () => {
        serverUp = await isRerankerReady();
        if (!serverUp) {
            console.log('⚠️ Reranker server offline — skipping integration tests');
        }
    });

    it('harus rerank candidates', async () => {
        if (!serverUp) return;

        const candidates: RerankCandidate[] = [
            { text: 'The weather is sunny today', id: '1' },
            { text: 'TypeScript router handles task routing', id: '2' },
            { text: 'FajarClaw routes tasks to Claude Code or Antigravity', id: '3' },
            { text: 'Python is a programming language', id: '4' },
        ];

        const result = await rerank('How does the FajarClaw router work?', candidates, 3);
        expect(result.ranked.length).toBeLessThanOrEqual(3);
        expect(result.ranked[0]!.score).toBeGreaterThan(result.ranked[result.ranked.length - 1]!.score);
        expect(result.model).toContain('Qwen');
        expect(result.durationMs).toBeGreaterThan(0);
    });

    it('harus rerank texts convenience', async () => {
        if (!serverUp) return;

        const result = await rerankTexts(
            'What is TypeScript?',
            ['TypeScript is a typed superset of JavaScript', 'Bananas are yellow', 'TypeScript compiles to JS'],
            2
        );
        expect(result.ranked).toHaveLength(2);
        // TypeScript texts should score higher
        expect(result.ranked[0]!.text).toContain('TypeScript');
    });

    it('harus show status', async () => {
        if (!serverUp) return;
        const status = await formatRerankerStatus();
        expect(status).toContain('Reranker');
        expect(status).toContain('🟢');
    });
});
