/**
 * FajarClaw RAG — Embedder Tests
 *
 * - Unit tests: always run (mock/offline safe)
 * - Integration tests: require embedding server at localhost:8100
 *   Start: cd FajarClaw && source .venv/bin/activate && python python/embedding_server.py
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { Socket } from 'node:net';
import {
    embed,
    embedSingle,
    embedBatch,
    isServerReady,
    getHealth,
    setServerUrl,
    getServerUrl,
    formatEmbedStatus,
} from './embedder.js';

const EMBED_HOST = 'localhost';
const EMBED_PORT = 8100;

async function isEmbedReachable(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
        const socket = new Socket();
        socket.setTimeout(2000);
        socket.once('connect', () => { socket.destroy(); resolve(true); });
        socket.once('timeout', () => { socket.destroy(); resolve(false); });
        socket.once('error', () => { socket.destroy(); resolve(false); });
        socket.connect(EMBED_PORT, EMBED_HOST);
    });
}

// === Unit Tests (no server needed) ===

describe('Embedder — Unit Tests', () => {
    it('setServerUrl harus update URL', () => {
        const original = getServerUrl();
        setServerUrl('http://custom:9999');
        expect(getServerUrl()).toBe('http://custom:9999');
        setServerUrl(original); // restore
    });

    it('embed harus return empty untuk texts kosong', async () => {
        const result = await embed({ texts: [] });
        expect(result.results).toHaveLength(0);
        expect(result.durationMs).toBe(0);
    });

    it('isServerReady harus return false jika server offline', async () => {
        const original = getServerUrl();
        setServerUrl('http://localhost:19999'); // non-existent
        const ready = await isServerReady();
        expect(ready).toBe(false);
        setServerUrl(original);
    });

    it('formatEmbedStatus harus handle offline server', async () => {
        const original = getServerUrl();
        setServerUrl('http://localhost:19999');
        const status = await formatEmbedStatus();
        expect(status).toContain('🔴');
        expect(status).toContain('not reachable');
        setServerUrl(original);
    });
});

// === Integration Tests ===

const embedUp = await isEmbedReachable();

describe.skipIf(!embedUp)('Embedder — Integration Tests', () => {
    beforeAll(() => {
        setServerUrl(`http://${EMBED_HOST}:${EMBED_PORT}`);
    });

    it('health check harus return ready', async () => {
        const health = await getHealth();
        expect(health.ready).toBe(true);
        expect(health.model).toContain('bge');
        expect(health.status).toBe('ok');
    });

    it('embed single text harus return 1024d dense vector', async () => {
        const result = await embedSingle('FajarClaw adalah sistem ADPS');
        expect(result.dense).toHaveLength(1024);
        expect(result.sparse).toBeDefined();
        expect(Object.keys(result.sparse!).length).toBeGreaterThan(0);
    }, 30000);

    it('embed batch harus return multiple results', async () => {
        const texts = [
            'Buat REST API endpoint',
            'Buat UI komponen login',
            'Deploy ke production',
        ];
        const results = await embedBatch(texts, 2);
        expect(results).toHaveLength(3);
        for (const r of results) {
            expect(r.dense).toHaveLength(1024);
        }
    }, 30000);

    it('formatEmbedStatus harus show ready status', async () => {
        const status = await formatEmbedStatus();
        expect(status).toContain('🟢');
        expect(status).toContain('bge');
    });
});
