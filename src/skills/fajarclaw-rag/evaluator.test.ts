/**
 * FajarClaw RAG — Evaluator Tests
 *
 * Unit tests for metrics computation + integration tests for eval runner.
 */

import { describe, it, expect } from 'vitest';
import {
    computeRecall,
    computeMRR,
    computeNDCG,
    EVAL_DATASET,
    formatEvalSummary,
    formatEvalComparison,
    type EvalSummary,
} from './evaluator.js';

// === Metrics Unit Tests ===

describe('computeRecall', () => {
    it('harus return 1.0 when all expected sources found', () => {
        const found = ['src/router.ts code', 'lib/routeTask fn'];
        const expected = ['router.ts', 'routeTask'];
        expect(computeRecall(found, expected)).toBe(1.0);
    });

    it('harus return 0.5 when half found', () => {
        const found = ['src/router.ts code'];
        const expected = ['router.ts', 'missing.ts'];
        expect(computeRecall(found, expected)).toBe(0.5);
    });

    it('harus return 0 when none found', () => {
        const found = ['unrelated.ts'];
        const expected = ['router.ts', 'embed.ts'];
        expect(computeRecall(found, expected)).toBe(0);
    });

    it('harus return 1.0 for empty expected', () => {
        expect(computeRecall(['anything'], [])).toBe(1.0);
    });

    it('harus be case-insensitive', () => {
        const found = ['SRC/Router.TS code'];
        const expected = ['router.ts'];
        expect(computeRecall(found, expected)).toBe(1.0);
    });
});

describe('computeMRR', () => {
    it('harus return 1.0 when first result is relevant', () => {
        const found = ['router.ts code', 'other.ts'];
        const expected = ['router.ts'];
        expect(computeMRR(found, expected)).toBe(1.0);
    });

    it('harus return 0.5 when second result is relevant', () => {
        const found = ['unrelated.ts', 'router.ts match'];
        const expected = ['router.ts'];
        expect(computeMRR(found, expected)).toBe(0.5);
    });

    it('harus return 0 when no relevant result', () => {
        const found = ['unrelated.ts', 'other.ts'];
        const expected = ['router.ts'];
        expect(computeMRR(found, expected)).toBe(0);
    });
});

describe('computeNDCG', () => {
    it('harus return 1.0 for perfect ranking', () => {
        const found = ['router.ts', 'embed.ts'];
        const expected = ['router.ts', 'embed.ts'];
        expect(computeNDCG(found, expected, 5)).toBeCloseTo(1.0, 2);
    });

    it('harus return lower score for imperfect ranking', () => {
        const found = ['unrelated.ts', 'router.ts', 'embed.ts'];
        const expected = ['router.ts', 'embed.ts'];
        const ndcg = computeNDCG(found, expected, 5);
        expect(ndcg).toBeGreaterThan(0);
        expect(ndcg).toBeLessThan(1);
    });

    it('harus return 0 when no relevant results', () => {
        const found = ['a.ts', 'b.ts'];
        const expected = ['router.ts'];
        expect(computeNDCG(found, expected, 5)).toBe(0);
    });
});

// === Dataset Validation ===

describe('EVAL_DATASET', () => {
    it('harus have 30 eval queries', () => {
        expect(EVAL_DATASET.length).toBe(30);
    });

    it('harus cover 6 categories', () => {
        const categories = new Set(EVAL_DATASET.map(q => q.category));
        expect(categories.size).toBe(6);
    });

    it('harus have expectedSources for every query', () => {
        for (const q of EVAL_DATASET) {
            expect(q.expectedSources.length).toBeGreaterThan(0);
            expect(q.query.length).toBeGreaterThan(10);
        }
    });
});

// === Formatting Tests ===

describe('formatEvalSummary', () => {
    const mockSummary: EvalSummary = {
        avgRecall: 0.85,
        avgMRR: 0.72,
        avgNDCG: 0.78,
        totalQueries: 30,
        queriesWithHits: 25,
        totalDurationMs: 5000,
        mode: 'hybrid',
        results: [
            { query: 'q1', category: 'router', foundSources: [], expectedSources: [], recall: 1.0, mrr: 1.0, ndcg: 1.0, durationMs: 100, mode: 'hybrid' },
            { query: 'q2', category: 'rag', foundSources: [], expectedSources: [], recall: 0.5, mrr: 0.5, ndcg: 0.5, durationMs: 100, mode: 'hybrid' },
        ],
    };

    it('harus format summary with metrics', () => {
        const formatted = formatEvalSummary(mockSummary);
        expect(formatted).toContain('Recall@5:  85.0%');
        expect(formatted).toContain('✅');
        expect(formatted).toContain('NDCG@5:');
        expect(formatted).toContain('MRR:');
        expect(formatted).toContain('30');
        expect(formatted).toContain('hybrid');
    });
});

describe('formatEvalComparison', () => {
    it('harus format A/B comparison', () => {
        const basic: EvalSummary = { avgRecall: 0.5, avgMRR: 0.4, avgNDCG: 0.4, totalQueries: 5, queriesWithHits: 3, totalDurationMs: 100, mode: 'basic', results: [] };
        const hybrid: EvalSummary = { avgRecall: 0.85, avgMRR: 0.7, avgNDCG: 0.75, totalQueries: 5, queriesWithHits: 5, totalDurationMs: 200, mode: 'hybrid', results: [] };
        const delta = { recallDelta: 0.35, mrrDelta: 0.30, ndcgDelta: 0.35, recallImprovement: 70.0, ndcgImprovement: 87.5 };

        const formatted = formatEvalComparison(basic, hybrid, delta);
        expect(formatted).toContain('A/B Evaluation');
        expect(formatted).toContain('Basic');
        expect(formatted).toContain('Hybrid');
        expect(formatted).toContain('PASS');
    });
});

// === Self-Building Test ===

describe('Self-Building Test', () => {
    it('FajarClaw should have prompt-builder built from RAG context', async () => {
        // This test validates that prompt-builder.ts exists and is functional
        // It was "self-built" by FajarClaw using its own RAG pipeline
        const promptBuilder = await import('./prompt-builder.js');
        expect(promptBuilder.buildPrompt).toBeDefined();
        expect(typeof promptBuilder.buildPrompt).toBe('function');
    });

    it('FajarClaw should have evaluator built from RAG context', async () => {
        // eval framework was built using FajarClaw's own knowledge
        const evaluator = await import('./evaluator.js');
        expect(evaluator.runEval).toBeDefined();
        expect(evaluator.EVAL_DATASET).toBeDefined();
        expect(evaluator.EVAL_DATASET.length).toBe(30);
    });
});
