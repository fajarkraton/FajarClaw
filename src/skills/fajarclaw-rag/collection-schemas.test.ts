/**
 * FajarClaw RAG — Collection Schema Tests
 * Tidak perlu Milvus running — pure schema validation
 */

import { describe, it, expect } from 'vitest';
import {
    ALL_COLLECTIONS,
    DOCUMENTS_COLLECTION,
    CODEBASE_COLLECTION,
    DENSE_DIM,
} from './collection-schemas.js';

describe('Collection Schemas', () => {
    it('harus punya 7 collections', () => {
        expect(ALL_COLLECTIONS).toHaveLength(7);
    });

    it('semua collection names harus unique', () => {
        const names = ALL_COLLECTIONS.map(c => c.name);
        expect(new Set(names).size).toBe(names.length);
    });

    it('semua text collections harus punya dense_vector field 1024d', () => {
        const textCollections = [
            DOCUMENTS_COLLECTION,
            CODEBASE_COLLECTION,
            ALL_COLLECTIONS[2]!, // routes
            ALL_COLLECTIONS[3]!, // decisions
        ];

        for (const col of textCollections) {
            const denseField = col.fields.find(f => f.name === 'dense_vector');
            expect(denseField, `${col.name} missing dense_vector`).toBeDefined();
            expect(denseField!.dim).toBe(DENSE_DIM);
        }
    });

    it('text collections harus punya sparse_vector field', () => {
        const textCollections = ALL_COLLECTIONS.slice(0, 4);
        for (const col of textCollections) {
            const sparseField = col.fields.find(f => f.name === 'sparse_vector');
            expect(sparseField, `${col.name} missing sparse_vector`).toBeDefined();
        }
    });

    it('semua collections harus punya indexes', () => {
        for (const col of ALL_COLLECTIONS) {
            expect(col.indexes.length, `${col.name} has no indexes`).toBeGreaterThan(0);
        }
    });

    it('semua collections harus punya primary key', () => {
        for (const col of ALL_COLLECTIONS) {
            const pk = col.fields.find(f => f.is_primary_key);
            expect(pk, `${col.name} missing primary key`).toBeDefined();
        }
    });

    it('documents collection harus punya doc_type dan section fields', () => {
        const docType = DOCUMENTS_COLLECTION.fields.find(f => f.name === 'doc_type');
        const section = DOCUMENTS_COLLECTION.fields.find(f => f.name === 'section');
        expect(docType).toBeDefined();
        expect(section).toBeDefined();
    });

    it('codebase collection harus punya language dan symbol fields', () => {
        const lang = CODEBASE_COLLECTION.fields.find(f => f.name === 'language');
        const symbol = CODEBASE_COLLECTION.fields.find(f => f.name === 'symbol');
        expect(lang).toBeDefined();
        expect(symbol).toBeDefined();
    });

    it('DENSE_DIM harus 1024 (BGE-M3)', () => {
        expect(DENSE_DIM).toBe(1024);
    });

    it('semua collection names harus start dengan fc_ prefix', () => {
        for (const col of ALL_COLLECTIONS) {
            expect(col.name).toMatch(/^fc_/);
        }
    });
});
