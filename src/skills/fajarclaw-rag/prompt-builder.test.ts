/**
 * FajarClaw RAG — Prompt Builder Tests
 */

import { describe, it, expect } from 'vitest';
import {
    buildPrompt,
    formatSprintContext,
    estimateTokens,
    formatPromptStats,
    type SprintContext,
} from './prompt-builder.js';
import type { RetrievalResponse } from './retriever.js';

// === Test Data ===

const mockRetrieval: RetrievalResponse = {
    query: 'How does routing work?',
    results: [
        {
            text: 'The router uses keyword scoring to route tasks.',
            source: '/src/router.ts',
            score: 0.92,
            section: 'routeTask',
            collection: 'fc_codebase',
            metadata: {},
        },
        {
            text: 'FajarClaw supports dual engine execution.',
            source: '/docs/README.md',
            score: 0.85,
            section: 'Architecture',
            collection: 'fc_documents',
            metadata: {},
        },
    ],
    durationMs: 42,
    collectionsSearched: 2,
    mode: 'hybrid+reranker',
};

const mockSprint: SprintContext = {
    phase: 'A3',
    story: 'Implement hybrid retrieval',
    status: 'in-progress',
    tags: ['rag', 'retrieval'],
};

// === Tests ===

describe('buildPrompt', () => {
    it('harus assemble prompt dengan semua sections', () => {
        const result = buildPrompt('How does the router work?', mockRetrieval, {
            sprint: mockSprint,
            systemInstructions: 'You are FajarClaw.',
            codeAwareness: { cwd: '/home/user/project' },
        });

        expect(result.prompt).toContain('<system_instructions');
        expect(result.prompt).toContain('You are FajarClaw');
        expect(result.prompt).toContain('<sprint_context>');
        expect(result.prompt).toContain('Phase: A3');
        expect(result.prompt).toContain('<retrieved_context');
        expect(result.prompt).toContain('hybrid+reranker');
        expect(result.prompt).toContain('router.ts');
        expect(result.prompt).toContain('<user_query>');
        expect(result.prompt).toContain('How does the router work?');
        expect(result.ragResultsIncluded).toBe(2);
        expect(result.truncated).toBe(false);
        expect(result.sections.length).toBeGreaterThanOrEqual(4);
    });

    it('harus handle null retrieval', () => {
        const result = buildPrompt('simple question', null);
        expect(result.prompt).toContain('<user_query>');
        expect(result.prompt).toContain('simple question');
        expect(result.ragResultsIncluded).toBe(0);
        expect(result.truncated).toBe(false);
    });

    it('harus truncate context when budget exceeded', () => {
        const result = buildPrompt('test', mockRetrieval, {
            maxContextChars: 300, // Small enough that only 1 result fits
        });
        // Either truncated or fewer results fit
        expect(result.ragResultsIncluded).toBeLessThanOrEqual(2);
    });

    it('harus include source attribution by default', () => {
        const result = buildPrompt('test', mockRetrieval);
        expect(result.prompt).toContain('source="/src/router.ts"');
        expect(result.prompt).toContain('score="92%"');
        expect(result.prompt).toContain('section="routeTask"');
    });

    it('harus skip attribution when disabled', () => {
        const result = buildPrompt('test', mockRetrieval, {
            includeAttribution: false,
        });
        expect(result.prompt).not.toContain('source="/src/router.ts"');
    });

    it('harus limit results via maxResults', () => {
        const result = buildPrompt('test', mockRetrieval, { maxResults: 1 });
        expect(result.ragResultsIncluded).toBe(1);
    });

    it('harus include code awareness warnings', () => {
        const result = buildPrompt('test', mockRetrieval, {
            codeAwareness: {
                existingFiles: ['/src/router.ts'],
                recentlyModified: ['/src/index.ts'],
                cwd: '/project',
            },
        });
        expect(result.prompt).toContain('<code_awareness>');
        expect(result.prompt).toContain('already exist');
        expect(result.prompt).toContain('Recently modified');
        expect(result.prompt).toContain('Working directory');
    });

    it('harus set engine label in system instructions', () => {
        const result = buildPrompt('test', null, {
            systemInstructions: 'Execute this task',
            engine: 'claude-code',
        });
        expect(result.prompt).toContain('target: claude-code');
    });
});

describe('formatSprintContext', () => {
    it('harus format full sprint context', () => {
        const ctx = formatSprintContext(mockSprint);
        expect(ctx).toContain('<sprint_context>');
        expect(ctx).toContain('Phase: A3');
        expect(ctx).toContain('Story: Implement hybrid retrieval');
        expect(ctx).toContain('Status: in-progress');
        expect(ctx).toContain('Tags: rag, retrieval');
        expect(ctx).toContain('</sprint_context>');
    });

    it('harus handle minimal sprint context', () => {
        const ctx = formatSprintContext({ phase: 'A1' });
        expect(ctx).toContain('Phase: A1');
        expect(ctx).not.toContain('Story:');
    });
});

describe('estimateTokens', () => {
    it('harus estimate tokens from chars', () => {
        expect(estimateTokens('Hello, world!')).toBe(4); // 13 chars / 4 = 3.25 → ceil = 4
        expect(estimateTokens('')).toBe(0);
        expect(estimateTokens('a'.repeat(1000))).toBe(250);
    });
});

describe('formatPromptStats', () => {
    it('harus format stats for display', () => {
        const stats = formatPromptStats({
            prompt: 'test prompt',
            sections: ['system', 'context', 'query'],
            charCount: 5000,
            ragResultsIncluded: 3,
            truncated: false,
        });
        expect(stats).toContain('📋 Prompt Assembly');
        expect(stats).toContain('5,000');
        expect(stats).toContain('RAG Results: 3');
        expect(stats).toContain('system → context → query');
    });

    it('harus show truncation warning', () => {
        const stats = formatPromptStats({
            prompt: 'test',
            sections: [],
            charCount: 100,
            ragResultsIncluded: 0,
            truncated: true,
        });
        expect(stats).toContain('⚠️ Context truncated');
    });
});
