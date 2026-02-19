/**
 * FajarClaw RAG — Indexer
 * @ref FC-PRD-01 §10.2 (Ingestion Pipeline)
 *
 * Pipeline: file → chunk → embed → insert to Milvus
 * Supports single file, directory, and auto file-watcher modes.
 */

import { readFile, readdir, stat, watch } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { chunkFile } from './chunker.js';
import { embedBatch } from './embedder.js';
import { insert } from './milvus-client.js';

// === Types ===

export interface IndexResult {
    /** Source file path */
    source: string;
    /** Number of chunks created */
    chunks: number;
    /** Number of chunks inserted */
    inserted: number;
    /** Duration in ms */
    durationMs: number;
    /** Errors if any */
    errors: string[];
}

export interface IndexOptions {
    /** Target Milvus collection (default: fc_documents or fc_codebase) */
    collection?: string;
    /** Document type tag */
    docType?: string;
    /** Extensions to include (default: common code + markdown) */
    extensions?: string[];
    /** Directories to skip */
    skipDirs?: string[];
    /** Max chunk size */
    maxChunkSize?: number;
    /** Embedding batch size (default: 16) */
    embedBatchSize?: number;
}

const DEFAULT_EXTENSIONS = [
    '.ts', '.tsx', '.js', '.jsx', '.py', '.rs', '.go',
    '.md', '.mdx', '.txt',
];

const DEFAULT_SKIP_DIRS = [
    'node_modules', '.git', '.venv', 'dist', 'build', '__pycache__',
    '.next', 'coverage', '.turbo',
];

// === Single File Indexing ===

/**
 * Index a single file: read → chunk → embed → insert
 */
export async function indexFile(
    filepath: string,
    options?: IndexOptions
): Promise<IndexResult> {
    const start = Date.now();
    const errors: string[] = [];

    try {
        // Read file
        const content = await readFile(filepath, 'utf-8');
        if (!content.trim()) {
            return { source: filepath, chunks: 0, inserted: 0, durationMs: Date.now() - start, errors: ['Empty file'] };
        }

        // Chunk
        const chunks = chunkFile(content, filepath, {
            maxChunkSize: options?.maxChunkSize,
        });

        if (chunks.length === 0) {
            return { source: filepath, chunks: 0, inserted: 0, durationMs: Date.now() - start, errors: [] };
        }

        // Determine collection
        const collection = options?.collection ?? autoSelectCollection(filepath);

        // Embed in batches
        const batchSize = options?.embedBatchSize ?? 16;
        const texts = chunks.map(c => c.text);
        const embeddings = await embedBatch(texts, batchSize);

        // Prepare Milvus data
        const data = chunks.map((chunk, i) => ({
            id: chunk.id || randomUUID(),
            text: chunk.text.slice(0, 65535), // VarChar limit
            dense_vector: embeddings[i]!.dense,
            sparse_vector: embeddings[i]!.sparse ?? {},
            source: chunk.source,
            ...(collection === 'fc_documents' ? {
                doc_type: options?.docType ?? detectDocType(filepath),
                section: chunk.section,
                chunk_index: chunk.chunkIndex,
            } : {
                language: chunk.language ?? '',
                symbol: chunk.symbol ?? '',
                chunk_type: chunk.chunkType ?? 'module',
            }),
            created_at: Date.now(),
        }));

        // Insert to Milvus
        const inserted = await insert(collection, data);

        return {
            source: filepath,
            chunks: chunks.length,
            inserted,
            durationMs: Date.now() - start,
            errors,
        };

    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(msg);
        return { source: filepath, chunks: 0, inserted: 0, durationMs: Date.now() - start, errors };
    }
}

// === Directory Indexing ===

/**
 * Index all files in a directory (recursive)
 */
export async function indexDirectory(
    dirPath: string,
    options?: IndexOptions
): Promise<IndexResult[]> {
    const extensions = options?.extensions ?? DEFAULT_EXTENSIONS;
    const skipDirs = options?.skipDirs ?? DEFAULT_SKIP_DIRS;

    const files = await collectFiles(dirPath, extensions, skipDirs);
    const results: IndexResult[] = [];

    for (const file of files) {
        const result = await indexFile(file, options);
        results.push(result);
    }

    return results;
}

/**
 * Recursively collect files matching extensions
 */
async function collectFiles(
    dirPath: string,
    extensions: string[],
    skipDirs: string[]
): Promise<string[]> {
    const files: string[] = [];
    const entries = await readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = resolve(dirPath, entry.name);

        if (entry.isDirectory()) {
            if (skipDirs.includes(entry.name)) continue;
            const subFiles = await collectFiles(fullPath, extensions, skipDirs);
            files.push(...subFiles);
        } else if (entry.isFile()) {
            const ext = extname(entry.name).toLowerCase();
            if (extensions.includes(ext)) {
                files.push(fullPath);
            }
        }
    }

    return files;
}

// === File Watcher ===

/**
 * Watch a directory for changes and auto-index modified files.
 * Returns an AbortController to stop watching.
 */
export function watchAndIndex(
    dirPath: string,
    options?: IndexOptions,
    onResult?: (result: IndexResult) => void
): AbortController {
    const controller = new AbortController();
    const extensions = options?.extensions ?? DEFAULT_EXTENSIONS;
    const skipDirs = options?.skipDirs ?? DEFAULT_SKIP_DIRS;

    // Debounce map
    const pending = new Map<string, NodeJS.Timeout>();

    (async () => {
        try {
            const watcher = watch(dirPath, {
                recursive: true,
                signal: controller.signal,
            });

            for await (const event of watcher) {
                if (!event.filename) continue;

                const fullPath = resolve(dirPath, event.filename);
                const ext = extname(event.filename).toLowerCase();

                // Skip non-matching extensions
                if (!extensions.includes(ext)) continue;

                // Skip ignored directories
                if (skipDirs.some(d => event.filename!.includes(`/${d}/`) || event.filename!.startsWith(`${d}/`))) continue;

                // Debounce — wait 500ms before indexing
                if (pending.has(fullPath)) {
                    clearTimeout(pending.get(fullPath));
                }

                pending.set(fullPath, setTimeout(async () => {
                    pending.delete(fullPath);
                    try {
                        const fileStat = await stat(fullPath);
                        if (!fileStat.isFile()) return;

                        const result = await indexFile(fullPath, options);
                        onResult?.(result);
                    } catch {
                        // File might have been deleted
                    }
                }, 500));
            }
        } catch (err) {
            if ((err as Error).name !== 'AbortError') {
                throw err;
            }
        }
    })();

    return controller;
}

// === Utilities ===

/**
 * Auto-select Milvus collection based on file type
 */
function autoSelectCollection(filepath: string): string {
    const ext = extname(filepath).toLowerCase();
    const docExts = ['.md', '.mdx', '.txt', '.rst'];
    return docExts.includes(ext) ? 'fc_documents' : 'fc_codebase';
}

/**
 * Detect document type from filepath
 */
function detectDocType(filepath: string): string {
    const lower = filepath.toLowerCase();
    if (lower.includes('prd') || lower.includes('product')) return 'prd';
    if (lower.includes('spec') || lower.includes('requirement')) return 'spec';
    if (lower.includes('guide') || lower.includes('readme')) return 'guide';
    if (lower.includes('decision') || lower.includes('adr')) return 'decision';
    if (lower.includes('agent') || lower.includes('claude')) return 'guide';
    if (lower.includes('changelog')) return 'changelog';
    return 'document';
}

/**
 * Format index results summary
 */
export function formatIndexResults(results: IndexResult[]): string {
    const totalChunks = results.reduce((s, r) => s + r.chunks, 0);
    const totalInserted = results.reduce((s, r) => s + r.inserted, 0);
    const totalDuration = results.reduce((s, r) => s + r.durationMs, 0);
    const totalErrors = results.reduce((s, r) => s + r.errors.length, 0);

    const lines = [
        `📥 Indexing Complete:`,
        `  📄 Files: ${results.length}`,
        `  🧩 Chunks: ${totalChunks}`,
        `  ✅ Inserted: ${totalInserted}`,
        `  ⏱️  Duration: ${(totalDuration / 1000).toFixed(1)}s`,
    ];

    if (totalErrors > 0) {
        lines.push(`  ⚠️  Errors: ${totalErrors}`);
        for (const r of results) {
            for (const err of r.errors) {
                lines.push(`    ❌ ${r.source}: ${err}`);
            }
        }
    }

    return lines.join('\n');
}
