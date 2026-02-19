/**
 * FajarClaw RAG — Milvus Client Wrapper
 * @ref FC-PRD-01 §10.4 (Vector Indexing)
 *
 * Manages connection to Milvus (Lite or Standalone),
 * collection creation/management, and basic CRUD operations.
 */

import { MilvusClient } from '@zilliz/milvus2-sdk-node';
import {
    ALL_COLLECTIONS,
    type CollectionSchema,
} from './collection-schemas.js';

// === Types ===

export interface MilvusConfig {
    /** Milvus URI — "milvus_lite.db" untuk embedded atau "localhost:19530" untuk Standalone */
    uri: string;
    /** Database name (default: 'default') */
    database?: string;
}

/** Row data for insertion — flexible field mapping */
export type InsertData = Record<string, string | number | number[] | Record<number, number> | boolean | null>;

export interface SearchOptions {
    /** Collection to search */
    collection: string;
    /** Dense query vector (1024d) */
    vector: number[];
    /** Number of results to return */
    topK?: number;
    /** Metadata filter expression */
    filter?: string;
    /** Fields to return */
    outputFields?: string[];
}

export interface SearchResult {
    id: string;
    score: number;
    text: string;
    metadata: Record<string, unknown>;
}

// === Client Manager ===

let _client: MilvusClient | null = null;

/**
 * Inisialisasi koneksi Milvus
 * Supports Milvus Lite (file-based) dan Standalone (gRPC)
 */
export async function connect(config: MilvusConfig): Promise<MilvusClient> {

    _client = new MilvusClient({
        address: config.uri,
        database: config.database,
    });

    return _client;
}

/**
 * Dapatkan active client
 */
export function getClient(): MilvusClient {
    if (!_client) {
        throw new Error('Milvus client belum diinisialisasi. Panggil connect() dulu.');
    }
    return _client;
}

/**
 * Close connection
 */
export async function disconnect(): Promise<void> {
    if (_client) {
        await _client.closeConnection();
        _client = null;
    }
}

// === Collection Management ===

/**
 * Buat semua 7 collections sesuai schema
 * Skip collection yang sudah ada
 */
export async function createAllCollections(): Promise<string[]> {
    const client = getClient();
    const created: string[] = [];

    for (const schema of ALL_COLLECTIONS) {
        const exists = await client.hasCollection({ collection_name: schema.name });

        if (exists.value) {
            continue; // skip existing
        }

        await createCollection(schema);
        created.push(schema.name);
    }

    return created;
}

/**
 * Buat satu collection dengan schema dan indexes
 */
export async function createCollection(schema: CollectionSchema): Promise<void> {
    const client = getClient();

    // Create collection
    await client.createCollection({
        collection_name: schema.name,
        description: schema.description,
        fields: schema.fields.map(f => ({
            name: f.name,
            data_type: f.data_type,
            is_primary_key: f.is_primary_key ?? false,
            autoID: f.auto_id ?? false,
            max_length: f.max_length,
            dim: f.dim,
            description: f.description ?? '',
        })),
    });

    // Create indexes
    for (const idx of schema.indexes) {
        await client.createIndex({
            collection_name: schema.name,
            field_name: idx.field_name,
            index_type: idx.index_type,
            metric_type: idx.metric_type,
            params: idx.params ?? {},
        });
    }

    // Load collection into memory
    await client.loadCollection({ collection_name: schema.name });
}

/**
 * Drop satu collection
 */
export async function dropCollection(name: string): Promise<void> {
    const client = getClient();
    await client.dropCollection({ collection_name: name });
}

/**
 * Drop semua FajarClaw collections
 */
export async function dropAllCollections(): Promise<void> {
    const client = getClient();
    for (const schema of ALL_COLLECTIONS) {
        const exists = await client.hasCollection({ collection_name: schema.name });
        if (exists.value) {
            await client.dropCollection({ collection_name: schema.name });
        }
    }
}

/**
 * List semua collections
 */
export async function listCollections(): Promise<string[]> {
    const client = getClient();
    const result = await client.listCollections();
    return result.data.map((c: { name: string }) => c.name);
}

// === Data Operations ===

/**
 * Insert data ke collection
 */
export async function insert(
    collection: string,
    data: InsertData[]
): Promise<number> {
    const client = getClient();

    const result = await client.insert({
        collection_name: collection,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: data as any,
    });

    return Number(result.insert_cnt ?? data.length);
}

/**
 * Dense vector search pada collection
 */
export async function search(options: SearchOptions): Promise<SearchResult[]> {
    const client = getClient();
    const topK = options.topK ?? 5;

    const result = await client.search({
        collection_name: options.collection,
        vector: options.vector,
        limit: topK,
        filter: options.filter ?? '',
        output_fields: options.outputFields ?? ['text', 'source'],
    });

    return (result.results ?? []).map((r: Record<string, unknown>) => ({
        id: String(r['id'] ?? ''),
        score: Number(r['score'] ?? 0),
        text: String(r['text'] ?? ''),
        metadata: Object.fromEntries(
            Object.entries(r).filter(([k]) => !['id', 'score', 'text'].includes(k))
        ),
    }));
}

/**
 * Delete data berdasarkan filter expression
 */
export async function deleteByFilter(
    collection: string,
    filter: string
): Promise<void> {
    const client = getClient();
    await client.delete({
        collection_name: collection,
        filter,
    });
}

/**
 * Get collection row count
 */
export async function getCollectionCount(collection: string): Promise<number> {
    const client = getClient();
    const result = await client.getCollectionStatistics({
        collection_name: collection,
    });
    const rowCount = result.data?.row_count ?? result?.stats?.find(
        (s) => s.key === 'row_count'
    )?.value;
    return Number(rowCount ?? 0);
}

// === Status ===

/**
 * Format status semua collections
 */
export async function formatCollectionStatus(): Promise<string> {
    const client = getClient();
    const lines = ['📊 Milvus Collections:'];

    for (const schema of ALL_COLLECTIONS) {
        const exists = await client.hasCollection({ collection_name: schema.name });
        if (exists.value) {
            const count = await getCollectionCount(schema.name);
            lines.push(`  ✅ ${schema.name} — ${count} rows`);
        } else {
            lines.push(`  ⬜ ${schema.name} — not created`);
        }
    }

    return lines.join('\n');
}
