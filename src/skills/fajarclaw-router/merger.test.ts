/**
 * FajarClaw Merger — Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
    mergeResults,
    createSuccessResult,
    createErrorResult,
    createPendingResult,
    formatMergedSummary,
} from './merger.js';
import type { RoutedTask } from '../../types/index.js';

// Helper: buat RoutedTask minimal untuk testing
function makeRoutedTask(overrides: Partial<RoutedTask> = {}): RoutedTask {
    return {
        originalMessage: 'test task',
        engine: 'claude-code',
        confidence: 0.9,
        confidenceLevel: 'high',
        matchedKeywords: ['test'],
        pattern: 'pipeline',
        timestamp: new Date(),
        ...overrides,
    };
}

describe('createPendingResult', () => {
    it('harus buat result dengan status pending', () => {
        const result = createPendingResult('claude-code');
        expect(result.status).toBe('pending');
        expect(result.engine).toBe('claude-code');
        expect(result.output).toBe('');
    });
});

describe('mergeResults', () => {
    it('harus merge single engine success', () => {
        const task = makeRoutedTask();
        const results = [createSuccessResult('claude-code', 'Code generated!', 1000)];
        const merged = mergeResults(task, results);

        expect(merged.success).toBe(true);
        expect(merged.mergedOutput).toContain('Claude Code');
        expect(merged.mergedOutput).toContain('Code generated!');
        expect(merged.totalDuration).toBe(1000);
    });

    it('harus handle semua engine gagal', () => {
        const task = makeRoutedTask();
        const results = [createErrorResult('claude-code', 'API timeout', 5000)];
        const merged = mergeResults(task, results);

        expect(merged.success).toBe(false);
        expect(merged.mergedOutput).toContain('❌');
        expect(merged.mergedOutput).toContain('API timeout');
    });

    it('harus merge dual parallel results', () => {
        const task = makeRoutedTask({ engine: 'dual', pattern: 'parallel' });
        const results = [
            createSuccessResult('claude-code', 'API siap', 1000),
            createSuccessResult('antigravity', 'UI siap', 1500),
        ];
        const merged = mergeResults(task, results);

        expect(merged.success).toBe(true);
        expect(merged.mergedOutput).toContain('Claude Code');
        expect(merged.mergedOutput).toContain('Antigravity');
        expect(merged.mergedOutput).toContain('API siap');
        expect(merged.mergedOutput).toContain('UI siap');
        expect(merged.totalDuration).toBe(2500);
    });

    it('harus merge dual pipeline results', () => {
        const task = makeRoutedTask({ engine: 'dual', pattern: 'pipeline' });
        const results = [
            createSuccessResult('claude-code', 'Backend deployed', 2000),
            createSuccessResult('antigravity', 'Visual verified', 1000),
        ];
        const merged = mergeResults(task, results);

        expect(merged.success).toBe(true);
        expect(merged.mergedOutput).toContain('Step 1');
        expect(merged.mergedOutput).toContain('Step 2');
    });

    it('harus handle partial failure di dual mode', () => {
        const task = makeRoutedTask({ engine: 'dual', pattern: 'parallel' });
        const results = [
            createSuccessResult('claude-code', 'API siap', 1000),
            createErrorResult('antigravity', 'Browser crash', 500),
        ];
        const merged = mergeResults(task, results);

        expect(merged.success).toBe(true); // partial success
        expect(merged.mergedOutput).toContain('API siap');
        expect(merged.mergedOutput).toContain('⚠️');
        expect(merged.mergedOutput).toContain('Browser crash');
    });
});

describe('formatMergedSummary', () => {
    it('harus format summary sukses', () => {
        const task = makeRoutedTask();
        const results = [createSuccessResult('claude-code', 'done', 2000)];
        const merged = mergeResults(task, results);
        const summary = formatMergedSummary(merged);

        expect(summary).toContain('✅');
        expect(summary).toContain('1 engine');
        expect(summary).toContain('2.0s');
    });

    it('harus format summary gagal', () => {
        const task = makeRoutedTask();
        const results = [createErrorResult('claude-code', 'error', 1000)];
        const merged = mergeResults(task, results);
        const summary = formatMergedSummary(merged);

        expect(summary).toContain('❌');
    });
});
