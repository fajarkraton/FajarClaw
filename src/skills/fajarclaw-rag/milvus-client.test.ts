/**
 * FajarClaw RAG — Milvus Client Integration Tests
 *
 * REQUIRES: Milvus running at localhost:19530
 * Start: sudo docker compose -f docker/milvus.yml up -d
 *
 * Run specifically: pnpm test src/skills/fajarclaw-rag/milvus-client.test.ts
 * Skipped automatically when Milvus is not running.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Socket } from 'node:net';
import {
    connect,
    disconnect,
    createAllCollections,
    dropAllCollections,
    listCollections,
    insert,
    search,
    getCollectionCount,
    formatCollectionStatus,
} from './milvus-client.js';
import { ALL_COLLECTIONS, DENSE_DIM } from './collection-schemas.js';
import { randomUUID } from 'node:crypto';

const MILVUS_HOST = process.env['MILVUS_HOST'] ?? 'localhost';
const MILVUS_PORT = Number(process.env['MILVUS_PORT'] ?? '19530');
const MILVUS_URI = `${MILVUS_HOST}:${MILVUS_PORT}`;

/**
 * Check if Milvus port is reachable (TCP connect, no gRPC)
 */
async function isMilvusReachable(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
        const socket = new Socket();
        socket.setTimeout(2000);
        socket.once('connect', () => { socket.destroy(); resolve(true); });
        socket.once('timeout', () => { socket.destroy(); resolve(false); });
        socket.once('error', () => { socket.destroy(); resolve(false); });
        socket.connect(MILVUS_PORT, MILVUS_HOST);
    });
}

const milvusUp = await isMilvusReachable();

describe.skipIf(!milvusUp)('Milvus Client — Integration Tests', () => {

    beforeAll(async () => {
        await connect({ uri: MILVUS_URI });
        await dropAllCollections();
    }, 30000);

    afterAll(async () => {
        await dropAllCollections();
        await disconnect();
    }, 30000);

    it('harus bisa create all 7 collections', async () => {
        const created = await createAllCollections();
        expect(created.length).toBe(7);
        expect(created).toContain('fc_documents');
        expect(created).toContain('fc_codebase');
    }, 60000);

    it('harus skip existing collections pada create ulang', async () => {
        const created = await createAllCollections();
        expect(created.length).toBe(0);
    }, 30000);

    it('harus bisa list all collections', async () => {
        const collections = await listCollections();
        for (const schema of ALL_COLLECTIONS) {
            expect(collections).toContain(schema.name);
        }
    });

    it('harus bisa insert data ke fc_documents', async () => {
        const denseVector = Array.from({ length: DENSE_DIM }, () => Math.random() - 0.5);
        const testId = randomUUID();

        const inserted = await insert('fc_documents', [{
            id: testId,
            text: 'FajarClaw adalah Automatic Digital Programmer System',
            dense_vector: denseVector,
            sparse_vector: { 42: 0.8, 100: 0.5, 256: 0.3 },
            source: 'test.md',
            doc_type: 'prd',
            section: 'Overview',
            chunk_index: 0,
            created_at: Date.now(),
        }]);

        expect(inserted).toBe(1);
    }, 15000);

    it('harus bisa search vector di fc_documents', async () => {
        await new Promise(r => setTimeout(r, 1500)); // flush delay

        const count = await getCollectionCount('fc_documents');
        expect(count).toBeGreaterThanOrEqual(1);

        const queryVector = Array.from({ length: DENSE_DIM }, () => Math.random() - 0.5);
        const results = await search({
            collection: 'fc_documents',
            vector: queryVector,
            topK: 3,
            outputFields: ['text', 'source', 'doc_type'],
        });

        expect(results.length).toBeGreaterThanOrEqual(1);
        expect(results[0]!.text).toBeTruthy();
    }, 15000);

    it('harus bisa format collection status', async () => {
        const status = await formatCollectionStatus();
        expect(status).toContain('Milvus Collections');
        expect(status).toContain('fc_documents');
        expect(status).toContain('✅');
    });
});
