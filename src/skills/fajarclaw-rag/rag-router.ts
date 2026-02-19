/**
 * FajarClaw RAG — Router Integration Bridge
 * @ref FC-PRD-01 §10.6 (RAG Integration)
 *
 * Connects the RAG pipeline to the main FajarClaw Router.
 * - Intercepts `/search` and `/index` commands
 * - Injects RAG context into routed tasks before dispatch
 */

import { routeTask } from '../fajarclaw-router/index.js';
import type { RoutedTask } from '../../types/index.js';
import { retrieve, buildContext, buildContextSummary, formatRetrievalResults } from './retriever.js';
import { indexFile, indexDirectory, formatIndexResults } from './indexer.js';
import { isServerReady, formatEmbedStatus } from './embedder.js';
import { formatCollectionStatus } from './milvus-client.js';
import { runEval, runEvalComparison, formatEvalSummary, formatEvalComparison } from './evaluator.js';
import { runDogfood, formatDogfoodReport, dogfoodSummaryLine } from './dogfood-report.js';

// === Types ===

export interface RAGRoutedTask extends RoutedTask {
    /** RAG context injected into the task */
    ragContext?: string;
    /** RAG context summary (shorter) */
    ragSummary?: string;
    /** Whether this was handled as a RAG command */
    ragCommand?: boolean;
}

export interface RAGCommandResult {
    /** Command type */
    command: 'search' | 'index' | 'status' | 'eval' | 'eval-compare' | 'gate';
    /** Output text */
    output: string;
    /** Whether it succeeded */
    success: boolean;
    /** Duration in ms */
    durationMs: number;
}

// === RAG-Augmented Router ===

/**
 * Route a task with RAG context injection.
 *
 * If message starts with `/search`, `/index`, or `/rag-status`,
 * handle it as a RAG command. Otherwise, retrieve context and
 * inject it into the routed task.
 */
export async function routeWithRAG(
    message: string,
    options?: { injectContext?: boolean; maxResults?: number }
): Promise<RAGRoutedTask | RAGCommandResult> {
    const trimmed = message.trim();

    // Handle RAG commands
    if (trimmed.startsWith('/search ')) {
        return handleSearchCommand(trimmed.slice(8).trim());
    }

    if (trimmed.startsWith('/index ')) {
        return handleIndexCommand(trimmed.slice(7).trim());
    }

    if (trimmed === '/rag-status') {
        return handleStatusCommand();
    }

    if (trimmed === '/eval' || trimmed.startsWith('/eval ')) {
        return handleEvalCommand(trimmed);
    }

    if (trimmed === '/eval-compare') {
        return handleEvalCompareCommand();
    }

    if (trimmed === '/gate' || trimmed.startsWith('/gate ')) {
        return handleGateCommand(trimmed);
    }

    // Normal routing with context injection
    const routed = routeTask(message);
    const ragTask: RAGRoutedTask = { ...routed, ragCommand: false };

    if (options?.injectContext !== false) {
        try {
            const embeddingReady = await isServerReady();
            if (embeddingReady) {
                const response = await retrieve(message, {
                    topK: options?.maxResults ?? 3,
                });

                if (response.results.length > 0) {
                    ragTask.ragContext = buildContext(response);
                    ragTask.ragSummary = buildContextSummary(response, 3);

                    // Merge RAG context into existing context
                    ragTask.context = {
                        documents: response.results.map(r => ({
                            text: r.text,
                            score: r.score,
                            source: r.source,
                            metadata: r.metadata,
                        })),
                        existingCode: [],
                        decisions: [],
                    };
                }
            }
        } catch {
            // RAG failure should not block routing — degrade gracefully
        }
    }

    return ragTask;
}

// === RAG Commands ===

/**
 * /search [query] — semantic search across all collections
 */
async function handleSearchCommand(query: string): Promise<RAGCommandResult> {
    const start = Date.now();

    try {
        const response = await retrieve(query);
        const output = formatRetrievalResults(response);

        return {
            command: 'search',
            output,
            success: true,
            durationMs: Date.now() - start,
        };
    } catch (err) {
        return {
            command: 'search',
            output: `❌ Search failed: ${err instanceof Error ? err.message : String(err)}`,
            success: false,
            durationMs: Date.now() - start,
        };
    }
}

/**
 * /index [path] — index a file or directory
 */
async function handleIndexCommand(path: string): Promise<RAGCommandResult> {
    const start = Date.now();

    try {
        // Determine if file or directory
        const { stat } = await import('node:fs/promises');
        const pathStat = await stat(path);

        if (pathStat.isDirectory()) {
            const results = await indexDirectory(path);
            const output = formatIndexResults(results);
            return {
                command: 'index',
                output,
                success: true,
                durationMs: Date.now() - start,
            };
        } else {
            const result = await indexFile(path);
            const output = formatIndexResults([result]);
            return {
                command: 'index',
                output,
                success: true,
                durationMs: Date.now() - start,
            };
        }
    } catch (err) {
        return {
            command: 'index',
            output: `❌ Index failed: ${err instanceof Error ? err.message : String(err)}`,
            success: false,
            durationMs: Date.now() - start,
        };
    }
}

/**
 * /rag-status — show RAG pipeline status
 */
async function handleStatusCommand(): Promise<RAGCommandResult> {
    const start = Date.now();
    const lines: string[] = ['📡 RAG Pipeline Status:', ''];

    try {
        // Embedding server status
        const embedStatus = await formatEmbedStatus();
        lines.push(embedStatus);
        lines.push('');
    } catch {
        lines.push('❌ Embedding server: offline');
        lines.push('');
    }

    try {
        // Milvus status
        const milvusStatus = await formatCollectionStatus();
        lines.push(milvusStatus);
    } catch {
        lines.push('❌ Milvus: offline');
    }

    return {
        command: 'status',
        output: lines.join('\n'),
        success: true,
        durationMs: Date.now() - start,
    };
}

/**
 * Handle /eval command — run evaluation suite
 */
async function handleEvalCommand(trimmed: string): Promise<RAGCommandResult> {
    const start = Date.now();
    try {
        const mode = trimmed.includes('basic') ? 'basic' as const : 'hybrid' as const;
        const summary = await runEval(mode);
        return {
            command: 'eval',
            output: formatEvalSummary(summary),
            success: true,
            durationMs: Date.now() - start,
        };
    } catch (err) {
        return {
            command: 'eval',
            output: `❌ Eval failed: ${err instanceof Error ? err.message : String(err)}`,
            success: false,
            durationMs: Date.now() - start,
        };
    }
}

/**
 * Handle /eval-compare — run A/B comparison
 */
async function handleEvalCompareCommand(): Promise<RAGCommandResult> {
    const start = Date.now();
    try {
        const { basic, hybrid, delta } = await runEvalComparison();
        return {
            command: 'eval-compare',
            output: formatEvalComparison(basic, hybrid, delta),
            success: true,
            durationMs: Date.now() - start,
        };
    } catch (err) {
        return {
            command: 'eval-compare',
            output: `❌ Eval compare failed: ${err instanceof Error ? err.message : String(err)}`,
            success: false,
            durationMs: Date.now() - start,
        };
    }
}

/**
 * Handle /gate — quality gate check
 * @ref FC-BP-01 §10.1 Step 4 (Quality Gate)
 *
 * Runs dogfood guardrails on FajarClaw + produces gate report.
 */
async function handleGateCommand(message: string): Promise<RAGCommandResult> {
    const start = Date.now();
    const args = message.replace('/gate', '').trim();
    const targetDir = args || import.meta.dirname;

    try {
        const report = runDogfood(targetDir);
        const dogfoodOutput = formatDogfoodReport(report);
        const summaryLine = dogfoodSummaryLine(report);

        // Gate decision
        let gateStatus: string;
        if (report.filesWithErrors === 0 && report.passRate >= 0.8) {
            gateStatus = '✅ GATE: PASS';
        } else if (report.filesWithErrors <= 2) {
            gateStatus = '⚠️ GATE: CONDITIONAL — minor issues found';
        } else {
            gateStatus = '❌ GATE: BLOCKED — fix errors before proceeding';
        }

        const output = [
            gateStatus,
            '═'.repeat(50),
            dogfoodOutput,
            '',
            summaryLine,
        ].join('\n');

        return {
            command: 'gate',
            output,
            success: report.filesWithErrors === 0,
            durationMs: Date.now() - start,
        };
    } catch (err) {
        return {
            command: 'gate',
            output: `❌ Gate check failed: ${err instanceof Error ? err.message : String(err)}`,
            success: false,
            durationMs: Date.now() - start,
        };
    }
}

/**
 * Check if a result is a RAG command result (not a routed task)
 */
export function isRAGCommand(result: RAGRoutedTask | RAGCommandResult): result is RAGCommandResult {
    return 'command' in result;
}
