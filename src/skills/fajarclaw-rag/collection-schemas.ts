/**
 * FajarClaw RAG — Collection Schema Definitions
 * @ref FC-PRD-01 §10.4 (Milvus Collections)
 *
 * 7 collections untuk menyimpan berbagai jenis data:
 * - documents: dokumen proyek (PRD, specs, guides)
 * - codebase: source code chunks
 * - routes: routing rules & patterns
 * - decisions: sprint decisions & meeting notes
 * - visual: screenshots & visual references (Phase A5)
 * - mockups: design mockups (Phase A5)
 * - vistests: visual test results (Phase A5)
 */

import { DataType } from '@zilliz/milvus2-sdk-node';

// === Constants ===

/** Dimensi embedding BGE-M3 dense vector */
export const DENSE_DIM = 1024;

/** Dimensi sparse vector (dynamic) */
export const SPARSE_MAX_DIM = 250000;

// === Collection Schema Type ===

export interface CollectionSchema {
    name: string;
    description: string;
    fields: FieldDef[];
    indexes: IndexDef[];
}

export interface FieldDef {
    name: string;
    data_type: DataType;
    is_primary_key?: boolean;
    auto_id?: boolean;
    max_length?: number;
    dim?: number;
    description?: string;
}

export interface IndexDef {
    field_name: string;
    index_type: string;
    metric_type: string;
    params?: Record<string, unknown>;
}

// === Collection Definitions ===

/** Collection: documents — Dokumen proyek (PRD, specs, guides) */
export const DOCUMENTS_COLLECTION: CollectionSchema = {
    name: 'fc_documents',
    description: 'Project documents — PRD, specs, guides, meeting notes',
    fields: [
        { name: 'id', data_type: DataType.VarChar, is_primary_key: true, max_length: 128 },
        { name: 'text', data_type: DataType.VarChar, max_length: 65535, description: 'Chunk text content' },
        { name: 'dense_vector', data_type: DataType.FloatVector, dim: DENSE_DIM, description: 'BGE-M3 dense embedding' },
        { name: 'sparse_vector', data_type: DataType.SparseFloatVector, description: 'BGE-M3 sparse embedding' },
        { name: 'source', data_type: DataType.VarChar, max_length: 512, description: 'Source file path' },
        { name: 'doc_type', data_type: DataType.VarChar, max_length: 64, description: 'Document type: prd, spec, guide, notes' },
        { name: 'section', data_type: DataType.VarChar, max_length: 256, description: 'Section heading' },
        { name: 'chunk_index', data_type: DataType.Int32, description: 'Chunk position in document' },
        { name: 'created_at', data_type: DataType.Int64, description: 'Unix timestamp' },
    ],
    indexes: [
        { field_name: 'dense_vector', index_type: 'IVF_FLAT', metric_type: 'COSINE', params: { nlist: 128 } },
        { field_name: 'sparse_vector', index_type: 'SPARSE_INVERTED_INDEX', metric_type: 'IP' },
    ],
};

/** Collection: codebase — Source code chunks */
export const CODEBASE_COLLECTION: CollectionSchema = {
    name: 'fc_codebase',
    description: 'Source code chunks — functions, classes, modules',
    fields: [
        { name: 'id', data_type: DataType.VarChar, is_primary_key: true, max_length: 128 },
        { name: 'text', data_type: DataType.VarChar, max_length: 65535, description: 'Code chunk content' },
        { name: 'dense_vector', data_type: DataType.FloatVector, dim: DENSE_DIM },
        { name: 'sparse_vector', data_type: DataType.SparseFloatVector },
        { name: 'source', data_type: DataType.VarChar, max_length: 512, description: 'File path' },
        { name: 'language', data_type: DataType.VarChar, max_length: 32, description: 'Programming language' },
        { name: 'symbol', data_type: DataType.VarChar, max_length: 256, description: 'Function/class name' },
        { name: 'chunk_type', data_type: DataType.VarChar, max_length: 32, description: 'function, class, module, import' },
        { name: 'created_at', data_type: DataType.Int64 },
    ],
    indexes: [
        { field_name: 'dense_vector', index_type: 'IVF_FLAT', metric_type: 'COSINE', params: { nlist: 128 } },
        { field_name: 'sparse_vector', index_type: 'SPARSE_INVERTED_INDEX', metric_type: 'IP' },
    ],
};

/** Collection: routes — Routing rules & patterns */
export const ROUTES_COLLECTION: CollectionSchema = {
    name: 'fc_routes',
    description: 'Routing rules, keyword patterns, and routing decisions',
    fields: [
        { name: 'id', data_type: DataType.VarChar, is_primary_key: true, max_length: 128 },
        { name: 'text', data_type: DataType.VarChar, max_length: 65535 },
        { name: 'dense_vector', data_type: DataType.FloatVector, dim: DENSE_DIM },
        { name: 'sparse_vector', data_type: DataType.SparseFloatVector },
        { name: 'engine', data_type: DataType.VarChar, max_length: 32, description: 'Target engine' },
        { name: 'category', data_type: DataType.VarChar, max_length: 64, description: 'Rule category' },
        { name: 'created_at', data_type: DataType.Int64 },
    ],
    indexes: [
        { field_name: 'dense_vector', index_type: 'IVF_FLAT', metric_type: 'COSINE', params: { nlist: 64 } },
        { field_name: 'sparse_vector', index_type: 'SPARSE_INVERTED_INDEX', metric_type: 'IP' },
    ],
};

/** Collection: decisions — Sprint decisions & notes */
export const DECISIONS_COLLECTION: CollectionSchema = {
    name: 'fc_decisions',
    description: 'Sprint decisions, retrospective notes, architectural decisions',
    fields: [
        { name: 'id', data_type: DataType.VarChar, is_primary_key: true, max_length: 128 },
        { name: 'text', data_type: DataType.VarChar, max_length: 65535 },
        { name: 'dense_vector', data_type: DataType.FloatVector, dim: DENSE_DIM },
        { name: 'sparse_vector', data_type: DataType.SparseFloatVector },
        { name: 'sprint', data_type: DataType.VarChar, max_length: 32, description: 'Sprint identifier' },
        { name: 'decision_type', data_type: DataType.VarChar, max_length: 64, description: 'architecture, implementation, process' },
        { name: 'created_at', data_type: DataType.Int64 },
    ],
    indexes: [
        { field_name: 'dense_vector', index_type: 'IVF_FLAT', metric_type: 'COSINE', params: { nlist: 64 } },
        { field_name: 'sparse_vector', index_type: 'SPARSE_INVERTED_INDEX', metric_type: 'IP' },
    ],
};

/** Collection: visual — Screenshots (Phase A5) */
export const VISUAL_COLLECTION: CollectionSchema = {
    name: 'fc_visual',
    description: 'Screenshots and visual references (Phase A5)',
    fields: [
        { name: 'id', data_type: DataType.VarChar, is_primary_key: true, max_length: 128 },
        { name: 'text', data_type: DataType.VarChar, max_length: 65535, description: 'Caption/alt text' },
        { name: 'dense_vector', data_type: DataType.FloatVector, dim: DENSE_DIM },
        { name: 'source', data_type: DataType.VarChar, max_length: 512 },
        { name: 'visual_type', data_type: DataType.VarChar, max_length: 32, description: 'screenshot, diagram, photo' },
        { name: 'created_at', data_type: DataType.Int64 },
    ],
    indexes: [
        { field_name: 'dense_vector', index_type: 'IVF_FLAT', metric_type: 'COSINE', params: { nlist: 64 } },
    ],
};

/** Collection: mockups — Design mockups (Phase A5) */
export const MOCKUPS_COLLECTION: CollectionSchema = {
    name: 'fc_mockups',
    description: 'Design mockups and wireframes (Phase A5)',
    fields: [
        { name: 'id', data_type: DataType.VarChar, is_primary_key: true, max_length: 128 },
        { name: 'text', data_type: DataType.VarChar, max_length: 65535 },
        { name: 'dense_vector', data_type: DataType.FloatVector, dim: DENSE_DIM },
        { name: 'source', data_type: DataType.VarChar, max_length: 512 },
        { name: 'component', data_type: DataType.VarChar, max_length: 128, description: 'Component name' },
        { name: 'created_at', data_type: DataType.Int64 },
    ],
    indexes: [
        { field_name: 'dense_vector', index_type: 'IVF_FLAT', metric_type: 'COSINE', params: { nlist: 64 } },
    ],
};

/** Collection: vistests — Visual test results (Phase A5) */
export const VISTESTS_COLLECTION: CollectionSchema = {
    name: 'fc_vistests',
    description: 'Visual test results and comparisons (Phase A5)',
    fields: [
        { name: 'id', data_type: DataType.VarChar, is_primary_key: true, max_length: 128 },
        { name: 'text', data_type: DataType.VarChar, max_length: 65535 },
        { name: 'dense_vector', data_type: DataType.FloatVector, dim: DENSE_DIM },
        { name: 'source', data_type: DataType.VarChar, max_length: 512 },
        { name: 'test_name', data_type: DataType.VarChar, max_length: 128 },
        { name: 'status', data_type: DataType.VarChar, max_length: 16, description: 'pass, fail, diff' },
        { name: 'created_at', data_type: DataType.Int64 },
    ],
    indexes: [
        { field_name: 'dense_vector', index_type: 'IVF_FLAT', metric_type: 'COSINE', params: { nlist: 64 } },
    ],
};

/** Semua collections dalam registry */
export const ALL_COLLECTIONS: CollectionSchema[] = [
    DOCUMENTS_COLLECTION,
    CODEBASE_COLLECTION,
    ROUTES_COLLECTION,
    DECISIONS_COLLECTION,
    VISUAL_COLLECTION,
    MOCKUPS_COLLECTION,
    VISTESTS_COLLECTION,
];
