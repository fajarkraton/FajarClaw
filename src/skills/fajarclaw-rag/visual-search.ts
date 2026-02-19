/**
 * FajarClaw RAG — Visual Search
 * @ref FC-PRD-01 §10.15 (Visual Search)
 *
 * Cross-modal search: text query → image results, image → similar images.
 * Supports fc_visual, fc_mockups, fc_vistests collections.
 *
 * Phase A5: Visual RAG
 */

import { search } from './milvus-client.js';
import { embedTextForVisual, embedImage } from './visual-embedder.js';

// === Types ===

export interface VisualSearchResult {
    /** Document ID */
    id: string;
    /** Description/text */
    text: string;
    /** Source file path */
    source: string;
    /** Component name */
    component: string;
    /** Similarity score */
    score: number;
}

export interface VisualSearchResponse {
    /** Matched images */
    results: VisualSearchResult[];
    /** Query used */
    query: string;
    /** Search mode */
    mode: 'text-to-image' | 'image-to-image';
    /** Collection searched */
    collection: string;
    /** Duration in ms */
    durationMs: number;
}

export type VisualCollection = 'fc_visual' | 'fc_mockups' | 'fc_vistests';

// === Core Functions ===

/**
 * Search for images using a text query (cross-modal).
 * Embeds text with visual encoder, then searches image collection.
 */
export async function searchVisual(
    query: string,
    collection: VisualCollection = 'fc_visual',
    topK: number = 5
): Promise<VisualSearchResponse> {
    const start = Date.now();

    const embedding = await embedTextForVisual(query);

    const results = await search({
        collection,
        vector: embedding.dense,
        topK,
        outputFields: ['text', 'source', 'component'],
    });

    return {
        results: results.map(r => ({
            id: String(r.id),
            text: String(r.text),
            source: String(r.metadata?.['source'] ?? ''),
            component: String(r.metadata?.['component'] ?? ''),
            score: r.score,
        })),
        query,
        mode: 'text-to-image',
        collection,
        durationMs: Date.now() - start,
    };
}

/**
 * Search for similar images using an image file (image-to-image).
 */
export async function searchSimilarImage(
    imagePath: string,
    collection: VisualCollection = 'fc_visual',
    topK: number = 5
): Promise<VisualSearchResponse> {
    const start = Date.now();

    const embedding = await embedImage(imagePath);

    const results = await search({
        collection,
        vector: embedding.dense,
        topK,
        outputFields: ['text', 'source', 'component'],
    });

    return {
        results: results.map(r => ({
            id: String(r.id),
            text: String(r.text),
            source: String(r.metadata?.['source'] ?? ''),
            component: String(r.metadata?.['component'] ?? ''),
            score: r.score,
        })),
        query: imagePath,
        mode: 'image-to-image',
        collection,
        durationMs: Date.now() - start,
    };
}

/**
 * Search across all visual collections
 */
export async function searchAllVisual(
    query: string,
    topK: number = 5
): Promise<VisualSearchResult[]> {
    const collections: VisualCollection[] = ['fc_visual', 'fc_mockups'];
    const allResults: VisualSearchResult[] = [];

    for (const col of collections) {
        try {
            const response = await searchVisual(query, col, topK);
            allResults.push(...response.results);
        } catch {
            // Skip unavailable collections
        }
    }

    // Sort by score, deduplicate, return top K
    return allResults
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
}

// === Formatting ===

/**
 * Format visual search results for display
 */
export function formatVisualSearchResults(response: VisualSearchResponse): string {
    const lines = [
        `🔍 Visual Search: "${response.query}"`,
        `  Mode: ${response.mode} | Collection: ${response.collection} | ${response.durationMs}ms`,
        `${'─'.repeat(50)}`,
    ];

    if (response.results.length === 0) {
        lines.push('  No visual matches found.');
        return lines.join('\n');
    }

    for (let i = 0; i < response.results.length; i++) {
        const r = response.results[i]!;
        const scorePct = (r.score * 100).toFixed(0);
        lines.push(`  ${i + 1}. [${scorePct}%] ${r.component || r.text.slice(0, 60)}`);
        if (r.source) lines.push(`     📁 ${r.source}`);
    }

    return lines.join('\n');
}
