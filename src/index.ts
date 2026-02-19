/**
 * FajarClaw v4.0 — Main Entry Point
 * @ref FC-PRD-01 §5 (System Architecture)
 *
 * Orchestrates all 3 skills:
 * 1. Router → classify + route tasks
 * 2. Claude Code → execute terminal/backend tasks
 * 3. Antigravity → execute visual/frontend tasks
 */

import { routeTask, formatRoutingDecision } from './skills/fajarclaw-router/index.js';
import { execute as executeCC, type ClaudeCodeResult } from './skills/fajarclaw-claude-code/index.js';
import { executeTask as executeAG, type AntigravityResult } from './skills/fajarclaw-antigravity/index.js';
import {
    mergeResults,
    createSuccessResult,
    createErrorResult,
    formatMergedSummary,
} from './skills/fajarclaw-router/merger.js';
import type { RoutedTask, MergedResult, EngineResult } from './types/index.js';

// === Main Dispatch ===

/**
 * FajarClaw main handler — terima message, route, execute, merge
 *
 * Full pipeline:
 * 1. Route task via keyword scoring
 * 2. Dispatch ke engine yang tepat
 * 3. Merge results
 * 4. Return unified output
 */
export async function handleMessage(
    message: string,
    cwd?: string
): Promise<FajarClawResponse> {
    const startTime = Date.now();

    // Step 1: Route
    const routed = routeTask(message);
    const routingInfo = formatRoutingDecision(routed);

    // Step 2: Execute
    let results: EngineResult[];

    try {
        switch (routed.engine) {
            case 'claude-code':
                results = [await dispatchToClaudeCode(routed, cwd)];
                break;

            case 'antigravity':
                results = [await dispatchToAntigravity(routed, cwd)];
                break;

            case 'dual': {
                const [ccResult, agResult] = await Promise.allSettled([
                    dispatchToClaudeCode(routed, cwd),
                    dispatchToAntigravity(routed, cwd),
                ]);

                results = [
                    ccResult.status === 'fulfilled'
                        ? ccResult.value
                        : createErrorResult('claude-code', ccResult.reason?.message ?? 'Unknown error', 0),
                    agResult.status === 'fulfilled'
                        ? agResult.value
                        : createErrorResult('antigravity', agResult.reason?.message ?? 'Unknown error', 0),
                ];
                break;
            }
        }
    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        results = [createErrorResult(routed.engine, errorMsg, 0)];
    }

    // Step 3: Merge
    const merged = mergeResults(routed, results);

    return {
        routing: routingInfo,
        routed,
        merged,
        summary: formatMergedSummary(merged),
        totalDuration: Date.now() - startTime,
    };
}

// === Engine Dispatchers ===

async function dispatchToClaudeCode(
    routed: RoutedTask,
    cwd?: string
): Promise<EngineResult> {
    const startTime = Date.now();

    const result: ClaudeCodeResult = await executeCC({
        prompt: routed.originalMessage,
        cwd,
        context: routed.context
            ? JSON.stringify(routed.context)
            : undefined,
    });

    if (result.success) {
        return createSuccessResult('claude-code', result.output, Date.now() - startTime);
    }

    return createErrorResult(
        'claude-code',
        result.error ?? 'Unknown error',
        Date.now() - startTime
    );
}

async function dispatchToAntigravity(
    routed: RoutedTask,
    cwd?: string
): Promise<EngineResult> {
    const startTime = Date.now();

    const result: AntigravityResult = await executeAG({
        task: routed.originalMessage,
        cwd,
        context: routed.context
            ? JSON.stringify(routed.context)
            : undefined,
    });

    if (result.success) {
        return createSuccessResult('antigravity', result.output, Date.now() - startTime);
    }

    return createErrorResult(
        'antigravity',
        result.error ?? 'Unknown error',
        Date.now() - startTime
    );
}

// === Response Type ===

export interface FajarClawResponse {
    routing: string;
    routed: RoutedTask;
    merged: MergedResult;
    summary: string;
    totalDuration: number;
}

// === Re-exports ===

export * from './types/index.js';
export * from './skills/fajarclaw-router/index.js';
export * from './skills/fajarclaw-claude-code/index.js';
export * from './skills/fajarclaw-antigravity/index.js';
