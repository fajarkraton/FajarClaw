/**
 * FajarClaw Patterns — Pola Kolaborasi Dual-Engine
 * @ref FC-PRD-01 §5.3 (Collaboration Patterns)
 *
 * Menentukan bagaimana dua engine berkolaborasi:
 * - Pipeline: Engine A output → Engine B input (sequential)
 * - Parallel: Engine A dan B kerja bersamaan (independent)
 * - Verify: Engine A execute → Engine B verify result
 */

import type { Engine, CollabPattern } from '../../types/index.js';

// === Pattern Detection Keywords ===

/** Keywords yang mengindikasikan pipeline pattern */
const PIPELINE_INDICATORS = [
    'deploy', 'lalu', 'kemudian', 'then', 'setelah',
    'verify', 'check', 'pastikan', 'ensure',
];

/** Keywords yang mengindikasikan parallel pattern */
const PARALLEL_INDICATORS = [
    'dan', 'and', 'plus', 'serta', 'bersamaan',
    'parallel', 'concurrent', 'simultaneously',
    'sekaligus', 'juga',
];

/** Keywords yang mengindikasikan verify pattern */
const VERIFY_INDICATORS = [
    'test', 'verify', 'check', 'audit', 'review',
    'validate', 'periksa', 'cek', 'uji',
    'lighthouse', 'screenshot', 'e2e',
];

// === Pattern Selection ===

/**
 * Pilih pola kolaborasi berdasarkan engine dan konten task
 * @ref FC-PRD-01 §5.3
 *
 * Rules:
 * - Jika engine bukan 'dual', pattern selalu 'pipeline' (single engine)
 * - Jika dual mode, analisis task content untuk tentukan pattern
 */
export function selectPattern(engine: Engine, taskContent: string): CollabPattern {
    // Single engine → selalu pipeline (tidak ada kolaborasi)
    if (engine !== 'dual') {
        return 'pipeline';
    }

    const lower = taskContent.toLowerCase();

    // Hitung skor per pattern
    let pipelineScore = 0;
    let parallelScore = 0;
    let verifyScore = 0;

    for (const keyword of PIPELINE_INDICATORS) {
        if (lower.includes(keyword)) pipelineScore++;
    }

    for (const keyword of PARALLEL_INDICATORS) {
        if (lower.includes(keyword)) parallelScore++;
    }

    for (const keyword of VERIFY_INDICATORS) {
        if (lower.includes(keyword)) verifyScore++;
    }

    // Pilih pattern dengan skor tertinggi
    const maxScore = Math.max(pipelineScore, parallelScore, verifyScore);

    if (maxScore === 0) {
        // Default untuk dual mode: parallel (paling efisien)
        return 'parallel';
    }

    if (verifyScore >= pipelineScore && verifyScore >= parallelScore) {
        return 'verify';
    }

    if (parallelScore >= pipelineScore) {
        return 'parallel';
    }

    return 'pipeline';
}

/**
 * Deskripsi eksekusi berdasarkan pattern
 * Untuk ditampilkan ke user saat routing decision
 */
export function describePattern(pattern: CollabPattern, engine: Engine): string {
    if (engine !== 'dual') {
        return `Single engine execution via ${engine}`;
    }

    switch (pattern) {
        case 'pipeline':
            return 'Pipeline: Claude Code executes → Antigravity verifies';
        case 'parallel':
            return 'Parallel: Claude Code + Antigravity work simultaneously';
        case 'verify':
            return 'Verify: One engine executes → other engine validates';
    }
}
