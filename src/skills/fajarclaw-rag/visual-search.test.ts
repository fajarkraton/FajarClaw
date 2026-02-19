/**
 * FajarClaw RAG — Visual Indexer + Search Tests
 */

import { describe, it, expect } from 'vitest';
import {
    formatVisualIndexSummary,
    type VisualIndexSummary,
    type VisualMetadata,
} from './visual-indexer.js';
import {
    formatVisualSearchResults,
    type VisualSearchResponse,
    type VisualSearchResult,
    type VisualCollection,
} from './visual-search.js';

// === Visual Indexer Tests ===

describe('Visual Indexer — Types', () => {
    it('harus have correct VisualMetadata interface', () => {
        const meta: VisualMetadata = {
            page: 'login',
            component: 'LoginForm',
            sprint: 3,
            viewport: { width: 1920, height: 1080 },
            sourceFile: 'src/pages/login.tsx',
            tags: ['auth', 'form'],
        };
        expect(meta.page).toBe('login');
        expect(meta.component).toBe('LoginForm');
        expect(meta.viewport?.width).toBe(1920);
    });
});

describe('formatVisualIndexSummary', () => {
    it('harus format successful summary', () => {
        const summary: VisualIndexSummary = {
            total: 5,
            indexed: 4,
            skipped: 1,
            failed: 0,
            results: [
                { path: '/tmp/a.png', id: 'abc', collection: 'fc_visual', success: true },
            ],
            durationMs: 250,
        };
        const formatted = formatVisualIndexSummary(summary);
        expect(formatted).toContain('📸 Visual Indexing');
        expect(formatted).toContain('Indexed: 4');
        expect(formatted).toContain('Skipped: 1');
        expect(formatted).toContain('250ms');
    });

    it('harus show failures', () => {
        const summary: VisualIndexSummary = {
            total: 2,
            indexed: 1,
            skipped: 0,
            failed: 1,
            results: [
                { path: '/tmp/a.png', id: 'abc', collection: 'fc_visual', success: true },
                { path: '/tmp/b.png', id: 'def', collection: 'fc_visual', success: false, error: 'Not found' },
            ],
            durationMs: 100,
        };
        const formatted = formatVisualIndexSummary(summary);
        expect(formatted).toContain('Failed: 1');
        expect(formatted).toContain('❌');
        expect(formatted).toContain('Not found');
    });
});

// === Visual Search Tests ===

describe('Visual Search — Types', () => {
    it('harus have VisualCollection type', () => {
        const col: VisualCollection = 'fc_visual';
        expect(col).toBe('fc_visual');
        const mockups: VisualCollection = 'fc_mockups';
        expect(mockups).toBe('fc_mockups');
        const vistests: VisualCollection = 'fc_vistests';
        expect(vistests).toBe('fc_vistests');
    });

    it('harus have correct VisualSearchResult shape', () => {
        const result: VisualSearchResult = {
            id: '123',
            text: 'Screenshot of login page',
            source: '/screenshots/login.png',
            component: 'LoginForm',
            score: 0.92,
        };
        expect(result.score).toBe(0.92);
        expect(result.component).toBe('LoginForm');
    });
});

describe('formatVisualSearchResults', () => {
    it('harus format results with scores', () => {
        const response: VisualSearchResponse = {
            results: [
                { id: '1', text: 'Login form screenshot', source: '/img/login.png', component: 'LoginForm', score: 0.95 },
                { id: '2', text: 'Dashboard view', source: '/img/dash.png', component: 'Dashboard', score: 0.82 },
            ],
            query: 'login form design',
            mode: 'text-to-image',
            collection: 'fc_visual',
            durationMs: 150,
        };
        const formatted = formatVisualSearchResults(response);
        expect(formatted).toContain('🔍 Visual Search');
        expect(formatted).toContain('login form design');
        expect(formatted).toContain('text-to-image');
        expect(formatted).toContain('95%');
        expect(formatted).toContain('LoginForm');
        expect(formatted).toContain('login.png');
    });

    it('harus handle empty results', () => {
        const response: VisualSearchResponse = {
            results: [],
            query: 'nonexistent',
            mode: 'text-to-image',
            collection: 'fc_visual',
            durationMs: 50,
        };
        const formatted = formatVisualSearchResults(response);
        expect(formatted).toContain('No visual matches');
    });

    it('harus format image-to-image mode', () => {
        const response: VisualSearchResponse = {
            results: [
                { id: '1', text: 'Similar screenshot', source: '/img/sim.png', component: 'Card', score: 0.88 },
            ],
            query: '/tmp/query.png',
            mode: 'image-to-image',
            collection: 'fc_mockups',
            durationMs: 200,
        };
        const formatted = formatVisualSearchResults(response);
        expect(formatted).toContain('image-to-image');
        expect(formatted).toContain('fc_mockups');
    });
});
