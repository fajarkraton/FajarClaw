/**
 * FajarClaw Git Flow — Git Automation Utilities
 * @ref FC-PRD-01 §7.2B (Git Automation)
 *
 * Otomatisasi Git operations dengan Conventional Commits format:
 * - commit, branch, diff, status
 * - Enforced naming: feat/*, fix/*, chore/*
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// === Types ===

/** Tipe commit sesuai Conventional Commits */
export type CommitType = 'feat' | 'fix' | 'chore' | 'docs' | 'style' | 'refactor' | 'test' | 'perf' | 'ci';

/** Opsi untuk commit */
export interface CommitOptions {
    /** Tipe commit (feat, fix, chore, etc.) */
    type: CommitType;
    /** Scope opsional (e.g., 'router', 'auth') */
    scope?: string;
    /** Deskripsi singkat commit */
    message: string;
    /** File spesifik yang di-commit (default: semua staged) */
    files?: string[];
    /** Working directory */
    cwd?: string;
}

/** Hasil git operation */
export interface GitResult {
    success: boolean;
    output: string;
    error?: string;
}

/** Info branch */
export interface BranchInfo {
    current: string;
    branches: string[];
}

/** Info status file */
export interface FileStatus {
    staged: string[];
    modified: string[];
    untracked: string[];
}

// === Core Git Operations ===

/**
 * Jalankan git command
 */
async function git(args: string[], cwd?: string): Promise<GitResult> {
    try {
        const { stdout, stderr } = await execFileAsync('git', args, {
            cwd: cwd ?? process.cwd(),
            timeout: 30_000,
            maxBuffer: 5 * 1024 * 1024,
        });
        return {
            success: true,
            output: stdout.trim(),
            error: stderr.trim() || undefined,
        };
    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return {
            success: false,
            output: '',
            error: errorMsg,
        };
    }
}

// === Branch Operations ===

/**
 * Dapatkan nama branch saat ini
 */
export async function getCurrentBranch(cwd?: string): Promise<string> {
    const result = await git(['branch', '--show-current'], cwd);
    if (!result.success) {
        throw new Error(`Gagal dapatkan branch: ${result.error}`);
    }
    return result.output;
}

/**
 * Daftar semua branch
 */
export async function listBranches(cwd?: string): Promise<BranchInfo> {
    const currentResult = await git(['branch', '--show-current'], cwd);
    const listResult = await git(['branch', '--list', '--format=%(refname:short)'], cwd);

    return {
        current: currentResult.output,
        branches: listResult.output.split('\n').filter(Boolean),
    };
}

/**
 * Buat branch baru dengan prefix Conventional Commits
 * @ref FC-PRD-01 §7.2B (feat/*, fix/*, chore/*)
 */
export async function createBranch(
    type: CommitType,
    name: string,
    cwd?: string
): Promise<GitResult> {
    // Sanitize nama branch: lowercase, replace spaces with dashes
    const sanitized = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const branchName = `${type}/${sanitized}`;

    return git(['checkout', '-b', branchName], cwd);
}

/**
 * Switch ke branch yang sudah ada
 */
export async function switchBranch(branchName: string, cwd?: string): Promise<GitResult> {
    return git(['checkout', branchName], cwd);
}

// === Commit Operations ===

/**
 * Format Conventional Commit message
 * Format: type(scope): message
 */
export function formatCommitMessage(options: CommitOptions): string {
    const scope = options.scope ? `(${options.scope})` : '';
    return `${options.type}${scope}: ${options.message}`;
}

/**
 * Stage files dan buat commit dengan Conventional Commits format
 * @ref FC-PRD-01 §7.2B (Conventional Commits)
 */
export async function commit(options: CommitOptions): Promise<GitResult> {
    const cwd = options.cwd;

    // Stage files
    if (options.files && options.files.length > 0) {
        const stageResult = await git(['add', ...options.files], cwd);
        if (!stageResult.success) {
            return stageResult;
        }
    } else {
        // Stage semua perubahan
        const stageResult = await git(['add', '-A'], cwd);
        if (!stageResult.success) {
            return stageResult;
        }
    }

    // Buat commit message
    const message = formatCommitMessage(options);

    return git(['commit', '-m', message], cwd);
}

// === Status & Diff ===

/**
 * Dapatkan status file (staged, modified, untracked)
 */
export async function getStatus(cwd?: string): Promise<FileStatus> {
    const result = await git(['status', '--porcelain'], cwd);
    if (!result.success) {
        return { staged: [], modified: [], untracked: [] };
    }

    const staged: string[] = [];
    const modified: string[] = [];
    const untracked: string[] = [];

    for (const line of result.output.split('\n').filter(Boolean)) {
        const indexStatus = line[0];
        const workStatus = line[1];
        const filename = line.slice(3);

        // Staging area status
        if (indexStatus && indexStatus !== ' ' && indexStatus !== '?') {
            staged.push(filename);
        }

        // Working directory status
        if (workStatus === 'M') {
            modified.push(filename);
        } else if (indexStatus === '?') {
            untracked.push(filename);
        }
    }

    return { staged, modified, untracked };
}

/**
 * Dapatkan diff dari working directory
 */
export async function getDiff(file?: string, cwd?: string): Promise<string> {
    const args = ['diff'];
    if (file) args.push(file);

    const result = await git(args, cwd);
    return result.output;
}

/**
 * Dapatkan log singkat
 */
export async function getLog(count: number = 10, cwd?: string): Promise<string> {
    const result = await git(
        ['log', `--oneline`, `-${count}`, '--format=%h %s (%ar)'],
        cwd
    );
    return result.output;
}
