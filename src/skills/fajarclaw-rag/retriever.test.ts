/**
 * FajarClaw RAG — Retriever Tests
 *
 * Unit tests for context building, RRF fusion, and formatting.
 */

import { describe, it, expect } from 'vitest';
import {
    buildContext,
    buildContextSummary,
    formatRetrievalResults,
    rrfFusion,
    type RetrievalResponse,
    type RetrievalResult,
} from './retriever.js';

const mockResponse: RetrievalResponse = {
    query: 'How does the router work?',
    results: [
        {
            text: 'The router scores keywords to determine whether Claude Code or Antigravity handles the task.',
            source: '/src/skills/fajarclaw-router/router.ts',
            score: 0.92,
            section: 'routeTask',
            collection: 'fc_codebase',
            metadata: {},
        },
        {
            text: 'FajarClaw routes tasks to the appropriate engine based on keyword analysis.',
            source: '/docs/README.md',
            score: 0.85,
            section: 'Architecture',
            collection: 'fc_documents',
            metadata: {},
        },
        {
            text: 'Pattern selection logic determines pipeline, parallel, or verify execution mode.',
            source: '/src/skills/fajarclaw-router/patterns.ts',
            score: 0.78,
            section: 'selectPattern',
            collection: 'fc_codebase',
            metadata: {},
        },
    ],
    durationMs: 42,
    collectionsSearched: 2,
    mode: 'dense',
};

const emptyResponse: RetrievalResponse = {
    query: 'nonexistent topic',
    results: [],
    durationMs: 5,
    collectionsSearched: 2,
};

describe('buildContext', () => {
    it('harus build XML context dari results', () => {
        const ctx = buildContext(mockResponse);
        expect(ctx).toContain('<rag_context');
        expect(ctx).toContain('query="How does the router work?"');
        expect(ctx).toContain('results="3"');
        expect(ctx).toContain('<result source=');
        expect(ctx).toContain('router.ts');
        expect(ctx).toContain('score="0.920"');
        expect(ctx).toContain('</rag_context>');
        expect(ctx).toContain('mode="dense"');
    });

    it('harus escape XML characters', () => {
        const response: RetrievalResponse = {
            query: 'What is <b>this</b> & "that"?',
            results: [{
                text: 'Test content',
                source: 'test.md',
                score: 0.9,
                section: 'test',
                collection: 'fc_documents',
                metadata: {},
            }],
            durationMs: 1,
            collectionsSearched: 1,
        };
        const ctx = buildContext(response);
        expect(ctx).toContain('&lt;b&gt;');
        expect(ctx).toContain('&amp;');
        expect(ctx).toContain('&quot;');
    });

    it('harus return empty string untuk no results', () => {
        expect(buildContext(emptyResponse)).toBe('');
    });
});

describe('buildContextSummary', () => {
    it('harus build concise summary', () => {
        const summary = buildContextSummary(mockResponse, 2);
        expect(summary).toContain('Relevant context');
        expect(summary).toContain('router.ts');
        expect(summary).toContain('92%');
        const lines = summary.split('\n');
        expect(lines.filter(l => l.startsWith('-')).length).toBe(2);
    });

    it('harus handle no results', () => {
        const summary = buildContextSummary(emptyResponse);
        expect(summary).toContain('no relevant context');
    });
});

describe('formatRetrievalResults', () => {
    it('harus format untuk display', () => {
        const formatted = formatRetrievalResults(mockResponse);
        expect(formatted).toContain('🔍 Retrieval');
        expect(formatted).toContain('Results: 3');
        expect(formatted).toContain('2 collections');
        expect(formatted).toContain('42ms');
        expect(formatted).toContain('92%');
        expect(formatted).toContain('router.ts');
        expect(formatted).toContain('[dense]');
    });

    it('harus handle empty results', () => {
        const formatted = formatRetrievalResults(emptyResponse);
        expect(formatted).toContain('Results: 0');
    });
});

describe('rrfFusion', () => {
    const denseResults: RetrievalResult[] = [
        { text: 'Doc A', source: 'a.ts', score: 0.95, section: 'funcA', collection: 'fc_codebase', metadata: {} },
        { text: 'Doc B', source: 'b.ts', score: 0.85, section: 'funcB', collection: 'fc_codebase', metadata: {} },
        { text: 'Doc C', source: 'c.ts', score: 0.75, section: 'funcC', collection: 'fc_codebase', metadata: {} },
    ];

    const sparseResults: RetrievalResult[] = [
        { text: 'Doc B', source: 'b.ts', score: 0.90, section: 'funcB', collection: 'fc_codebase', metadata: {} },
        { text: 'Doc A', source: 'a.ts', score: 0.80, section: 'funcA', collection: 'fc_codebase', metadata: {} },
        { text: 'Doc D', source: 'd.ts', score: 0.70, section: 'funcD', collection: 'fc_codebase', metadata: {} },
    ];

    it('harus merge dense + sparse rankings via RRF', () => {
        const fused = rrfFusion(denseResults, sparseResults, 60);
        expect(fused.length).toBeGreaterThanOrEqual(3);
        const texts = fused.map(r => r.text);
        expect(texts).toContain('Doc A');
        expect(texts).toContain('Doc B');
        expect(texts).toContain('Doc C');
        expect(texts).toContain('Doc D');
    });

    it('harus boost results appearing in both rankings', () => {
        const fused = rrfFusion(denseResults, sparseResults, 60);
        const scoreA = fused.find(r => r.text === 'Doc A')!.score;
        const scoreD = fused.find(r => r.text === 'Doc D')!.score;
        expect(scoreA).toBeGreaterThan(scoreD);
    });

    it('harus return results sorted by RRF score descending', () => {
        const fused = rrfFusion(denseResults, sparseResults, 60);
        for (let i = 1; i < fused.length; i++) {
            expect(fused[i - 1]!.score).toBeGreaterThanOrEqual(fused[i]!.score);
        }
    });

    it('harus handle single-source results', () => {
        const fused = rrfFusion(denseResults, [], 60);
        expect(fused.length).toBe(3);
    });
});
