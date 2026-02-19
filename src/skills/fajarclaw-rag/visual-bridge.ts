/**
 * FajarClaw RAG — Visual-Code Bridge
 * @ref FC-PRD-01 §10.16 (Visual-Code Bridge)
 *
 * Links screenshots to source code and enables:
 * - Upload screenshot → find code that produces similar UI
 * - Visual diff: compare current vs baseline screenshots
 * - "buat seperti halaman ini" → find existing code
 *
 * Phase A5: Visual RAG
 */

import { searchSimilarImage } from './visual-search.js';
import { retrieve } from './retriever.js';

// === Types ===

export interface CodeForScreenshot {
    /** Visual matches (images similar to input) */
    visualMatches: Array<{
        source: string;
        component: string;
        score: number;
    }>;
    /** Code matches (source files related to visual) */
    codeMatches: Array<{
        text: string;
        source: string;
        score: number;
    }>;
    /** Duration in ms */
    durationMs: number;
}

export interface VisualDiffResult {
    /** Current screenshot path */
    current: string;
    /** Baseline screenshot path */
    baseline: string;
    /** Similarity score (1.0 = identical) */
    similarity: number;
    /** Whether visually changed */
    hasChanged: boolean;
    /** Change threshold used */
    threshold: number;
}

export interface VisualDiffReport {
    /** All diff results */
    diffs: VisualDiffResult[];
    /** Components that changed */
    changed: string[];
    /** Components that are stable */
    stable: string[];
    /** Duration in ms */
    durationMs: number;
}

export interface ScreenshotMapping {
    /** Screenshot file path */
    screenshot: string;
    /** Source code file path */
    sourceFile: string;
    /** Component name */
    component: string;
    /** Page/route */
    page: string;
    /** Sprint when captured */
    sprint: number;
    /** Timestamp */
    timestamp: number;
}

// === Constants ===

const DEFAULT_DIFF_THRESHOLD = 0.85; // Below this = "changed"

// === Core Functions ===

/**
 * Find source code that produces a similar UI to a given screenshot.
 *
 * 1. Search visual collections for similar images
 * 2. Extract component/page names from matches
 * 3. Search codebase for those components
 */
export async function findCodeForScreenshot(
    imagePath: string,
    topK: number = 5
): Promise<CodeForScreenshot> {
    const start = Date.now();

    // Step 1: Find similar screenshots
    const visualResponse = await searchSimilarImage(imagePath, 'fc_visual', topK);

    const visualMatches = visualResponse.results.map(r => ({
        source: r.source,
        component: r.component,
        score: r.score,
    }));

    // Step 2: Use component names to find code
    const components = [...new Set(visualMatches.map(m => m.component).filter(Boolean))];
    const codeQuery = components.length > 0
        ? `${components.join(' ')} component implementation`
        : `UI component`;

    const codeResponse = await retrieve(codeQuery, { collections: ['fc_codebase'], topK });

    const codeMatches = codeResponse.results.map(r => ({
        text: String(r.text).slice(0, 200),
        source: String(r.source ?? ''),
        score: r.score,
    }));

    return {
        visualMatches,
        codeMatches,
        durationMs: Date.now() - start,
    };
}

/**
 * Compare two screenshots for visual differences.
 * Uses embedding cosine similarity as a proxy for visual similarity.
 *
 * Note: In mock mode, similarity is based on filename hash.
 * In real mode, uses Qwen3-VL embedding cosine similarity.
 */
export async function visualDiff(
    currentPath: string,
    baselinePath: string,
    threshold: number = DEFAULT_DIFF_THRESHOLD
): Promise<VisualDiffResult> {
    // Use the visual search to get embedding-based similarity
    // Search baseline collection for current screenshot
    const response = await searchSimilarImage(currentPath, 'fc_vistests', 1);

    // If baseline was indexed, check similarity
    const similarity = response.results.length > 0
        ? response.results[0]!.score
        : 0;

    return {
        current: currentPath,
        baseline: baselinePath,
        similarity,
        hasChanged: similarity < threshold,
        threshold,
    };
}

/**
 * Run visual diff across multiple component pairs
 */
export async function batchVisualDiff(
    pairs: Array<{ current: string; baseline: string; component: string }>,
    threshold: number = DEFAULT_DIFF_THRESHOLD
): Promise<VisualDiffReport> {
    const start = Date.now();
    const diffs: VisualDiffResult[] = [];
    const changed: string[] = [];
    const stable: string[] = [];

    for (const pair of pairs) {
        const diff = await visualDiff(pair.current, pair.baseline, threshold);
        diffs.push(diff);

        if (diff.hasChanged) {
            changed.push(pair.component);
        } else {
            stable.push(pair.component);
        }
    }

    return { diffs, changed, stable, durationMs: Date.now() - start };
}

/**
 * Create a screenshot mapping record
 */
export function createMapping(
    screenshot: string,
    sourceFile: string,
    component: string,
    page: string,
    sprint: number
): ScreenshotMapping {
    return {
        screenshot,
        sourceFile,
        component,
        page,
        sprint,
        timestamp: Date.now(),
    };
}

// === Formatting ===

/**
 * Format code-for-screenshot results
 */
export function formatCodeForScreenshot(result: CodeForScreenshot): string {
    const lines = [
        `🔗 Visual → Code Bridge`,
        `${'─'.repeat(45)}`,
    ];

    if (result.visualMatches.length > 0) {
        lines.push('  📸 Similar Screenshots:');
        for (const m of result.visualMatches.slice(0, 3)) {
            lines.push(`    [${(m.score * 100).toFixed(0)}%] ${m.component} (${m.source})`);
        }
    }

    if (result.codeMatches.length > 0) {
        lines.push('', '  💻 Related Code:');
        for (const m of result.codeMatches.slice(0, 3)) {
            lines.push(`    [${(m.score * 100).toFixed(0)}%] ${m.source}`);
            lines.push(`       ${m.text.slice(0, 80)}...`);
        }
    }

    lines.push(``, `  ⏱️ ${result.durationMs}ms`);
    return lines.join('\n');
}

/**
 * Format visual diff report
 */
export function formatVisualDiffReport(report: VisualDiffReport): string {
    const lines = [
        `👁️ Visual Diff Report`,
        `${'═'.repeat(40)}`,
        `  Changed: ${report.changed.length} | Stable: ${report.stable.length}`,
    ];

    if (report.changed.length > 0) {
        lines.push('', '  🔴 Changed:');
        report.changed.forEach(c => lines.push(`    - ${c}`));
    }

    if (report.stable.length > 0) {
        lines.push('', '  🟢 Stable:');
        report.stable.forEach(c => lines.push(`    - ${c}`));
    }

    lines.push(``, `  ⏱️ ${report.durationMs}ms`);
    return lines.join('\n');
}
