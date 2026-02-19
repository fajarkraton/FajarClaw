/**
 * FajarClaw RAG — Visual Indexer
 * @ref FC-PRD-01 §10.14 (Visual Ingestion)
 *
 * Index screenshots and mockups into Milvus visual collections.
 * Supports batch folder scanning and single-file ingestion.
 *
 * Phase A5: Visual RAG
 */

import { readdirSync, statSync } from 'fs';
import { join, basename, extname } from 'path';
import { createHash } from 'crypto';
import { embedImage, isSupportedImage } from './visual-embedder.js';
import { insert } from './milvus-client.js';

// === Types ===

export interface VisualMetadata {
    /** Page/view name (e.g., "login", "dashboard") */
    page?: string;
    /** Component name */
    component?: string;
    /** Sprint number */
    sprint?: number;
    /** Viewport size */
    viewport?: { width: number; height: number };
    /** Source code file that generates this view */
    sourceFile?: string;
    /** Additional tags */
    tags?: string[];
}

export interface VisualIndexResult {
    /** File path */
    path: string;
    /** Generated ID */
    id: string;
    /** Target collection */
    collection: string;
    /** Whether indexing succeeded */
    success: boolean;
    /** Error if failed */
    error?: string;
}

export interface VisualIndexSummary {
    /** Total files processed */
    total: number;
    /** Successfully indexed */
    indexed: number;
    /** Skipped (unsupported format) */
    skipped: number;
    /** Failed */
    failed: number;
    /** Per-file results */
    results: VisualIndexResult[];
    /** Duration in ms */
    durationMs: number;
}

// === Constants ===

const VISUAL_COLLECTION = 'fc_visual';
const MOCKUPS_COLLECTION = 'fc_mockups';

// === Core Functions ===

/**
 * Generate a unique ID for a visual asset
 */
function generateVisualId(filePath: string): string {
    return createHash('sha256')
        .update(`visual:${filePath}:${Date.now()}`)
        .digest('hex')
        .slice(0, 32);
}

/**
 * Index a single screenshot into Milvus
 */
export async function indexScreenshot(
    imagePath: string,
    metadata?: VisualMetadata
): Promise<VisualIndexResult> {
    const id = generateVisualId(imagePath);

    try {
        const embedding = await embedImage(imagePath);

        await insert(VISUAL_COLLECTION, [{
            id,
            text: `Screenshot: ${basename(imagePath)} | ${metadata?.page ?? 'unknown'} | ${metadata?.component ?? ''}`,
            dense_vector: embedding.dense,
            source: imagePath,
            component: metadata?.component ?? basename(imagePath, extname(imagePath)),
            created_at: Date.now(),
        }]);

        return { path: imagePath, id, collection: VISUAL_COLLECTION, success: true };
    } catch (err) {
        return {
            path: imagePath,
            id,
            collection: VISUAL_COLLECTION,
            success: false,
            error: err instanceof Error ? err.message : String(err),
        };
    }
}

/**
 * Index a single mockup/wireframe into Milvus
 */
export async function indexMockup(
    imagePath: string,
    metadata?: VisualMetadata
): Promise<VisualIndexResult> {
    const id = generateVisualId(imagePath);

    try {
        const embedding = await embedImage(imagePath);

        await insert(MOCKUPS_COLLECTION, [{
            id,
            text: `Mockup: ${basename(imagePath)} | ${metadata?.page ?? 'design'} | ${metadata?.component ?? ''}`,
            dense_vector: embedding.dense,
            source: imagePath,
            component: metadata?.component ?? basename(imagePath, extname(imagePath)),
            created_at: Date.now(),
        }]);

        return { path: imagePath, id, collection: MOCKUPS_COLLECTION, success: true };
    } catch (err) {
        return {
            path: imagePath,
            id,
            collection: MOCKUPS_COLLECTION,
            success: false,
            error: err instanceof Error ? err.message : String(err),
        };
    }
}

/**
 * Scan a folder and index all screenshots
 */
export async function indexScreenshots(
    folder: string,
    metadata?: VisualMetadata
): Promise<VisualIndexSummary> {
    const start = Date.now();
    const results: VisualIndexResult[] = [];
    let skipped = 0;

    let files: string[];
    try {
        files = scanImageFiles(folder);
    } catch {
        return {
            total: 0, indexed: 0, skipped: 0, failed: 1,
            results: [{ path: folder, id: '', collection: VISUAL_COLLECTION, success: false, error: 'Cannot read directory' }],
            durationMs: Date.now() - start,
        };
    }

    for (const file of files) {
        if (!isSupportedImage(file)) {
            skipped++;
            continue;
        }
        const result = await indexScreenshot(file, {
            ...metadata,
            page: metadata?.page ?? basename(file, extname(file)),
        });
        results.push(result);
    }

    const indexed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return {
        total: files.length,
        indexed,
        skipped,
        failed,
        results,
        durationMs: Date.now() - start,
    };
}

/**
 * Recursively scan a directory for image files
 */
function scanImageFiles(dir: string, maxDepth: number = 3, depth: number = 0): string[] {
    if (depth >= maxDepth) return [];

    const files: string[] = [];
    const entries = readdirSync(dir);

    for (const entry of entries) {
        const fullPath = join(dir, entry);
        try {
            const stat = statSync(fullPath);
            if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
                files.push(...scanImageFiles(fullPath, maxDepth, depth + 1));
            } else if (stat.isFile() && isSupportedImage(fullPath)) {
                files.push(fullPath);
            }
        } catch {
            // Skip unreadable files
        }
    }

    return files;
}

// === Formatting ===

/**
 * Format visual index summary for display
 */
export function formatVisualIndexSummary(summary: VisualIndexSummary): string {
    const lines = [
        `📸 Visual Indexing Complete`,
        `${'─'.repeat(40)}`,
        `  Indexed: ${summary.indexed} | Skipped: ${summary.skipped} | Failed: ${summary.failed}`,
        `  Duration: ${summary.durationMs}ms`,
    ];

    if (summary.failed > 0) {
        lines.push('', '  Failures:');
        for (const r of summary.results.filter(r => !r.success)) {
            lines.push(`    ❌ ${basename(r.path)}: ${r.error}`);
        }
    }

    return lines.join('\n');
}
