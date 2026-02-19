/**
 * FajarClaw RAG — Query Transform Tests
 */

import { describe, it, expect } from 'vitest';
import {
    expandQuery,
    hydeTransform,
    decomposeQuery,
    injectMetadataFilters,
    transformQuery,
    formatTransformResult,
} from './query-transform.js';

describe('expandQuery', () => {
    it('harus add synonyms for known terms', () => {
        const result = expandQuery('How does the router work?');
        expect(result.addedTerms.length).toBeGreaterThan(0);
        expect(result.expanded).toContain('router');
        // Should add routing-related synonyms
        expect(result.expanded.length).toBeGreaterThan('How does the router work?'.length);
    });

    it('harus handle Indonesian terms', () => {
        const result = expandQuery('bagaimana cara cari file?');
        expect(result.addedTerms.length).toBeGreaterThan(0);
        // Should add English equivalents
        const hasEnglish = result.addedTerms.some(t =>
            ['how', 'search', 'find', 'retrieve', 'cara'].includes(t)
        );
        expect(hasEnglish).toBe(true);
    });

    it('harus not duplicate existing terms', () => {
        const result = expandQuery('search and retrieve data');
        // Should not add "search" or "retrieve" since already present
        expect(result.addedTerms).not.toContain('search');
        expect(result.addedTerms).not.toContain('retrieve');
    });

    it('harus handle no-match gracefully', () => {
        const result = expandQuery('xyz unknown query');
        expect(result.expanded).toBe('xyz unknown query');
        expect(result.addedTerms.length).toBe(0);
    });

    it('harus limit added terms', () => {
        const result = expandQuery('search build test deploy debug cache embed');
        expect(result.addedTerms.length).toBeLessThanOrEqual(6);
    });
});

describe('hydeTransform', () => {
    it('harus generate hypothetical for "how" questions', () => {
        const result = hydeTransform('How does the router work?');
        expect(result.useHypothetical).toBe(true);
        expect(result.hypothetical).toContain('router');
        expect(result.hypothetical.length).toBeGreaterThan(50);
    });

    it('harus generate hypothetical for "what" questions', () => {
        const result = hydeTransform('What is the embedding pipeline?');
        expect(result.useHypothetical).toBe(true);
        expect(result.hypothetical).toContain('embedding pipeline');
    });

    it('harus handle Indonesian questions', () => {
        const result = hydeTransform('Bagaimana cara kerja reranker?');
        expect(result.useHypothetical).toBe(true);
        expect(result.hypothetical.length).toBeGreaterThan(30);
    });

    it('harus skip non-questions', () => {
        const result = hydeTransform('implement the cache module');
        expect(result.useHypothetical).toBe(false);
        expect(result.hypothetical).toBe('implement the cache module');
    });
});

describe('decomposeQuery', () => {
    it('harus split on conjunctions', () => {
        const result = decomposeQuery('How does the router work and how does the embedder work?');
        expect(result.wasDecomposed).toBe(true);
        expect(result.subQueries.length).toBe(2);
    });

    it('harus split Indonesian conjunctions', () => {
        const result = decomposeQuery('Bagaimana router bekerja di sistem ini dan bagaimana embedder memproses data?');
        expect(result.wasDecomposed).toBe(true);
        expect(result.subQueries.length).toBe(2);
    });

    it('harus not decompose short queries', () => {
        const result = decomposeQuery('How does routing work?');
        expect(result.wasDecomposed).toBe(false);
        expect(result.subQueries).toEqual(['How does routing work?']);
    });

    it('harus handle semicolons as separators', () => {
        const result = decomposeQuery('Explain the router architecture; describe the embedding pipeline in detail');
        expect(result.wasDecomposed).toBe(true);
        expect(result.subQueries.length).toBe(2);
    });
});

describe('injectMetadataFilters', () => {
    it('harus detect codebase collection for code queries', () => {
        const result = injectMetadataFilters('show me the function implementation in the typescript file');
        expect(result.collections).toContain('fc_codebase');
        expect(result.wasFiltered).toBe(true);
    });

    it('harus detect document collection for doc queries', () => {
        const result = injectMetadataFilters('find the documentation guide spec');
        expect(result.collections).toContain('fc_documents');
        expect(result.wasFiltered).toBe(true);
    });

    it('harus detect doc_type for code keywords', () => {
        const result = injectMetadataFilters('show the function class import export');
        expect(result.filter).toContain('doc_type');
        expect(result.wasFiltered).toBe(true);
    });

    it('harus return empty for generic queries', () => {
        const result = injectMetadataFilters('hello world');
        expect(result.wasFiltered).toBe(false);
        expect(result.filter).toBe('');
    });
});

describe('transformQuery', () => {
    it('harus apply full pipeline', () => {
        const result = transformQuery('How does the router work in the codebase?', {
            expand: true,
            decompose: true,
            hyde: true,
            injectFilters: true,
        });
        expect(result.query.length).toBeGreaterThanOrEqual('How does the router work in the codebase?'.length);
        expect(result.expansion).toBeDefined();
        expect(result.hyde).toBeDefined();
        expect(result.decomposition).toBeDefined();
        expect(result.metadata).toBeDefined();
    });

    it('harus skip disabled transformations', () => {
        const result = transformQuery('test query', {
            expand: false,
            decompose: false,
            hyde: false,
            injectFilters: false,
        });
        expect(result.transformsApplied.length).toBe(0);
        expect(result.query).toBe('test query');
    });

    it('harus track applied transformations', () => {
        const result = transformQuery('How does the router and embedder work?', {
            expand: true,
            decompose: true,
            hyde: false,
        });
        // expand should add synonyms, decompose should split
        if (result.expansion.addedTerms.length > 0) {
            expect(result.transformsApplied).toContain('expand');
        }
    });
});

describe('formatTransformResult', () => {
    it('harus format results for display', () => {
        const result = transformQuery('How does the router work?', { expand: true, hyde: true });
        const formatted = formatTransformResult(result);
        expect(formatted).toContain('🔄 Query Transform');
        expect(formatted).toContain('Original:');
        expect(formatted).toContain('router');
    });

    it('harus show no-op when no transforms applied', () => {
        const result = transformQuery('xyz', { expand: true, decompose: false, hyde: false, injectFilters: false });
        const formatted = formatTransformResult(result);
        if (result.transformsApplied.length === 0) {
            expect(formatted).toContain('no transformations applied');
        }
    });
});
