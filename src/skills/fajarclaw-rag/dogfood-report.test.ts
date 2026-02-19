/**
 * FajarClaw RAG — Dogfood Report Tests
 */

import { describe, it, expect } from 'vitest';
import {
    runDogfood,
    formatDogfoodReport,
    dogfoodSummaryLine,
    type DogfoodReport,
} from './dogfood-report.js';
import { join } from 'path';

describe('runDogfood', () => {
    it('harus scan FajarClaw RAG modules', () => {
        const ragDir = join(import.meta.dirname, '.');
        const report = runDogfood(ragDir);

        expect(report.totalFiles).toBeGreaterThan(10); // We have 15+ RAG modules
        expect(report.totalLines).toBeGreaterThan(1000);
        expect(report.files.length).toBe(report.totalFiles);
        expect(report.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('harus have zero critical errors on FajarClaw codebase', () => {
        const ragDir = join(import.meta.dirname, '.');
        const report = runDogfood(ragDir);

        // FajarClaw should not have @ts-nocheck or hardcoded secrets
        const securityErrors = report.files.filter(f =>
            f.report.results.some(r => r.check === 'security' && !r.passed)
        );
        expect(securityErrors.length).toBe(0);
    });

    it('harus have @ref traceability in most files', () => {
        const ragDir = join(import.meta.dirname, '.');
        const report = runDogfood(ragDir);

        const filesWithRef = report.files.filter(f =>
            f.report.results.some(r => r.check === 'traceability' && r.passed && r.message.includes('@ref'))
        );
        // At least half of large files should have @ref
        const largeFiles = report.files.filter(f => f.lines > 30);
        const ratio = largeFiles.length > 0 ? filesWithRef.length / largeFiles.length : 1;
        expect(ratio).toBeGreaterThanOrEqual(0.5);
    });

    it('harus handle empty directory gracefully', () => {
        const report = runDogfood('/tmp/nonexistent-dir-12345');
        expect(report.totalFiles).toBe(0);
        expect(report.passRate).toBe(1);
    });
});

describe('formatDogfoodReport', () => {
    it('harus format a real dogfood report', () => {
        const ragDir = join(import.meta.dirname, '.');
        const report = runDogfood(ragDir);
        const formatted = formatDogfoodReport(report);

        expect(formatted).toContain('🐕 FajarClaw Dogfood Report');
        expect(formatted).toContain('Files:');
        expect(formatted).toContain('Lines:');
        expect(formatted).toContain('Pass Rate:');
    });

    it('harus show PASS for clean report', () => {
        const mockReport: DogfoodReport = {
            files: [],
            totalFiles: 5,
            totalLines: 500,
            filesWithErrors: 0,
            filesWithWarnings: 1,
            filesPassing: 4,
            passRate: 0.8,
            topIssues: [],
            durationMs: 50,
        };
        const formatted = formatDogfoodReport(mockReport);
        expect(formatted).toContain('✅ PASS');
    });
});

describe('dogfoodSummaryLine', () => {
    it('harus show pass summary', () => {
        const report: DogfoodReport = {
            files: [], totalFiles: 15, totalLines: 3000,
            filesWithErrors: 0, filesWithWarnings: 2, filesPassing: 13,
            passRate: 0.87, topIssues: [], durationMs: 100,
        };
        const line = dogfoodSummaryLine(report);
        expect(line).toContain('✅');
        expect(line).toContain('15 files');
    });

    it('harus show warning summary', () => {
        const report: DogfoodReport = {
            files: [], totalFiles: 10, totalLines: 2000,
            filesWithErrors: 2, filesWithWarnings: 3, filesPassing: 5,
            passRate: 0.5, topIssues: [], durationMs: 50,
        };
        const line = dogfoodSummaryLine(report);
        expect(line).toContain('⚠️');
        expect(line).toContain('2/10');
    });
});
