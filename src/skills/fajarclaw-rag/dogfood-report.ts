/**
 * FajarClaw RAG — Dogfood Report
 * @ref FC-PRD-01 §10.17 (Dogfooding)
 *
 * Run guardrails on FajarClaw's own codebase to self-validate.
 * Generates a comprehensive report on code quality across all RAG modules.
 *
 * Phase A5: Visual RAG + Dogfooding
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { join, extname, relative } from 'path';
import { runAllGuardrails, type GuardrailReport } from './guardrails.js';

// === Types ===

export interface FileReport {
    /** File path (relative) */
    path: string;
    /** Guardrail report */
    report: GuardrailReport;
    /** Lines of code */
    lines: number;
}

export interface DogfoodReport {
    /** Per-file reports */
    files: FileReport[];
    /** Total files scanned */
    totalFiles: number;
    /** Total lines of code */
    totalLines: number;
    /** Files with errors */
    filesWithErrors: number;
    /** Files with warnings */
    filesWithWarnings: number;
    /** Files fully passing */
    filesPassing: number;
    /** Overall pass rate (0-1) */
    passRate: number;
    /** Top issues across all files */
    topIssues: Array<{ check: string; message: string; count: number }>;
    /** Duration in ms */
    durationMs: number;
}

// === Core Functions ===

/**
 * Scan a directory for TypeScript files
 */
function scanTSFiles(dir: string, maxDepth: number = 5, depth: number = 0): string[] {
    if (depth >= maxDepth) return [];

    const files: string[] = [];
    let entries: string[];

    try {
        entries = readdirSync(dir);
    } catch {
        return [];
    }

    for (const entry of entries) {
        if (entry.startsWith('.') || entry === 'node_modules' || entry === 'dist') continue;

        const fullPath = join(dir, entry);
        try {
            const stat = statSync(fullPath);
            if (stat.isDirectory()) {
                files.push(...scanTSFiles(fullPath, maxDepth, depth + 1));
            } else if (stat.isFile() && ['.ts', '.tsx'].includes(extname(fullPath)) && !fullPath.includes('.test.')) {
                files.push(fullPath);
            }
        } catch {
            // Skip unreadable
        }
    }

    return files;
}

/**
 * Run guardrails on a single file
 */
function checkFile(filePath: string, basePath: string): FileReport {
    const code = readFileSync(filePath, 'utf-8');
    const report = runAllGuardrails(code, {
        codeStandard: true,
        traceability: true,
        security: true,
        duplication: false, // Skip: no baseline for self-check
        consistency: false, // Skip: no context for self-check
        fileExtension: extname(filePath),
    });

    return {
        path: relative(basePath, filePath),
        report,
        lines: code.split('\n').length,
    };
}

/**
 * Run dogfooding: guardrails on FajarClaw's own codebase
 */
export function runDogfood(baseDir: string): DogfoodReport {
    const start = Date.now();
    const tsFiles = scanTSFiles(baseDir);
    const fileReports: FileReport[] = [];

    for (const file of tsFiles) {
        fileReports.push(checkFile(file, baseDir));
    }

    // Aggregate stats
    const totalLines = fileReports.reduce((s, f) => s + f.lines, 0);
    const filesWithErrors = fileReports.filter(f => f.report.errors > 0).length;
    const filesWithWarnings = fileReports.filter(f => f.report.warnings > 0 && f.report.errors === 0).length;
    const filesPassing = fileReports.filter(f => f.report.overallPassed && f.report.warnings === 0).length;

    // Aggregate top issues
    const issueMap = new Map<string, number>();
    for (const f of fileReports) {
        for (const r of f.report.results) {
            if (!r.passed) {
                const key = `${r.check}:${r.message}`;
                issueMap.set(key, (issueMap.get(key) ?? 0) + 1);
            }
        }
    }

    const topIssues = [...issueMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([key, count]) => {
            const [check, message] = key.split(':', 2);
            return { check: check!, message: message ?? '', count };
        });

    return {
        files: fileReports,
        totalFiles: tsFiles.length,
        totalLines,
        filesWithErrors,
        filesWithWarnings,
        filesPassing,
        passRate: tsFiles.length > 0 ? filesPassing / tsFiles.length : 1,
        topIssues,
        durationMs: Date.now() - start,
    };
}

/**
 * Format dogfood report for display
 */
export function formatDogfoodReport(report: DogfoodReport): string {
    const passRatePct = (report.passRate * 100).toFixed(0);
    const status = report.filesWithErrors === 0 ? '✅ PASS' : '⚠️ ISSUES';

    const lines = [
        `🐕 FajarClaw Dogfood Report: ${status}`,
        `${'═'.repeat(50)}`,
        `  Files: ${report.totalFiles} | Lines: ${report.totalLines.toLocaleString()}`,
        `  ✅ Pass: ${report.filesPassing} | ⚠️ Warn: ${report.filesWithWarnings} | ❌ Error: ${report.filesWithErrors}`,
        `  Pass Rate: ${passRatePct}%`,
        `  Duration: ${report.durationMs}ms`,
    ];

    if (report.topIssues.length > 0) {
        lines.push('', '  📋 Top Issues:');
        for (const issue of report.topIssues.slice(0, 5)) {
            lines.push(`    [${issue.count}x] [${issue.check}] ${issue.message}`);
        }
    }

    // Show files with errors
    const errorFiles = report.files.filter(f => f.report.errors > 0);
    if (errorFiles.length > 0) {
        lines.push('', '  ❌ Files with errors:');
        for (const f of errorFiles.slice(0, 5)) {
            lines.push(`    ${f.path} (${f.report.errors} errors)`);
        }
    }

    return lines.join('\n');
}

/**
 * Generate a pass/fail summary line
 */
export function dogfoodSummaryLine(report: DogfoodReport): string {
    if (report.filesWithErrors === 0) {
        return `🐕 Dogfood: ✅ ${report.totalFiles} files, ${report.totalLines} lines, no errors`;
    }
    return `🐕 Dogfood: ⚠️ ${report.filesWithErrors}/${report.totalFiles} files have errors`;
}
