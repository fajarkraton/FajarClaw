/**
 * FajarClaw RAG — Indexer Tests
 *
 * Unit tests test formatting and utility functions.
 * Integration tests require Milvus + Embedding server.
 */

import { describe, it, expect } from 'vitest';
import { formatIndexResults, type IndexResult } from './indexer.js';

describe('formatIndexResults', () => {
    it('harus format success results', () => {
        const results: IndexResult[] = [
            { source: 'README.md', chunks: 5, inserted: 5, durationMs: 1200, errors: [] },
            { source: 'router.ts', chunks: 3, inserted: 3, durationMs: 800, errors: [] },
        ];

        const formatted = formatIndexResults(results);
        expect(formatted).toContain('Files: 2');
        expect(formatted).toContain('Chunks: 8');
        expect(formatted).toContain('Inserted: 8');
        expect(formatted).toContain('2.0s');
    });

    it('harus show errors', () => {
        const results: IndexResult[] = [
            { source: 'ok.md', chunks: 2, inserted: 2, durationMs: 500, errors: [] },
            { source: 'bad.md', chunks: 0, inserted: 0, durationMs: 100, errors: ['File not found'] },
        ];

        const formatted = formatIndexResults(results);
        expect(formatted).toContain('Errors: 1');
        expect(formatted).toContain('bad.md');
        expect(formatted).toContain('File not found');
    });

    it('harus handle empty results', () => {
        const formatted = formatIndexResults([]);
        expect(formatted).toContain('Files: 0');
        expect(formatted).toContain('Chunks: 0');
    });
});
