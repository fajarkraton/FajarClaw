/**
 * FajarClaw RAG — Guardrails Tests
 */

import { describe, it, expect } from 'vitest';
import {
    checkCodeStandard,
    checkTraceability,
    checkSecurity,
    checkDuplication,
    checkConsistency,
    runAllGuardrails,
    formatGuardrailReport,
} from './guardrails.js';

describe('checkCodeStandard', () => {
    it('harus detect var keyword', () => {
        const results = checkCodeStandard('var x = 5;');
        const varResult = results.find(r => r.message.includes('var'));
        expect(varResult).toBeDefined();
        expect(varResult!.severity).toBe('warning');
    });

    it('harus detect @ts-nocheck', () => {
        const results = checkCodeStandard('// @ts-nocheck\nconst x = 5;');
        const nocheck = results.find(r => r.message.includes('@ts-nocheck'));
        expect(nocheck).toBeDefined();
        expect(nocheck!.severity).toBe('error');
    });

    it('harus skip eslint-disable lines', () => {
        const code = '// eslint-disable-next-line @typescript-eslint/no-explicit-any\nconst x: any = 5;';
        const results = checkCodeStandard(code);
        // The eslint-disable line itself should be skipped
        const disabled = results.filter(r => r.line === 1);
        expect(disabled.length).toBe(0);
    });

    it('harus pass clean code', () => {
        const code = 'const x: number = 5;\nconst y: string = "hello";';
        const results = checkCodeStandard(code);
        const failures = results.filter(r => !r.passed && r.severity === 'error');
        expect(failures.length).toBe(0);
    });

    it('harus skip non-TS files', () => {
        const results = checkCodeStandard('var x = 5;', '.py');
        expect(results.length).toBe(0);
    });
});

describe('checkTraceability', () => {
    it('harus pass when @ref present', () => {
        const code = '/**\n * @ref FC-PRD-01 §10.1\n */\n' + 'x\n'.repeat(30);
        const results = checkTraceability(code);
        const refResult = results.find(r => r.message.includes('@ref'));
        expect(refResult?.passed).toBe(true);
    });

    it('harus warn when @ref missing in large file', () => {
        const code = 'const x = 1;\n'.repeat(40);
        const results = checkTraceability(code);
        const missing = results.find(r => r.message.includes('No @ref'));
        expect(missing).toBeDefined();
        expect(missing!.passed).toBe(false);
    });

    it('harus not warn for small files', () => {
        const code = 'const x = 1;\nconst y = 2;';
        const results = checkTraceability(code);
        const warnings = results.filter(r => !r.passed);
        expect(warnings.length).toBe(0);
    });
});

describe('checkSecurity', () => {
    it('harus detect hardcoded API key', () => {
        const code = 'const apiKey = "sk-abc123def456ghi789jkl012mno345";';
        const results = checkSecurity(code);
        const secret = results.find(r => !r.passed);
        expect(secret).toBeDefined();
        expect(secret!.severity).toBe('error');
    });

    it('harus detect private keys', () => {
        const code = '-----BEGIN RSA PRIVATE KEY-----';
        const results = checkSecurity(code);
        const pkResult = results.find(r => r.message.includes('Private Key'));
        expect(pkResult).toBeDefined();
    });

    it('harus pass clean code', () => {
        const code = 'const url = process.env.API_URL;\nconst key = process.env.API_KEY;';
        const results = checkSecurity(code);
        const passed = results.find(r => r.passed);
        expect(passed).toBeDefined();
    });

    it('harus skip comments', () => {
        const code = '// const apiKey = "sk-abc123def456ghi789jkl012mno345";';
        const results = checkSecurity(code);
        // Should not flag commented-out secrets
        const issues = results.filter(r => !r.passed);
        expect(issues.length).toBe(0);
    });
});

describe('checkDuplication', () => {
    it('harus detect high overlap', () => {
        const code = 'function foo() { return 1; }\nfunction bar() { return 2; }';
        const existing = ['function foo() { return 1; }\nfunction bar() { return 2; }'];
        const results = checkDuplication(code, existing);
        const dup = results.find(r => r.message.includes('overlap'));
        expect(dup).toBeDefined();
    });

    it('harus pass for unique code', () => {
        const code = 'function uniqueFunc() { return "completely unique"; }';
        const existing = ['function otherFunc() { return "different code entirely here"; }'];
        const results = checkDuplication(code, existing);
        const passed = results.find(r => r.passed);
        expect(passed).toBeDefined();
    });

    it('harus handle empty existing code', () => {
        const results = checkDuplication('some code', []);
        expect(results.length).toBe(0);
    });
});

describe('checkConsistency', () => {
    it('harus pass when output aligns with context', () => {
        const output = 'The router uses keyword scoring for routing tasks to engines';
        const context = ['The FajarClaw router scores keywords to determine which engine handles the task'];
        const results = checkConsistency(output, context);
        const passed = results.find(r => r.passed);
        expect(passed).toBeDefined();
    });

    it('harus warn on low alignment', () => {
        const output = 'The weather is sunny today with clear skies';
        const context = ['The router uses keyword scoring for task dispatch'];
        const results = checkConsistency(output, context);
        const warning = results.find(r => !r.passed);
        expect(warning).toBeDefined();
    });
});

describe('runAllGuardrails', () => {
    it('harus run all checks and return report', () => {
        const code = '/**\n * @ref FC-PRD-01\n */\nconst x: number = 5;\n' + 'const y = 1;\n'.repeat(30);
        const report = runAllGuardrails(code);
        expect(report.results.length).toBeGreaterThan(0);
        expect(report.durationMs).toBeGreaterThanOrEqual(0);
        expect(typeof report.overallPassed).toBe('boolean');
    });

    it('harus fail on security errors', () => {
        const code = 'const token = "ghp_abcdefghijklmnopqrstuvwxyz1234567890";\n'.repeat(31);
        const report = runAllGuardrails(code);
        expect(report.errors).toBeGreaterThan(0);
        expect(report.overallPassed).toBe(false);
    });

    it('harus respect disabled checks', () => {
        const code = 'var x = 5;\n'.repeat(31);
        const report = runAllGuardrails(code, { codeStandard: false, traceability: false });
        const codeStd = report.results.filter(r => r.check === 'code-standard');
        const trace = report.results.filter(r => r.check === 'traceability');
        expect(codeStd.length).toBe(0);
        expect(trace.length).toBe(0);
    });
});

describe('formatGuardrailReport', () => {
    it('harus format passing report', () => {
        const report = runAllGuardrails('const x: number = 1;');
        const formatted = formatGuardrailReport(report);
        expect(formatted).toContain('🛡️ Guardrails');
        expect(formatted).toContain('PASS');
    });

    it('harus show issues in failing report', () => {
        const code = 'const token = "ghp_abcdefghijklmnopqrstuvwxyz1234567890";\n'.repeat(31);
        const report = runAllGuardrails(code);
        const formatted = formatGuardrailReport(report);
        expect(formatted).toContain('FAIL');
        expect(formatted).toContain('Issues:');
    });
});
