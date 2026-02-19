/**
 * FajarClaw Antigravity — IDE Connector + Browser Control
 * @ref FC-PRD-01 §8 (Skill 3 — FajarClaw Antigravity)
 *
 * Bridge ke Antigravity IDE untuk visual/frontend tasks:
 * - Deteksi IDE running status
 * - Kirim task ke IDE via API / fallback CDP
 * - Report status ke router
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// === Types ===

/** Status koneksi ke Antigravity */
export type ConnectionStatus = 'connected' | 'disconnected' | 'fallback';

/** Mode koneksi ke Antigravity */
export type ConnectionMode = 'ide' | 'browser' | 'none';

/** Info koneksi Antigravity */
export interface AntigravityConnection {
    status: ConnectionStatus;
    mode: ConnectionMode;
    endpoint?: string;
    version?: string;
}

/** Opsi untuk task execution via Antigravity */
export interface AntigravityTaskOptions {
    /** Task description */
    task: string;
    /** Working directory */
    cwd?: string;
    /** Timeout dalam ms (default: 180000 = 3 menit) */
    timeout?: number;
    /** Konteks tambahan dari RAG */
    context?: string;
    /** Tipe workflow trigger (jika applicable) */
    workflow?: string;
}

/** Hasil eksekusi Antigravity task */
export interface AntigravityResult {
    success: boolean;
    output: string;
    mode: ConnectionMode;
    duration: number;
    error?: string;
    /** Artifacts yang dihasilkan (screenshots, files, etc.) */
    artifacts?: string[];
}

// === Connection Detection ===

/** Cache connection info */
let _cachedConnection: AntigravityConnection | null = null;

/**
 * Deteksi apakah Antigravity IDE running dan bisa diakses
 * Cek beberapa endpoint yang mungkin
 */
export async function detectConnection(): Promise<AntigravityConnection> {
    // Coba IDE API endpoint (localhost)
    const ideConnection = await tryIDEConnection();
    if (ideConnection.status === 'connected') {
        _cachedConnection = ideConnection;
        return ideConnection;
    }

    // Fallback: cek apakah browser CDP tersedia via OpenClaw
    const browserConnection = await tryBrowserFallback();
    if (browserConnection.status === 'connected') {
        _cachedConnection = browserConnection;
        return browserConnection;
    }

    // Tidak ada koneksi
    const noConnection: AntigravityConnection = {
        status: 'disconnected',
        mode: 'none',
    };
    _cachedConnection = noConnection;
    return noConnection;
}

/**
 * Cek koneksi ke Antigravity IDE API
 */
async function tryIDEConnection(): Promise<AntigravityConnection> {
    try {
        // Antigravity IDE biasanya expose API di localhost
        // Untuk MVP, kita cek apakah process running
        const { stdout } = await execFileAsync('pgrep', ['-f', 'antigravity'], {
            timeout: 3000,
        });

        if (stdout.trim()) {
            return {
                status: 'connected',
                mode: 'ide',
                endpoint: 'localhost',
                version: 'detected',
            };
        }
    } catch {
        // Process not found — normal case
    }

    return { status: 'disconnected', mode: 'none' };
}

/**
 * Cek browser fallback via OpenClaw CDP
 */
async function tryBrowserFallback(): Promise<AntigravityConnection> {
    try {
        const { stdout } = await execFileAsync('openclaw', ['browser', 'status'], {
            timeout: 5000,
        });

        if (stdout.includes('running') || stdout.includes('connected')) {
            return {
                status: 'connected',
                mode: 'browser',
                endpoint: 'cdp://localhost',
            };
        }
    } catch {
        // OpenClaw browser not available
    }

    return { status: 'disconnected', mode: 'none' };
}

/**
 * Dapatkan cached connection atau detect fresh
 */
export async function getConnection(): Promise<AntigravityConnection> {
    if (_cachedConnection) return _cachedConnection;
    return detectConnection();
}

/**
 * Reset connection cache
 */
export function resetConnectionCache(): void {
    _cachedConnection = null;
}

// === Task Execution ===

/**
 * Eksekusi task via Antigravity
 * @ref FC-PRD-01 §8 (Antigravity Task Execution)
 *
 * Flow:
 * 1. Detect connection (IDE > Browser > error)
 * 2. Format task dengan konteks RAG
 * 3. Kirim ke endpoint yang tersedia
 * 4. Return hasil + artifacts
 */
export async function executeTask(
    options: AntigravityTaskOptions
): Promise<AntigravityResult> {
    const startTime = Date.now();
    const connection = await getConnection();

    if (connection.status === 'disconnected') {
        return {
            success: false,
            output: '',
            mode: 'none',
            duration: Date.now() - startTime,
            error: 'Antigravity tidak tersedia. Pastikan IDE atau OpenClaw browser running.',
        };
    }

    // Bangun full task dengan konteks
    let fullTask = options.task;
    if (options.context) {
        fullTask = `CONTEXT:\n${options.context}\n\nTASK:\n${options.task}`;
    }
    if (options.workflow) {
        fullTask = `WORKFLOW: ${options.workflow}\n\n${fullTask}`;
    }

    try {
        switch (connection.mode) {
            case 'ide':
                return await executeViaIDE(fullTask, options, startTime);
            case 'browser':
                return await executeViaBrowser(fullTask, options, startTime);
            default:
                return {
                    success: false,
                    output: '',
                    mode: 'none',
                    duration: Date.now() - startTime,
                    error: 'Tidak ada connection mode yang tersedia',
                };
        }
    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return {
            success: false,
            output: '',
            mode: connection.mode,
            duration: Date.now() - startTime,
            error: `Execution failed: ${errorMsg}`,
        };
    }
}

/**
 * Eksekusi via IDE API
 */
async function executeViaIDE(
    task: string,
    options: AntigravityTaskOptions,
    startTime: number
): Promise<AntigravityResult> {
    // MVP: proxy via OpenClaw agent command
    const timeout = options.timeout ?? 180_000;

    try {
        const { stdout } = await execFileAsync(
            'openclaw',
            ['agent', '--prompt', task, '--format', 'text'],
            {
                cwd: options.cwd,
                timeout,
                maxBuffer: 10 * 1024 * 1024,
            }
        );

        return {
            success: true,
            output: stdout.trim(),
            mode: 'ide',
            duration: Date.now() - startTime,
        };
    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return {
            success: false,
            output: '',
            mode: 'ide',
            duration: Date.now() - startTime,
            error: errorMsg,
        };
    }
}

/**
 * Eksekusi via Browser CDP (fallback)
 */
async function executeViaBrowser(
    task: string,
    options: AntigravityTaskOptions,
    startTime: number
): Promise<AntigravityResult> {
    const timeout = options.timeout ?? 180_000;

    try {
        const { stdout } = await execFileAsync(
            'openclaw',
            ['agent', '--prompt', task, '--format', 'text'],
            {
                cwd: options.cwd,
                timeout,
                maxBuffer: 10 * 1024 * 1024,
            }
        );

        return {
            success: true,
            output: stdout.trim(),
            mode: 'browser',
            duration: Date.now() - startTime,
        };
    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return {
            success: false,
            output: '',
            mode: 'browser',
            duration: Date.now() - startTime,
            error: errorMsg,
        };
    }
}

// === Status Display ===

/**
 * Format Antigravity connection status untuk display
 */
export function formatStatus(connection: AntigravityConnection): string {
    const icons: Record<ConnectionStatus, string> = {
        connected: '🟢',
        disconnected: '🔴',
        fallback: '🟡',
    };

    const modeLabels: Record<ConnectionMode, string> = {
        ide: 'IDE Direct',
        browser: 'Browser CDP',
        none: 'Not Connected',
    };

    const lines = [
        `${icons[connection.status]} Antigravity: ${modeLabels[connection.mode]}`,
    ];

    if (connection.endpoint) {
        lines.push(`  Endpoint: ${connection.endpoint}`);
    }
    if (connection.version) {
        lines.push(`  Version: ${connection.version}`);
    }

    return lines.join('\n');
}
