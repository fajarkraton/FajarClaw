/**
 * FajarClaw Claude Code — SDK/CLI Execution Wrapper
 * @ref FC-PRD-01 §7 (Skill 2 — FajarClaw Claude Code)
 *
 * Wrapper untuk Claude Code yang mendukung dua mode eksekusi:
 * - SDK Mode (primary): @anthropic-ai/claude-code programmatic API
 * - CLI Mode (fallback): claude -p "prompt" --output-format json
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// === Types ===

/** Mode eksekusi Claude Code */
export type ExecutionMode = 'sdk' | 'cli';

/** Opsi untuk Claude Code execution */
export interface ClaudeCodeOptions {
    /** Prompt/task yang akan dieksekusi */
    prompt: string;
    /** Working directory untuk eksekusi */
    cwd?: string;
    /** Model yang digunakan */
    model?: string;
    /** Max output tokens */
    maxTokens?: number;
    /** Mode eksekusi (auto-detect jika tidak diset) */
    mode?: ExecutionMode;
    /** Timeout dalam milliseconds (default: 120000 = 2 menit) */
    timeout?: number;
    /** Konteks tambahan dari RAG (Phase A2+) */
    context?: string;
}

/** Hasil eksekusi Claude Code */
export interface ClaudeCodeResult {
    /** Output dari Claude Code */
    output: string;
    /** Mode yang digunakan */
    mode: ExecutionMode;
    /** Durasi eksekusi dalam ms */
    duration: number;
    /** Apakah berhasil */
    success: boolean;
    /** Error message jika gagal */
    error?: string;
}

// === Mode Detection ===

/** Cache hasil deteksi — cek sekali saja */
let _sdkAvailable: boolean | null = null;
let _cliAvailable: boolean | null = null;

/**
 * Cek apakah Claude Code SDK tersedia
 * Mencoba import @anthropic-ai/claude-code
 */
export async function isSDKAvailable(): Promise<boolean> {
    if (_sdkAvailable !== null) return _sdkAvailable;

    try {
        await import('@anthropic-ai/claude-code');
        _sdkAvailable = true;
    } catch {
        _sdkAvailable = false;
    }
    return _sdkAvailable;
}

/**
 * Cek apakah Claude Code CLI tersedia
 * Mencoba `claude --version`
 */
export async function isCLIAvailable(): Promise<boolean> {
    if (_cliAvailable !== null) return _cliAvailable;

    try {
        await execFileAsync('claude', ['--version'], { timeout: 5000 });
        _cliAvailable = true;
    } catch {
        _cliAvailable = false;
    }
    return _cliAvailable;
}

/**
 * Deteksi mode eksekusi terbaik
 * Prioritas: SDK > CLI > error
 */
export async function detectMode(): Promise<ExecutionMode> {
    if (await isSDKAvailable()) return 'sdk';
    if (await isCLIAvailable()) return 'cli';
    throw new Error(
        'Claude Code tidak tersedia. Install: npm i -g @anthropic-ai/claude-code'
    );
}

/**
 * Reset detection cache (untuk testing)
 */
export function resetDetectionCache(): void {
    _sdkAvailable = null;
    _cliAvailable = null;
}

// === Execution ===

/**
 * Eksekusi task via Claude Code CLI
 * @ref FC-PRD-01 §7.2A (CLI Mode)
 */
export async function executeViaCLI(options: ClaudeCodeOptions): Promise<ClaudeCodeResult> {
    const startTime = Date.now();
    const timeout = options.timeout ?? 120_000;

    // Bangun prompt dengan konteks RAG jika ada
    let fullPrompt = options.prompt;
    if (options.context) {
        fullPrompt = `CONTEXT:\n${options.context}\n\nTASK:\n${options.prompt}`;
    }

    const args = [
        '-p', fullPrompt,
        '--output-format', 'text',
    ];

    if (options.model) {
        args.push('--model', options.model);
    }

    if (options.maxTokens) {
        args.push('--max-tokens', options.maxTokens.toString());
    }

    try {
        const { stdout, stderr } = await execFileAsync('claude', args, {
            cwd: options.cwd,
            timeout,
            maxBuffer: 10 * 1024 * 1024, // 10MB
            env: { ...process.env },
        });

        const output = stdout.trim();
        const duration = Date.now() - startTime;

        if (stderr && !output) {
            return {
                output: '',
                mode: 'cli',
                duration,
                success: false,
                error: stderr.trim(),
            };
        }

        return {
            output: output || stderr.trim(),
            mode: 'cli',
            duration,
            success: true,
        };
    } catch (err) {
        const duration = Date.now() - startTime;
        const errorMsg = err instanceof Error ? err.message : String(err);

        return {
            output: '',
            mode: 'cli',
            duration,
            success: false,
            error: `CLI execution failed: ${errorMsg}`,
        };
    }
}

/**
 * Eksekusi task via Claude Code SDK
 * @ref FC-PRD-01 §7.2A (SDK Mode)
 */
export async function executeViaSDK(options: ClaudeCodeOptions): Promise<ClaudeCodeResult> {
    const startTime = Date.now();

    try {
        // Dynamic import SDK
        const { claude } = await import('@anthropic-ai/claude-code') as {
            claude: (prompt: string, opts?: Record<string, unknown>) => Promise<{ stdout: string }>;
        };

        // Bangun prompt dengan konteks RAG jika ada
        let fullPrompt = options.prompt;
        if (options.context) {
            fullPrompt = `CONTEXT:\n${options.context}\n\nTASK:\n${options.prompt}`;
        }

        const result = await claude(fullPrompt, {
            cwd: options.cwd,
            model: options.model,
            maxTokens: options.maxTokens,
        });

        const duration = Date.now() - startTime;

        return {
            output: result.stdout,
            mode: 'sdk',
            duration,
            success: true,
        };
    } catch (err) {
        const duration = Date.now() - startTime;
        const errorMsg = err instanceof Error ? err.message : String(err);

        return {
            output: '',
            mode: 'sdk',
            duration,
            success: false,
            error: `SDK execution failed: ${errorMsg}`,
        };
    }
}

// === Main Execute Function ===

/**
 * Eksekusi task via Claude Code — auto-detect mode terbaik
 * @ref FC-PRD-01 §7 (FajarClaw Claude Code)
 *
 * Flow:
 * 1. Detect mode (SDK > CLI)
 * 2. Execute dengan konteks RAG (jika ada)
 * 3. Return hasil + metadata
 */
export async function execute(options: ClaudeCodeOptions): Promise<ClaudeCodeResult> {
    const mode = options.mode ?? await detectMode();

    switch (mode) {
        case 'sdk':
            return executeViaSDK(options);
        case 'cli':
            return executeViaCLI(options);
        default:
            return {
                output: '',
                mode: 'cli',
                duration: 0,
                success: false,
                error: `Unknown execution mode: ${mode as string}`,
            };
    }
}
