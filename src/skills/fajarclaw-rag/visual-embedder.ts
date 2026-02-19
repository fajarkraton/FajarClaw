/**
 * FajarClaw RAG — Visual Embedder
 * @ref FC-PRD-01 §10.13 (Visual RAG)
 *
 * Client for Qwen3-VL-Embedding-2B visual embedding model.
 * Supports image → 2048-dim vector, text+image cross-modal,
 * and mock mode for testing without the actual model.
 *
 * Phase A5: Visual RAG
 */

import { readFile } from 'fs/promises';
import { extname } from 'path';

// === Types ===

export interface VisualEmbedding {
    /** 2048-dimension dense vector */
    dense: number[];
    /** Whether mock embeddings were used */
    isMock: boolean;
}

export interface VisualEmbedOptions {
    /** Image file path */
    imagePath: string;
    /** Optional text caption for cross-modal */
    caption?: string;
    /** Viewport size for context */
    viewport?: { width: number; height: number };
}

export interface VisualEmbedServerHealth {
    /** Server status */
    status: 'healthy' | 'unhealthy' | 'mock';
    /** Model loaded */
    model: string;
    /** GPU available */
    gpu: boolean;
    /** Embedding dimension */
    dimension: number;
}

// === Constants ===

const VISUAL_EMBED_DIM = 2048;
const SUPPORTED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg'];

// === Server Config ===

let serverUrl = process.env['VISUAL_EMBED_URL'] ?? 'http://localhost:8002';
let mockMode = true; // Default mock until real server available

/**
 * Set the visual embedding server URL
 */
export function setVisualServerUrl(url: string): void {
    serverUrl = url;
}

/**
 * Get the visual embedding server URL
 */
export function getVisualServerUrl(): string {
    return serverUrl;
}

/**
 * Enable/disable mock mode
 */
export function setMockMode(enabled: boolean): void {
    mockMode = enabled;
}

/**
 * Check if in mock mode
 */
export function isMockMode(): boolean {
    return mockMode;
}

/**
 * Auto-detect mode: probe the visual server and switch to real mode if healthy.
 * Call this on startup to automatically use real Qwen3-VL when available.
 * @ref FC-PRD-01 §10.13 (Visual RAG)
 */
export async function autoDetectMode(): Promise<boolean> {
    try {
        const response = await fetch(`${serverUrl}/health`, {
            signal: AbortSignal.timeout(2000),
        });
        if (response.ok) {
            const data = await response.json() as Record<string, unknown>;
            if (data['status'] === 'healthy') {
                mockMode = false;
                return true; // Real mode activated
            }
        }
    } catch {
        // Server not available — stay in mock mode
    }
    mockMode = true;
    return false;
}

// === Mock Embedding ===

/**
 * Generate a deterministic mock embedding from content hash.
 * Produces consistent vectors for the same input.
 */
function generateMockEmbedding(seed: string): number[] {
    const vector: number[] = [];
    let hash = 0;

    for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
    }

    for (let i = 0; i < VISUAL_EMBED_DIM; i++) {
        // Simple PRNG seeded by hash + position
        hash = ((hash * 1103515245 + 12345) & 0x7fffffff);
        vector.push((hash / 0x7fffffff) * 2 - 1); // Range [-1, 1]
    }

    // Normalize to unit vector
    const norm = Math.sqrt(vector.reduce((s, v) => s + v * v, 0));
    return vector.map(v => v / norm);
}

// === Core Functions ===

/**
 * Embed an image file into a 2048-dim vector.
 *
 * @param imagePath - Path to image file
 * @returns VisualEmbedding with dense vector
 */
export async function embedImage(imagePath: string): Promise<VisualEmbedding> {
    const ext = extname(imagePath).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
        throw new Error(`Unsupported image format: ${ext}. Supported: ${SUPPORTED_EXTENSIONS.join(', ')}`);
    }

    if (mockMode) {
        return {
            dense: generateMockEmbedding(`image:${imagePath}`),
            isMock: true,
        };
    }

    // Real server call
    const imageBuffer = await readFile(imagePath);
    const base64 = imageBuffer.toString('base64');

    const response = await fetch(`${serverUrl}/embed-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            image: base64,
            format: ext.slice(1),
        }),
    });

    if (!response.ok) {
        throw new Error(`Visual embed server error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { vector: number[] };

    return {
        dense: data.vector,
        isMock: false,
    };
}

/**
 * Embed image with text caption for cross-modal embedding.
 * Produces a joint text+image vector.
 */
export async function embedImageText(
    imagePath: string,
    caption: string
): Promise<VisualEmbedding> {
    if (mockMode) {
        return {
            dense: generateMockEmbedding(`cross:${imagePath}:${caption}`),
            isMock: true,
        };
    }

    const imageBuffer = await readFile(imagePath);
    const ext = extname(imagePath).toLowerCase();
    const base64 = imageBuffer.toString('base64');

    const response = await fetch(`${serverUrl}/embed-cross-modal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            image: base64,
            text: caption,
            format: ext.slice(1),
        }),
    });

    if (!response.ok) {
        throw new Error(`Visual embed server error: ${response.status}`);
    }

    const data = await response.json() as { vector: number[] };

    return {
        dense: data.vector,
        isMock: false,
    };
}

/**
 * Embed a text query for cross-modal visual search.
 * In real mode, uses the VL model's text encoder.
 * In mock mode, generates from text seed.
 */
export async function embedTextForVisual(text: string): Promise<VisualEmbedding> {
    if (mockMode) {
        return {
            dense: generateMockEmbedding(`text-visual:${text}`),
            isMock: true,
        };
    }

    const response = await fetch(`${serverUrl}/embed-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
    });

    if (!response.ok) {
        throw new Error(`Visual embed server error: ${response.status}`);
    }

    const data = await response.json() as { vector: number[] };

    return {
        dense: data.vector,
        isMock: false,
    };
}

// === Health & Status ===

/**
 * Check if visual embedding server is ready
 */
export async function isVisualServerReady(): Promise<boolean> {
    if (mockMode) return true;

    try {
        const response = await fetch(`${serverUrl}/health`, { signal: AbortSignal.timeout(3000) });
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Get visual embedding server health
 */
export async function getVisualHealth(): Promise<VisualEmbedServerHealth> {
    if (mockMode) {
        return {
            status: 'mock',
            model: 'mock-visual-embedder',
            gpu: false,
            dimension: VISUAL_EMBED_DIM,
        };
    }

    try {
        const response = await fetch(`${serverUrl}/health`, { signal: AbortSignal.timeout(3000) });
        if (!response.ok) {
            return { status: 'unhealthy', model: 'unknown', gpu: false, dimension: VISUAL_EMBED_DIM };
        }
        const data = await response.json() as Record<string, unknown>;
        return {
            status: 'healthy',
            model: String(data['model'] ?? 'Qwen3-VL-Embedding-2B'),
            gpu: Boolean(data['gpu'] ?? false),
            dimension: Number(data['dimension'] ?? VISUAL_EMBED_DIM),
        };
    } catch {
        return { status: 'unhealthy', model: 'unknown', gpu: false, dimension: VISUAL_EMBED_DIM };
    }
}

/**
 * Validate if a file is a supported image
 */
export function isSupportedImage(filePath: string): boolean {
    const ext = extname(filePath).toLowerCase();
    return SUPPORTED_EXTENSIONS.includes(ext);
}

/**
 * Format visual embedding status for display
 */
export function formatVisualEmbedStatus(health: VisualEmbedServerHealth): string {
    const lines = [
        `👁️ Visual Embedder: ${health.status === 'healthy' ? '✅' : health.status === 'mock' ? '🔶 Mock' : '❌'}`,
        `  Model: ${health.model}`,
        `  GPU: ${health.gpu ? '✅ CUDA' : '❌ CPU'}`,
        `  Dim: ${health.dimension}`,
    ];
    return lines.join('\n');
}

// Exports
export { VISUAL_EMBED_DIM, SUPPORTED_EXTENSIONS };
