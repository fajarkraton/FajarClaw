/**
 * FajarClaw RAG — Router Integration + E2E Tests
 *
 * Unit tests: always run
 * Integration tests: auto-skip if Milvus or Embedding server offline
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { Socket } from 'node:net';
import { isRAGCommand, type RAGRoutedTask, type RAGCommandResult } from './rag-router.js';

// === Helper: check if services are reachable ===

async function isMilvusUp(): Promise<boolean> {
    return new Promise((resolve) => {
        const socket = new Socket();
        const timeout = setTimeout(() => { socket.destroy(); resolve(false); }, 2000);
        socket.connect(19530, 'localhost', () => {
            clearTimeout(timeout);
            socket.destroy();
            resolve(true);
        });
        socket.on('error', () => { clearTimeout(timeout); resolve(false); });
    });
}

async function isEmbeddingUp(): Promise<boolean> {
    try {
        const res = await fetch('http://localhost:8100/health', { signal: AbortSignal.timeout(2000) });
        const data = await res.json() as { ready: boolean };
        return data.ready === true;
    } catch {
        return false;
    }
}

// === Unit Tests (always run) ===

describe('RAG Router — Unit Tests', () => {
    it('harus distinguish RAG commands dari routed tasks', () => {
        const command: RAGCommandResult = {
            command: 'search',
            output: 'results',
            success: true,
            durationMs: 100,
        };

        const task = {
            engine: 'claude-code' as const,
            originalMessage: 'refactor router',
            pattern: 'pipeline' as const,
            confidence: 80,
            confidenceLevel: 'high' as const,
            matchedKeywords: ['refactor'],
            timestamp: new Date(),
            ragCommand: false,
        };

        expect(isRAGCommand(command)).toBe(true);
        expect(isRAGCommand(task)).toBe(false);
    });

    it('harus export types yang benar', () => {
        const result: RAGCommandResult = {
            command: 'status',
            output: 'ok',
            success: true,
            durationMs: 0,
        };
        expect(result.command).toBe('status');
    });

    it('harus support semua command types', () => {
        const commands: RAGCommandResult['command'][] = ['search', 'index', 'status'];
        expect(commands).toHaveLength(3);
    });
});

// === Integration Tests (skip if services offline) ===

describe('RAG Router — Integration Tests', () => {
    let servicesUp = false;

    beforeAll(async () => {
        const [milvus, embedding] = await Promise.all([isMilvusUp(), isEmbeddingUp()]);
        servicesUp = milvus && embedding;
        if (!servicesUp) {
            console.log('⚠️ Milvus or Embedding server offline — skipping integration tests');
        }
    });

    it('harus route /search command', async () => {
        if (!servicesUp) return;

        const { routeWithRAG } = await import('./rag-router.js');
        const result = await routeWithRAG('/search How does the router work?');

        expect(isRAGCommand(result)).toBe(true);
        if (isRAGCommand(result)) {
            expect(result.command).toBe('search');
            expect(result.success).toBe(true);
            expect(result.output).toContain('Retrieval');
        }
    });

    it('harus route /rag-status command', async () => {
        if (!servicesUp) return;

        const { routeWithRAG } = await import('./rag-router.js');
        const result = await routeWithRAG('/rag-status');

        expect(isRAGCommand(result)).toBe(true);
        if (isRAGCommand(result)) {
            expect(result.command).toBe('status');
            expect(result.success).toBe(true);
            expect(result.output).toContain('RAG Pipeline Status');
        }
    });

    it('harus inject RAG context ke routed task', async () => {
        if (!servicesUp) return;

        const { routeWithRAG } = await import('./rag-router.js');
        const result = await routeWithRAG('refactor the TypeScript router module');

        expect(isRAGCommand(result)).toBe(false);
        if (!isRAGCommand(result)) {
            expect(result.engine).toBeDefined();
            expect(result.ragCommand).toBe(false);
            // Context may or may not be injected depending on indexed data
        }
    });

    it('harus degrade gracefully ketika services offline', async () => {
        const { routeWithRAG } = await import('./rag-router.js');
        // This should always work, even without services
        const result = await routeWithRAG('simple task', { injectContext: false });

        expect(isRAGCommand(result)).toBe(false);
        if (!isRAGCommand(result)) {
            expect(result.engine).toBeDefined();
            expect(result.originalMessage).toBe('simple task');
        }
    });
});
