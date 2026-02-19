/**
 * FajarClaw RAG — Visual Embedder Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    embedImage,
    embedImageText,
    embedTextForVisual,
    isVisualServerReady,
    getVisualHealth,
    isSupportedImage,
    formatVisualEmbedStatus,
    setMockMode,
    isMockMode,
    setVisualServerUrl,
    getVisualServerUrl,
    VISUAL_EMBED_DIM,
    SUPPORTED_EXTENSIONS,
} from './visual-embedder.js';

describe('Visual Embedder — Mock Mode', () => {
    beforeEach(() => {
        setMockMode(true);
    });

    it('harus embed image in mock mode', async () => {
        const result = await embedImage('/tmp/test-image.png');
        expect(result.dense.length).toBe(VISUAL_EMBED_DIM);
        expect(result.isMock).toBe(true);
    });

    it('harus produce deterministic mock embeddings', async () => {
        const r1 = await embedImage('/tmp/test.png');
        const r2 = await embedImage('/tmp/test.png');
        expect(r1.dense).toEqual(r2.dense);
    });

    it('harus produce different embeddings for different images', async () => {
        const r1 = await embedImage('/tmp/a.png');
        const r2 = await embedImage('/tmp/b.png');
        expect(r1.dense).not.toEqual(r2.dense);
    });

    it('harus produce unit vectors', async () => {
        const result = await embedImage('/tmp/test.png');
        const norm = Math.sqrt(result.dense.reduce((s, v) => s + v * v, 0));
        expect(norm).toBeCloseTo(1.0, 4);
    });

    it('harus embed image+text cross-modal', async () => {
        const result = await embedImageText('/tmp/test.png', 'login form design');
        expect(result.dense.length).toBe(VISUAL_EMBED_DIM);
        expect(result.isMock).toBe(true);
    });

    it('harus embed text for visual search', async () => {
        const result = await embedTextForVisual('dashboard layout');
        expect(result.dense.length).toBe(VISUAL_EMBED_DIM);
        expect(result.isMock).toBe(true);
    });

    it('harus reject unsupported formats', async () => {
        await expect(embedImage('/tmp/test.txt')).rejects.toThrow('Unsupported image format');
        await expect(embedImage('/tmp/test.pdf')).rejects.toThrow('Unsupported image format');
    });
});

describe('isSupportedImage', () => {
    it('harus accept supported formats', () => {
        expect(isSupportedImage('test.png')).toBe(true);
        expect(isSupportedImage('test.jpg')).toBe(true);
        expect(isSupportedImage('test.jpeg')).toBe(true);
        expect(isSupportedImage('test.webp')).toBe(true);
        expect(isSupportedImage('test.gif')).toBe(true);
        expect(isSupportedImage('test.svg')).toBe(true);
    });

    it('harus reject unsupported formats', () => {
        expect(isSupportedImage('test.txt')).toBe(false);
        expect(isSupportedImage('test.pdf')).toBe(false);
        expect(isSupportedImage('test.ts')).toBe(false);
    });
});

describe('Visual Embedder — Config', () => {
    it('harus set and get server URL', () => {
        const original = getVisualServerUrl();
        setVisualServerUrl('http://test:9999');
        expect(getVisualServerUrl()).toBe('http://test:9999');
        setVisualServerUrl(original);
    });

    it('harus set and get mock mode', () => {
        setMockMode(true);
        expect(isMockMode()).toBe(true);
        setMockMode(false);
        expect(isMockMode()).toBe(false);
        setMockMode(true); // Reset
    });
});

describe('Visual Embedder — Health (Mock)', () => {
    beforeEach(() => setMockMode(true));

    it('harus report ready in mock mode', async () => {
        expect(await isVisualServerReady()).toBe(true);
    });

    it('harus return mock health', async () => {
        const health = await getVisualHealth();
        expect(health.status).toBe('mock');
        expect(health.dimension).toBe(VISUAL_EMBED_DIM);
    });

    it('harus format health status', async () => {
        const health = await getVisualHealth();
        const formatted = formatVisualEmbedStatus(health);
        expect(formatted).toContain('👁️ Visual Embedder');
        expect(formatted).toContain('Mock');
        expect(formatted).toContain(String(VISUAL_EMBED_DIM));
    });
});

describe('Constants', () => {
    it('harus have correct visual dim', () => {
        expect(VISUAL_EMBED_DIM).toBe(2048);
    });

    it('harus have supported extensions', () => {
        expect(SUPPORTED_EXTENSIONS.length).toBeGreaterThan(4);
        expect(SUPPORTED_EXTENSIONS).toContain('.png');
        expect(SUPPORTED_EXTENSIONS).toContain('.jpg');
    });
});
