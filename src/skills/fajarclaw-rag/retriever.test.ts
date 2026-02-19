/**
 * FajarClaw RAG — Retriever Tests
 *
 * Unit tests for context building and formatting (no Milvus/Embedding needed).
 */

import { describe, it, expect } from 'vitest';
import {
    buildContext,
    buildContextSummary,
    formatRetrievalResults,
    type RetrievalResponse,
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
        expect(summary).toContain('Relevant context:');
        expect(summary).toContain('router.ts');
        expect(summary).toContain('92%');
        // Should only have 2 results (maxResults=2)
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
    });

    it('harus handle empty results', () => {
        const formatted = formatRetrievalResults(emptyResponse);
        expect(formatted).toContain('Results: 0');
    });
});
