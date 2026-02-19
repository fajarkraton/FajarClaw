/**
 * FajarClaw RAG — Guardrails System
 * @ref FC-PRD-01 §10.12 (Code Quality Guardrails)
 *
 * Validates generated/modified code against quality standards:
 * - Code standards: TypeScript strict patterns, naming
 * - Traceability: @ref comment presence
 * - Duplication: text similarity detection
 * - Security: no hardcoded secrets
 * - Consistency: output vs retrieved context alignment
 *
 * Phase A4: Intelligence Layer
 */

// === Types ===

export interface GuardrailResult {
    /** Check name */
    check: string;
    /** Pass or fail */
    passed: boolean;
    /** Severity: info, warning, error */
    severity: 'info' | 'warning' | 'error';
    /** Human-readable message */
    message: string;
    /** Line number (if applicable) */
    line?: number;
    /** Suggestion for fix */
    suggestion?: string;
}

export interface GuardrailReport {
    /** All check results */
    results: GuardrailResult[];
    /** Number of passes */
    passed: number;
    /** Number of warnings */
    warnings: number;
    /** Number of errors */
    errors: number;
    /** Overall pass/fail */
    overallPassed: boolean;
    /** Duration in ms */
    durationMs: number;
}

export interface GuardrailOptions {
    /** Enable code standard checks (default: true) */
    codeStandard?: boolean;
    /** Enable traceability checks (default: true) */
    traceability?: boolean;
    /** Enable security checks (default: true) */
    security?: boolean;
    /** Enable duplication check (default: false — needs embeddings) */
    duplication?: boolean;
    /** Enable consistency check (default: false — needs context) */
    consistency?: boolean;
    /** File extension for language-specific checks */
    fileExtension?: string;
}

// === Patterns ===

/** Secret/credential patterns to detect */
const SECRET_PATTERNS = [
    { pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*['"][A-Za-z0-9_\-]{20,}['"]/gi, name: 'API Key' },
    { pattern: /(?:password|passwd|pwd)\s*[:=]\s*['"][^'"]{8,}['"]/gi, name: 'Password' },
    { pattern: /(?:secret|token)\s*[:=]\s*['"][A-Za-z0-9_\-]{20,}['"]/gi, name: 'Secret/Token' },
    { pattern: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/g, name: 'Private Key' },
    { pattern: /(?:sk-|pk_live_|sk_live_)[A-Za-z0-9]{20,}/g, name: 'Service Key' },
    { pattern: /(?:ghp_|gho_|ghu_|ghs_|ghr_)[A-Za-z0-9]{36,}/g, name: 'GitHub Token' },
];

/** TypeScript code standard patterns */
const TS_STANDARD_CHECKS = [
    { pattern: /\bany\b(?!\s*\))/g, name: 'Untyped any', severity: 'warning' as const, suggestion: 'Use a specific type instead of `any`' },
    { pattern: /console\.(log|warn|error|debug)\(/g, name: 'Console statement', severity: 'info' as const, suggestion: 'Use structured logging instead of console' },
    { pattern: /\/\/ @ts-ignore/g, name: '@ts-ignore', severity: 'warning' as const, suggestion: 'Fix the type error instead of ignoring it' },
    { pattern: /\/\/ @ts-nocheck/g, name: '@ts-nocheck', severity: 'error' as const, suggestion: 'Remove @ts-nocheck — all files must be type-checked' },
    { pattern: /\bvar\s+/g, name: 'var keyword', severity: 'warning' as const, suggestion: 'Use `const` or `let` instead of `var`' },
];

// === Check Functions ===

/**
 * Check code against TypeScript standards
 */
export function checkCodeStandard(code: string, fileExtension?: string): GuardrailResult[] {
    const results: GuardrailResult[] = [];
    const isTS = !fileExtension || ['.ts', '.tsx', '.js', '.jsx'].includes(fileExtension);

    if (!isTS) return results;

    const lines = code.split('\n');

    for (const check of TS_STANDARD_CHECKS) {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i]!;

            // Skip eslint-disable lines
            if (line.includes('eslint-disable')) continue;

            if (check.pattern.test(line)) {
                results.push({
                    check: 'code-standard',
                    passed: check.severity === 'info',
                    severity: check.severity,
                    message: `${check.name} found`,
                    line: i + 1,
                    suggestion: check.suggestion,
                });
            }
            // Reset regex lastIndex for global patterns
            check.pattern.lastIndex = 0;
        }
    }

    // Check for function length (> 50 lines)
    let funcStart = -1;
    let braceDepth = 0;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        if (/(?:function|=>)\s*{/.test(line) || /(?:async\s+)?(?:function|=>)/.test(line)) {
            if (funcStart === -1) funcStart = i;
        }
        braceDepth += (line.match(/{/g) || []).length;
        braceDepth -= (line.match(/}/g) || []).length;
        if (braceDepth === 0 && funcStart >= 0) {
            const length = i - funcStart;
            if (length > 50) {
                results.push({
                    check: 'code-standard',
                    passed: false,
                    severity: 'warning',
                    message: `Long function (${length} lines) starting at line ${funcStart + 1}`,
                    line: funcStart + 1,
                    suggestion: 'Consider breaking into smaller functions',
                });
            }
            funcStart = -1;
        }
    }

    return results;
}

/**
 * Check for @ref traceability comments
 */
export function checkTraceability(code: string): GuardrailResult[] {
    const results: GuardrailResult[] = [];
    const hasRef = /@ref\s+\S+/.test(code);
    const hasDocBlock = /\/\*\*[\s\S]*?\*\//.test(code);
    const lines = code.split('\n');
    const isLargeFile = lines.length > 30;

    if (isLargeFile && !hasRef) {
        results.push({
            check: 'traceability',
            passed: false,
            severity: 'warning',
            message: 'No @ref comment found in file',
            suggestion: 'Add @ref FC-PRD-01 §X.X linking to specification section',
        });
    }

    if (isLargeFile && !hasDocBlock) {
        results.push({
            check: 'traceability',
            passed: false,
            severity: 'info',
            message: 'No JSDoc block found',
            suggestion: 'Add /** ... */ documentation for public functions',
        });
    }

    if (hasRef) {
        results.push({
            check: 'traceability',
            passed: true,
            severity: 'info',
            message: '@ref traceability comment present',
        });
    }

    return results;
}

/**
 * Check for hardcoded secrets/credentials
 */
export function checkSecurity(code: string): GuardrailResult[] {
    const results: GuardrailResult[] = [];
    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;

        // Skip comments and test files
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;

        for (const secretCheck of SECRET_PATTERNS) {
            if (secretCheck.pattern.test(line)) {
                results.push({
                    check: 'security',
                    passed: false,
                    severity: 'error',
                    message: `Potential ${secretCheck.name} detected`,
                    line: i + 1,
                    suggestion: 'Move to environment variable or .env file',
                });
            }
            secretCheck.pattern.lastIndex = 0;
        }
    }

    if (results.length === 0) {
        results.push({
            check: 'security',
            passed: true,
            severity: 'info',
            message: 'No hardcoded secrets detected',
        });
    }

    return results;
}

/**
 * Check for text duplication (simple n-gram overlap)
 */
export function checkDuplication(code: string, existingCode: string[]): GuardrailResult[] {
    const results: GuardrailResult[] = [];

    if (existingCode.length === 0) return results;

    const codeLines = code.split('\n').filter(l => l.trim().length > 10);
    const codeSet = new Set(codeLines.map(l => l.trim()));

    for (const existing of existingCode) {
        const existingLines = existing.split('\n').filter(l => l.trim().length > 10);
        let overlapping = 0;

        for (const line of existingLines) {
            if (codeSet.has(line.trim())) overlapping++;
        }

        const similarity = existingLines.length > 0 ? overlapping / existingLines.length : 0;

        if (similarity > 0.5) {
            results.push({
                check: 'duplication',
                passed: false,
                severity: 'warning',
                message: `${(similarity * 100).toFixed(0)}% overlap with existing code`,
                suggestion: 'Extract shared logic into a utility module',
            });
        }
    }

    if (results.length === 0) {
        results.push({
            check: 'duplication',
            passed: true,
            severity: 'info',
            message: 'No significant code duplication detected',
        });
    }

    return results;
}

/**
 * Check consistency between output and retrieved context
 */
export function checkConsistency(
    output: string,
    retrievedTexts: string[]
): GuardrailResult[] {
    const results: GuardrailResult[] = [];

    if (retrievedTexts.length === 0) return results;

    // Extract key terms from retrieved context
    const contextTerms = new Set<string>();
    for (const text of retrievedTexts) {
        const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) ?? [];
        words.forEach(w => contextTerms.add(w));
    }

    // Check if output uses terms from context
    const outputWords = output.toLowerCase().match(/\b[a-z]{4,}\b/g) ?? [];
    const outputTerms = new Set(outputWords);
    const overlap = [...outputTerms].filter(w => contextTerms.has(w));

    const overlapRatio = contextTerms.size > 0 ? overlap.length / Math.min(outputTerms.size, contextTerms.size) : 0;

    if (overlapRatio < 0.1 && retrievedTexts.length > 0) {
        results.push({
            check: 'consistency',
            passed: false,
            severity: 'warning',
            message: `Low context alignment (${(overlapRatio * 100).toFixed(0)}% term overlap)`,
            suggestion: 'Output may not align with retrieved context — verify manually',
        });
    } else {
        results.push({
            check: 'consistency',
            passed: true,
            severity: 'info',
            message: `Context alignment: ${(overlapRatio * 100).toFixed(0)}% term overlap`,
        });
    }

    return results;
}

// === Pipeline ===

/**
 * Run all guardrail checks on code.
 */
export function runAllGuardrails(
    code: string,
    options?: GuardrailOptions & {
        existingCode?: string[];
        retrievedTexts?: string[];
    }
): GuardrailReport {
    const start = Date.now();
    const allResults: GuardrailResult[] = [];

    if (options?.codeStandard !== false) {
        allResults.push(...checkCodeStandard(code, options?.fileExtension));
    }

    if (options?.traceability !== false) {
        allResults.push(...checkTraceability(code));
    }

    if (options?.security !== false) {
        allResults.push(...checkSecurity(code));
    }

    if (options?.duplication && options?.existingCode) {
        allResults.push(...checkDuplication(code, options.existingCode));
    }

    if (options?.consistency && options?.retrievedTexts) {
        allResults.push(...checkConsistency(code, options.retrievedTexts));
    }

    const passed = allResults.filter(r => r.passed).length;
    const warnings = allResults.filter(r => r.severity === 'warning' && !r.passed).length;
    const errors = allResults.filter(r => r.severity === 'error' && !r.passed).length;

    return {
        results: allResults,
        passed,
        warnings,
        errors,
        overallPassed: errors === 0,
        durationMs: Date.now() - start,
    };
}

// === Formatting ===

/**
 * Format guardrail report for display
 */
export function formatGuardrailReport(report: GuardrailReport): string {
    const status = report.overallPassed ? '✅ PASS' : '❌ FAIL';
    const lines = [
        `🛡️ Guardrails Report: ${status}`,
        `${'─'.repeat(45)}`,
        `  ✅ ${report.passed} passed | ⚠️ ${report.warnings} warnings | ❌ ${report.errors} errors`,
        `  ⏱️ ${report.durationMs}ms`,
        '',
    ];

    // Show failures and warnings
    const issues = report.results.filter(r => !r.passed);
    if (issues.length > 0) {
        lines.push('  Issues:');
        for (const issue of issues) {
            const icon = issue.severity === 'error' ? '❌' : '⚠️';
            const loc = issue.line ? ` (L${issue.line})` : '';
            lines.push(`    ${icon} [${issue.check}] ${issue.message}${loc}`);
            if (issue.suggestion) {
                lines.push(`       💡 ${issue.suggestion}`);
            }
        }
    }

    return lines.join('\n');
}
