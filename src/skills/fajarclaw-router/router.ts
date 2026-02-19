/**
 * FajarClaw Router — Keyword Scoring + Task Classification
 * @ref FC-PRD-01 §6.2 (Task Classification Logic)
 *
 * Mengklasifikasikan task dari user ke engine yang paling tepat
 * menggunakan dual strategy: keyword scoring (fast) + semantic search (Phase A2+)
 */

import type {
    Engine,
    KeywordScore,
    ConfidenceLevel,
    RoutedTask,
    ParsedCommand,
    OverrideCommand,
    CollabPattern,
} from '../../types/index.js';
import { selectPattern } from './patterns.js';

// === Keyword Dictionaries ===
// Setiap keyword punya weight: semakin tinggi, semakin kuat indikasi engine

/** Keywords yang mengindikasikan Claude Code (terminal/backend) */
const CLAUDE_CODE_KEYWORDS: Record<string, number> = {
    // Git operations — sangat kuat untuk CC
    'git': 3, 'commit': 3, 'push': 3, 'pull': 2, 'merge': 3,
    'branch': 3, 'rebase': 3, 'pr': 3, 'cherry-pick': 3,

    // Backend & API
    'backend': 2, 'api': 2, 'endpoint': 2, 'middleware': 2,
    'function': 1, 'cloud function': 3, 'server': 2,
    'rest': 2, 'graphql': 2, 'webhook': 2,

    // CLI & DevOps
    'npm': 3, 'pnpm': 3, 'cli': 2, 'terminal': 3,
    'deploy': 2, 'docker': 3, 'ci/cd': 3, 'pipeline': 2,

    // Testing (unit/integration)
    'test': 1, 'unit test': 3, 'integration test': 3,
    'vitest': 3, 'jest': 3, 'coverage': 2,

    // Refactoring & Infrastructure
    'refactor': 2, 'migrate': 2, 'restructure': 2,
    'config': 1, 'environment': 2, 'setup': 1,
    'database': 2, 'schema': 2, 'migration': 3,

    // MCP
    'mcp': 3, 'sentry': 2, 'slack': 1, 'github': 2,

    // Firebase
    'firebase': 2, 'firestore': 2, 'rules': 2,
};

/** Keywords yang mengindikasikan Antigravity (visual/frontend) */
const ANTIGRAVITY_KEYWORDS: Record<string, number> = {
    // UI Components
    'component': 2, 'komponen': 2, 'ui': 3, 'form': 2,
    'page': 1, 'halaman': 1, 'layout': 2, 'dashboard': 2,
    'button': 2, 'modal': 2, 'sidebar': 2, 'navbar': 2,
    'table': 1, 'card': 2, 'widget': 2,

    // Visual & Styling
    'style': 2, 'styling': 2, 'css': 3, 'tailwind': 3,
    'responsive': 2, 'dark mode': 2, 'theme': 2,
    'design': 2, 'mockup': 3, 'wireframe': 3,
    'warna': 1, 'color': 1, 'font': 1, 'typography': 2,

    // Visual Testing
    'screenshot': 3, 'lighthouse': 3, 'visual': 2,
    'e2e': 2, 'browser': 2, 'visual test': 3,
    'screenshot comparison': 3,

    // Frontend Framework
    'react': 2, 'next': 1, 'tsx': 2, 'jsx': 2,
    'hook': 1, 'state': 1, 'props': 1,

    // Parallel & Multi-agent
    'parallel': 2, 'multi-agent': 3, 'spawn': 2,

    // Design-to-Code
    'design-to-code': 3, 'pixel-perfect': 3,
    'figma': 3, 'sketch': 3,
};

/** Keywords yang mengindikasikan Dual Mode (kedua engine) */
const DUAL_KEYWORDS: Record<string, number> = {
    'sprint': 3, 'feature': 1, 'full-stack': 3, 'fullstack': 3,
    'crud': 2, 'deploy+verify': 3, 'deploy dan verify': 3,
    'security audit': 3, 'security-audit': 3,
    'e2e test': 2, 'performance': 2,
    'full': 1, 'lengkap': 1, 'complete': 1,
};

// === Command Parser ===

/**
 * Parse user message untuk extract command override dan task
 * @ref FC-PRD-01 §6.2 (Override Commands)
 */
export function parseCommand(message: string): ParsedCommand {
    const trimmed = message.trim();

    // Cek override commands
    const overridePatterns: Array<{ prefix: string; command: OverrideCommand }> = [
        { prefix: '/build:cc ', command: '/build:cc' },
        { prefix: '/build:ag ', command: '/build:ag' },
        { prefix: '/build:dual ', command: '/build:dual' },
        { prefix: '/build ', command: '/build' },
    ];

    for (const { prefix, command } of overridePatterns) {
        if (trimmed.toLowerCase().startsWith(prefix)) {
            return {
                command,
                task: trimmed.slice(prefix.length).trim(),
                isOverride: command !== '/build',
            };
        }
    }

    // Tidak ada command prefix — treat seluruh message sebagai task
    return {
        command: null,
        task: trimmed,
        isOverride: false,
    };
}

// === Keyword Scoring ===

/**
 * Hitung score keyword untuk menentukan engine terbaik
 * @ref FC-PRD-01 §6.2 (Keyword Scoring)
 *
 * Menggunakan weighted sum: match keyword → tambah weight ke engine score
 * Lalu normalisasi jadi confidence 0-1
 */
export function scoreKeywords(message: string): KeywordScore {
    const lower = message.toLowerCase();

    let ccScore = 0;
    let agScore = 0;
    let dualScore = 0;
    const ccMatched: string[] = [];
    const agMatched: string[] = [];
    const dualMatched: string[] = [];

    // Score Claude Code keywords
    for (const [keyword, weight] of Object.entries(CLAUDE_CODE_KEYWORDS)) {
        if (lower.includes(keyword)) {
            ccScore += weight;
            ccMatched.push(keyword);
        }
    }

    // Score Antigravity keywords
    for (const [keyword, weight] of Object.entries(ANTIGRAVITY_KEYWORDS)) {
        if (lower.includes(keyword)) {
            agScore += weight;
            agMatched.push(keyword);
        }
    }

    // Score Dual keywords
    for (const [keyword, weight] of Object.entries(DUAL_KEYWORDS)) {
        if (lower.includes(keyword)) {
            dualScore += weight;
            dualMatched.push(keyword);
        }
    }

    // Tentukan engine dengan score tertinggi
    const maxScore = Math.max(ccScore, agScore, dualScore);
    const totalScore = ccScore + agScore + dualScore;

    // Jika tidak ada keyword match sama sekali
    if (totalScore === 0) {
        return {
            engine: 'claude-code', // default fallback
            confidence: 0,
            matchedKeywords: [],
            confidenceLevel: 'low',
        };
    }

    // Tentukan engine dan keyword yang cocok
    let engine: Engine;
    let matchedKeywords: string[];

    if (dualScore >= ccScore && dualScore >= agScore && dualScore > 0) {
        engine = 'dual';
        matchedKeywords = dualMatched;
    } else if (ccScore >= agScore) {
        engine = 'claude-code';
        matchedKeywords = ccMatched;
    } else {
        engine = 'antigravity';
        matchedKeywords = agMatched;
    }

    // Hitung confidence — rasio score engine terpilih vs total
    // Plus bonus jika ada gap besar antara engine terpilih dan runner-up
    const confidence = Math.min(maxScore / Math.max(totalScore, 1), 1);
    const confidenceLevel = getConfidenceLevel(confidence);

    return {
        engine,
        confidence,
        matchedKeywords,
        confidenceLevel,
    };
}

/** Konversi confidence number ke level kategori */
function getConfidenceLevel(confidence: number): ConfidenceLevel {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.5) return 'medium';
    return 'low';
}

// === Main Router ===

/**
 * Route task ke engine yang tepat
 * Menggabungkan command parsing + keyword scoring + pattern selection
 *
 * @ref FC-PRD-01 §6 (FajarClaw Router)
 */
export function routeTask(message: string): RoutedTask {
    const parsed = parseCommand(message);

    // Jika user explicit override, langsung route
    if (parsed.isOverride && parsed.command) {
        const engineMap: Record<string, Engine> = {
            '/build:cc': 'claude-code',
            '/build:ag': 'antigravity',
            '/build:dual': 'dual',
        };
        const engine = engineMap[parsed.command] ?? 'claude-code';
        const pattern = selectPattern(engine, parsed.task);

        return {
            originalMessage: message,
            engine,
            confidence: 1.0,
            confidenceLevel: 'high',
            matchedKeywords: [`override:${parsed.command}`],
            pattern,
            timestamp: new Date(),
        };
    }

    // Auto-route berdasarkan keyword scoring
    const score = scoreKeywords(parsed.task || message);
    const pattern = selectPattern(score.engine, parsed.task || message);

    return {
        originalMessage: message,
        engine: score.engine,
        confidence: score.confidence,
        confidenceLevel: score.confidenceLevel,
        matchedKeywords: score.matchedKeywords,
        pattern,
        timestamp: new Date(),
    };
}

/**
 * Format routing decision untuk ditampilkan ke user
 */
export function formatRoutingDecision(routed: RoutedTask): string {
    const engineLabel: Record<Engine, string> = {
        'claude-code': '🔧 Claude Code',
        'antigravity': '🎨 Antigravity',
        'dual': '⚡ Dual Mode',
    };

    const patternLabel: Record<CollabPattern, string> = {
        'pipeline': '→ Pipeline (sequential)',
        'parallel': '⇉ Parallel (concurrent)',
        'verify': '✓ Verify (execute + check)',
    };

    const confidenceBar = '█'.repeat(Math.round(routed.confidence * 10)) +
        '░'.repeat(10 - Math.round(routed.confidence * 10));

    const lines = [
        `[ROUTER] ${engineLabel[routed.engine]}`,
        `Confidence: [${confidenceBar}] ${(routed.confidence * 100).toFixed(0)}%`,
        `Pattern: ${patternLabel[routed.pattern]}`,
        `Keywords: ${routed.matchedKeywords.join(', ') || 'none'}`,
    ];

    if (routed.confidenceLevel === 'low') {
        lines.push('⚠️ Confidence rendah — mungkin perlu klarifikasi dari user');
    }

    return lines.join('\n');
}

// === Layer 2: Semantic Routing ===

/** Result from semantic score lookup */
export interface SemanticScore {
    engine: Engine;
    confidence: number;
    source: string;
}

/**
 * Routing rules dataset — embedded rules for semantic matching.
 * In production these would be vectors in Milvus fc_routes collection.
 * @ref FC-PRD-01 §6.2 Layer 2 (Semantic Search)
 */
const ROUTING_RULES: Array<{ pattern: string; engine: Engine; weight: number }> = [
    // Claude Code patterns
    { pattern: 'push code ke github repository', engine: 'claude-code', weight: 0.95 },
    { pattern: 'buat REST API endpoint untuk data', engine: 'claude-code', weight: 0.92 },
    { pattern: 'deploy ke staging server', engine: 'claude-code', weight: 0.98 },
    { pattern: 'setup docker container', engine: 'claude-code', weight: 0.95 },
    { pattern: 'refactor module dan optimasi performa', engine: 'claude-code', weight: 0.88 },
    { pattern: 'write unit test untuk service', engine: 'claude-code', weight: 0.90 },
    { pattern: 'create migration database schema', engine: 'claude-code', weight: 0.93 },
    { pattern: 'setup CI/CD pipeline dengan GitHub Actions', engine: 'claude-code', weight: 0.95 },
    { pattern: 'implement authentication dan authorization', engine: 'claude-code', weight: 0.85 },
    { pattern: 'git commit dan push perubahan', engine: 'claude-code', weight: 0.97 },
    { pattern: 'buat cloud function firebase', engine: 'claude-code', weight: 0.94 },
    { pattern: 'configure environment variables', engine: 'claude-code', weight: 0.90 },
    { pattern: 'fix bug di backend service', engine: 'claude-code', weight: 0.88 },
    { pattern: 'install package dependency', engine: 'claude-code', weight: 0.92 },
    { pattern: 'create firestore security rules', engine: 'claude-code', weight: 0.91 },

    // Antigravity patterns
    { pattern: 'buat form component untuk registrasi', engine: 'antigravity', weight: 0.92 },
    { pattern: 'design dashboard layout responsive', engine: 'antigravity', weight: 0.95 },
    { pattern: 'screenshot halaman dan compare', engine: 'antigravity', weight: 0.96 },
    { pattern: 'buat halaman login dengan styling', engine: 'antigravity', weight: 0.90 },
    { pattern: 'implement sidebar navigation', engine: 'antigravity', weight: 0.88 },
    { pattern: 'buat modal dialog component', engine: 'antigravity', weight: 0.90 },
    { pattern: 'design to code dari mockup figma', engine: 'antigravity', weight: 0.96 },
    { pattern: 'run lighthouse audit', engine: 'antigravity', weight: 0.95 },
    { pattern: 'create UI table dengan pagination', engine: 'antigravity', weight: 0.89 },
    { pattern: 'buat responsive card grid layout', engine: 'antigravity', weight: 0.91 },
    { pattern: 'parallel agent build multiple components', engine: 'antigravity', weight: 0.93 },
    { pattern: 'visual regression testing', engine: 'antigravity', weight: 0.94 },
    { pattern: 'dark mode theme implementation', engine: 'antigravity', weight: 0.88 },
    { pattern: 'pixel perfect component matching', engine: 'antigravity', weight: 0.95 },

    // Dual patterns
    { pattern: 'buat full feature CRUD lengkap', engine: 'dual', weight: 0.93 },
    { pattern: 'sprint planning dan backlog', engine: 'dual', weight: 0.95 },
    { pattern: 'deploy dan verify semua halaman', engine: 'dual', weight: 0.92 },
    { pattern: 'full stack feature login sampai dashboard', engine: 'dual', weight: 0.94 },
    { pattern: 'security audit seluruh aplikasi', engine: 'dual', weight: 0.91 },
    { pattern: 'e2e test end to end semua flow', engine: 'dual', weight: 0.90 },
];

/**
 * Compute simple text similarity (word overlap / Jaccard).
 * Used as lightweight substitute for embedding similarity.
 */
function textSimilarity(a: string, b: string): number {
    const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 2));

    if (wordsA.size === 0 || wordsB.size === 0) return 0;

    let intersection = 0;
    for (const w of wordsA) {
        if (wordsB.has(w)) intersection++;
    }

    const union = new Set([...wordsA, ...wordsB]).size;
    return union > 0 ? intersection / union : 0;
}

/**
 * Score a message semantically against routing rules.
 * @ref FC-PRD-01 §6.2 Layer 2 (Semantic Search)
 *
 * Returns top-3 matches with weighted scores.
 */
export function scoreSemanticRules(message: string): SemanticScore | null {
    const scored = ROUTING_RULES.map(rule => ({
        ...rule,
        similarity: textSimilarity(message, rule.pattern) * rule.weight,
    }));

    scored.sort((a, b) => b.similarity - a.similarity);

    const top = scored[0];
    if (!top || top.similarity < 0.1) return null;

    return {
        engine: top.engine,
        confidence: Math.min(top.similarity * 2, 1), // Scale up
        source: top.pattern,
    };
}

/**
 * Route task with semantic layer (Layer 1 + Layer 2 fusion).
 * @ref FC-PRD-01 §6.2 (Fusion: combine scores)
 *
 * High confidence (≥0.8): route directly
 * Medium (0.5-0.8): use semantic result if available
 * Low (<0.5): ask user for clarification
 */
export function routeTaskWithSemantic(message: string): RoutedTask {
    const parsed = parseCommand(message);

    // Override: bypass scoring
    if (parsed.isOverride && parsed.command) {
        return routeTask(message);
    }

    const task = parsed.task || message;

    // Layer 1: Keyword scoring (~1ms)
    const keywordResult = scoreKeywords(task);

    // Layer 2: Semantic scoring (~1ms with local rules)
    const semanticResult = scoreSemanticRules(task);

    // Fusion: combine signals
    if (keywordResult.confidenceLevel === 'high') {
        // Strong keyword signal — trust it
        return routeTask(message);
    }

    if (semanticResult && semanticResult.confidence > keywordResult.confidence) {
        // Semantic is stronger — use it
        const pattern = selectPattern(semanticResult.engine, task);
        return {
            originalMessage: message,
            engine: semanticResult.engine,
            confidence: (keywordResult.confidence + semanticResult.confidence) / 2,
            confidenceLevel: getConfidenceLevel((keywordResult.confidence + semanticResult.confidence) / 2),
            matchedKeywords: [...keywordResult.matchedKeywords, `semantic:${semanticResult.source.slice(0, 30)}`],
            pattern,
            timestamp: new Date(),
        };
    }

    // Fall back to keyword result
    return routeTask(message);
}

