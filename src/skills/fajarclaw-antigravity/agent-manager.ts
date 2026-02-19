/**
 * FajarClaw Agent Manager — Multi-Agent Spawning
 * @ref FC-PRD-01 §8.2B (Multi-Agent Spawning)
 *
 * Mendukung dua mode spawning:
 * - Parallel: beberapa agent kerja bersamaan pada task independen
 * - Sequential: chain of agents berurutan, output A → input B
 */

// === Types ===

/** Task untuk satu agent */
export interface AgentTask {
    /** ID unik task */
    id: string;
    /** Deskripsi task */
    description: string;
    /** Dependencies (ID task yang harus selesai duluan) */
    dependsOn?: string[];
}

/** Status satu agent */
export type AgentStatus = 'queued' | 'running' | 'completed' | 'failed';

/** Hasil eksekusi satu agent */
export interface AgentResult {
    taskId: string;
    status: AgentStatus;
    output: string;
    error?: string;
    startedAt?: Date;
    completedAt?: Date;
}

/** Konfigurasi spawn */
export interface SpawnConfig {
    /** Mode: parallel atau sequential */
    mode: 'parallel' | 'sequential';
    /** Max agents bersamaan (untuk parallel) */
    maxConcurrency?: number;
    /** Timeout per task dalam ms */
    taskTimeout?: number;
    /** Executor function — injected dari luar */
    executor: (task: AgentTask) => Promise<string>;
}

/** Hasil keseluruhan spawning */
export interface SpawnResult {
    mode: 'parallel' | 'sequential';
    results: AgentResult[];
    totalDuration: number;
    successCount: number;
    failCount: number;
}

// === Agent Spawning ===

/**
 * Spawn agents secara parallel
 * @ref FC-PRD-01 §8.2B (spawnParallel)
 *
 * Semua task dijalankan bersamaan (atau batch jika maxConcurrency diset)
 */
export async function spawnParallel(
    tasks: AgentTask[],
    config: SpawnConfig
): Promise<SpawnResult> {
    const startTime = Date.now();
    const maxConcurrency = config.maxConcurrency ?? tasks.length;
    const results: AgentResult[] = [];

    // Proses dalam batch sesuai maxConcurrency
    for (let i = 0; i < tasks.length; i += maxConcurrency) {
        const batch = tasks.slice(i, i + maxConcurrency);

        const batchResults = await Promise.allSettled(
            batch.map(task => executeAgent(task, config))
        );

        for (let j = 0; j < batchResults.length; j++) {
            const settled = batchResults[j]!;
            if (settled.status === 'fulfilled') {
                results.push(settled.value);
            } else {
                results.push({
                    taskId: batch[j]!.id,
                    status: 'failed',
                    output: '',
                    error: settled.reason instanceof Error ? settled.reason.message : String(settled.reason),
                });
            }
        }
    }

    return buildSpawnResult('parallel', results, startTime);
}

/**
 * Spawn agents secara sequential
 * @ref FC-PRD-01 §8.2B (spawnSequential)
 *
 * Setiap task dijalankan berurutan. Jika satu gagal, lanjut ke berikutnya
 * (tidak abort chain)
 */
export async function spawnSequential(
    tasks: AgentTask[],
    config: SpawnConfig
): Promise<SpawnResult> {
    const startTime = Date.now();
    const results: AgentResult[] = [];

    for (const task of tasks) {
        const result = await executeAgent(task, config);
        results.push(result);
    }

    return buildSpawnResult('sequential', results, startTime);
}

/**
 * Spawn agents dengan dependency resolution
 * Tasks dijalankan sesuai dependency order
 */
export async function spawnWithDependencies(
    tasks: AgentTask[],
    config: SpawnConfig
): Promise<SpawnResult> {
    const startTime = Date.now();
    const results: AgentResult[] = [];
    const completed = new Set<string>();

    // Topological sort sederhana
    const remaining = [...tasks];
    let maxIterations = remaining.length * remaining.length; // safeguard

    while (remaining.length > 0 && maxIterations > 0) {
        maxIterations--;

        // Cari tasks yang semua dependency-nya sudah selesai
        const ready = remaining.filter(task => {
            if (!task.dependsOn || task.dependsOn.length === 0) return true;
            return task.dependsOn.every(dep => completed.has(dep));
        });

        if (ready.length === 0) {
            // Circular dependency atau unresolvable
            for (const task of remaining) {
                results.push({
                    taskId: task.id,
                    status: 'failed',
                    output: '',
                    error: `Unresolved dependencies: ${task.dependsOn?.join(', ')}`,
                });
            }
            break;
        }

        // Execute ready tasks (parallel jika bisa)
        const batchResults = await Promise.allSettled(
            ready.map(task => executeAgent(task, config))
        );

        for (let i = 0; i < batchResults.length; i++) {
            const settled = batchResults[i]!;
            const taskId = ready[i]!.id;

            if (settled.status === 'fulfilled') {
                results.push(settled.value);
                completed.add(taskId);
            } else {
                results.push({
                    taskId,
                    status: 'failed',
                    output: '',
                    error: settled.reason instanceof Error ? settled.reason.message : String(settled.reason),
                });
                completed.add(taskId); // mark as done even if failed
            }
        }

        // Remove completed tasks dari remaining
        const readyIds = new Set(ready.map(t => t.id));
        remaining.splice(0, remaining.length, ...remaining.filter(t => !readyIds.has(t.id)));
    }

    return buildSpawnResult('parallel', results, startTime);
}

// === Internal Helpers ===

/**
 * Eksekusi satu agent task
 */
async function executeAgent(
    task: AgentTask,
    config: SpawnConfig
): Promise<AgentResult> {
    const startedAt = new Date();

    try {
        // Buat promise dengan timeout
        const timeoutMs = config.taskTimeout ?? 60_000;
        const output = await withTimeout(
            config.executor(task),
            timeoutMs,
            `Task ${task.id} timeout after ${timeoutMs}ms`
        );

        return {
            taskId: task.id,
            status: 'completed',
            output,
            startedAt,
            completedAt: new Date(),
        };
    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return {
            taskId: task.id,
            status: 'failed',
            output: '',
            error: errorMsg,
            startedAt,
            completedAt: new Date(),
        };
    }
}

/**
 * Wrap promise dengan timeout
 */
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(message)), ms);
        promise
            .then(value => { clearTimeout(timer); resolve(value); })
            .catch(err => { clearTimeout(timer); reject(err); });
    });
}

/**
 * Build SpawnResult dari results array
 */
function buildSpawnResult(
    mode: 'parallel' | 'sequential',
    results: AgentResult[],
    startTime: number
): SpawnResult {
    return {
        mode,
        results,
        totalDuration: Date.now() - startTime,
        successCount: results.filter(r => r.status === 'completed').length,
        failCount: results.filter(r => r.status === 'failed').length,
    };
}

/**
 * Format spawn result untuk display
 */
export function formatSpawnResult(result: SpawnResult): string {
    const icon = result.failCount === 0 ? '✅' : result.successCount > 0 ? '⚠️' : '❌';
    const lines = [
        `${icon} Spawn ${result.mode}: ${result.successCount}/${result.results.length} tasks completed`,
        `Duration: ${(result.totalDuration / 1000).toFixed(1)}s`,
    ];

    for (const r of result.results) {
        const statusIcon = r.status === 'completed' ? '✓' : '✗';
        lines.push(`  ${statusIcon} [${r.taskId}] ${r.status}${r.error ? ` — ${r.error}` : ''}`);
    }

    return lines.join('\n');
}
