/**
 * FajarClaw Merger — Penggabungan Hasil Dual-Engine
 * @ref FC-PRD-01 §6.3 (Result Merging)
 *
 * Menggabungkan output dari satu atau kedua engine menjadi
 * unified result yang bisa ditampilkan ke user.
 */

import type {
    RoutedTask,
    EngineResult,
    MergedResult,
    Engine,
} from '../../types/index.js';

/**
 * Buat EngineResult baru dengan status pending
 * Helper untuk inisialisasi sebelum eksekusi
 */
export function createPendingResult(engine: Engine): EngineResult {
    return {
        engine,
        status: 'pending',
        output: '',
        duration: 0,
        timestamp: new Date(),
    };
}

/**
 * Buat EngineResult dari eksekusi yang berhasil
 */
export function createSuccessResult(
    engine: Engine,
    output: string,
    duration: number
): EngineResult {
    return {
        engine,
        status: 'completed',
        output,
        duration,
        timestamp: new Date(),
    };
}

/**
 * Buat EngineResult dari eksekusi yang gagal
 */
export function createErrorResult(
    engine: Engine,
    error: string,
    duration: number
): EngineResult {
    return {
        engine,
        status: 'failed',
        output: '',
        error,
        duration,
        timestamp: new Date(),
    };
}

/**
 * Gabungkan hasil dari satu atau kedua engine
 *
 * @ref FC-PRD-01 §6.3
 *
 * Strategi merging:
 * - Single engine: return output langsung
 * - Dual parallel: gabungkan kedua output dengan separator
 * - Dual pipeline: return output engine terakhir (sudah include konteks)
 * - Dual verify: return output engine utama + verification notes
 */
export function mergeResults(
    routedTask: RoutedTask,
    results: EngineResult[]
): MergedResult {
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
    const hasFailure = results.some(r => r.status === 'failed');
    const completedResults = results.filter(r => r.status === 'completed');

    // Jika semua gagal
    if (completedResults.length === 0) {
        const errors = results
            .filter(r => r.error)
            .map(r => `[${formatEngine(r.engine)}] ${r.error}`)
            .join('\n');

        return {
            routedTask,
            results,
            mergedOutput: `❌ Semua engine gagal:\n${errors}`,
            totalDuration,
            success: false,
        };
    }

    // Single engine result
    if (completedResults.length === 1) {
        const result = completedResults[0]!;
        let output = `[${formatEngine(result.engine)}]\n${result.output}`;

        // Jika ada engine yang gagal di dual mode, tambahkan warning
        if (hasFailure && routedTask.engine === 'dual') {
            const failedEngine = results.find(r => r.status === 'failed');
            if (failedEngine) {
                output += `\n\n⚠️ ${formatEngine(failedEngine.engine)} gagal: ${failedEngine.error}`;
            }
        }

        return {
            routedTask,
            results,
            mergedOutput: output,
            totalDuration,
            success: true,
        };
    }

    // Dual engine results — merge berdasarkan pattern
    const mergedOutput = mergeByPattern(routedTask, completedResults);

    return {
        routedTask,
        results,
        mergedOutput,
        totalDuration,
        success: true,
    };
}

/**
 * Merge output berdasarkan collaboration pattern
 */
function mergeByPattern(
    routedTask: RoutedTask,
    results: EngineResult[]
): string {
    const ccResult = results.find(r => r.engine === 'claude-code');
    const agResult = results.find(r => r.engine === 'antigravity');

    switch (routedTask.pattern) {
        case 'pipeline': {
            // Pipeline: tampilkan urutan eksekusi
            const sections: string[] = [];
            if (ccResult) {
                sections.push(`[🔧 Claude Code — Step 1]\n${ccResult.output}`);
            }
            if (agResult) {
                sections.push(`[🎨 Antigravity — Step 2]\n${agResult.output}`);
            }
            return sections.join('\n\n---\n\n');
        }

        case 'parallel': {
            // Parallel: tampilkan kedua hasil sejajar
            const sections: string[] = [];
            if (ccResult) {
                sections.push(`[🔧 Claude Code]\n${ccResult.output}`);
            }
            if (agResult) {
                sections.push(`[🎨 Antigravity]\n${agResult.output}`);
            }
            return sections.join('\n\n═══════════════════\n\n');
        }

        case 'verify': {
            // Verify: tampilkan output utama + verification
            const sections: string[] = [];
            if (ccResult) {
                sections.push(`[🔧 Claude Code — Execution]\n${ccResult.output}`);
            }
            if (agResult) {
                sections.push(`[🎨 Antigravity — Verification]\n${agResult.output}`);
            }
            return sections.join('\n\n✅ Verification:\n\n');
        }
    }
}

/** Format engine name untuk display */
function formatEngine(engine: Engine): string {
    switch (engine) {
        case 'claude-code': return '🔧 Claude Code';
        case 'antigravity': return '🎨 Antigravity';
        case 'dual': return '⚡ Dual Mode';
    }
}

/**
 * Format summary singkat dari merged result
 */
export function formatMergedSummary(result: MergedResult): string {
    const statusIcon = result.success ? '✅' : '❌';
    const engineCount = result.results.filter(r => r.status === 'completed').length;
    const duration = (result.totalDuration / 1000).toFixed(1);

    return `${statusIcon} ${engineCount} engine(s) completed in ${duration}s`;
}
