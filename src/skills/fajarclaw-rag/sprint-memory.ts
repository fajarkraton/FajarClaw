/**
 * FajarClaw RAG — Sprint Memory
 * @ref FC-PRD-01 §10.11 (Sprint Memory)
 *
 * Store and retrieve decisions/learnings as vectors in Milvus.
 * Enables FajarClaw to "remember" across sprints and phases.
 *
 * Collection: fc_decisions (created in collection-schemas.ts)
 *
 * Phase A4: Intelligence Layer
 */

import { insert, search } from './milvus-client.js';
import { embedSingle } from './embedder.js';
import { createHash } from 'crypto';

// === Types ===

export interface Decision {
    /** Unique ID */
    id: string;
    /** Decision text */
    text: string;
    /** Phase when decision was made (e.g., "A1", "A3") */
    phase: string;
    /** Category (e.g., "architecture", "tooling", "pattern") */
    category: string;
    /** Sprint number (0 for non-sprint decisions) */
    sprint: number;
    /** Timestamp (epoch ms) */
    timestamp: number;
    /** Tags for filtering */
    tags: string[];
}

export interface SaveDecisionOptions {
    /** Phase (e.g., "A3") */
    phase: string;
    /** Category */
    category?: string;
    /** Sprint number */
    sprint?: number;
    /** Tags */
    tags?: string[];
}

export interface RecallResult {
    /** Matched decision text */
    text: string;
    /** Phase */
    phase: string;
    /** Category */
    category: string;
    /** Similarity score */
    score: number;
    /** Tags */
    tags: string[];
    /** When it was stored */
    timestamp: number;
}

export interface SprintRetro {
    /** Sprint number */
    sprint: number;
    /** Phase */
    phase: string;
    /** Decisions made */
    decisions: string[];
    /** Lessons learned */
    lessons: string[];
    /** What went well */
    wins: string[];
    /** What to improve */
    improvements: string[];
}

// === Constants ===

const DECISIONS_COLLECTION = 'fc_decisions';

// === Core Functions ===

/**
 * Save a decision/learning to Milvus as a vector.
 *
 * @param text - The decision or learning text
 * @param options - Phase, category, sprint, tags
 * @returns The decision ID
 */
export async function saveDecision(
    text: string,
    options: SaveDecisionOptions
): Promise<string> {
    const id = createHash('sha256')
        .update(`${text}:${options.phase}:${Date.now()}`)
        .digest('hex')
        .slice(0, 32);

    const embedding = await embedSingle(text);

    const decision: Decision = {
        id,
        text,
        phase: options.phase,
        category: options.category ?? 'general',
        sprint: options.sprint ?? 0,
        timestamp: Date.now(),
        tags: options.tags ?? [],
    };

    await insert(DECISIONS_COLLECTION, [{
        id: decision.id,
        text: decision.text,
        dense_vector: embedding.dense,
        source: `sprint:${decision.sprint}:${decision.phase}`,
        section: decision.category,
        doc_type: 'decision',
        language: 'mixed',
        created_at: decision.timestamp,
    }]);

    return id;
}

/**
 * Recall past decisions by semantic similarity.
 *
 * @param query - What to search for
 * @param topK - Number of results (default: 5)
 * @param phaseFilter - Optional filter by phase
 */
export async function recallDecisions(
    query: string,
    topK: number = 5,
    phaseFilter?: string
): Promise<RecallResult[]> {
    const embedding = await embedSingle(query);

    const filter = phaseFilter
        ? `source like "%${phaseFilter}%"`
        : undefined;

    const results = await search({
        collection: DECISIONS_COLLECTION,
        vector: embedding.dense,
        topK,
        outputFields: ['text', 'source', 'section', 'created_at'],
        filter,
    });

    return results.map(r => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const record = r as any;
        const source = String(record.source ?? '');
        const parts = source.split(':');

        return {
            text: String(record.text ?? ''),
            phase: parts[2] ?? '',
            category: String(record.section ?? 'general'),
            score: Number(record.score ?? 0),
            tags: [],
            timestamp: Number(record.created_at ?? 0),
        };
    });
}

/**
 * Save a sprint retrospective (multiple decisions at once)
 */
export async function saveSprintRetro(retro: SprintRetro): Promise<string[]> {
    const ids: string[] = [];

    const allItems = [
        ...retro.decisions.map(d => ({ text: d, category: 'decision' })),
        ...retro.lessons.map(l => ({ text: l, category: 'lesson' })),
        ...retro.wins.map(w => ({ text: w, category: 'win' })),
        ...retro.improvements.map(i => ({ text: i, category: 'improvement' })),
    ];

    for (const item of allItems) {
        const id = await saveDecision(item.text, {
            phase: retro.phase,
            category: item.category,
            sprint: retro.sprint,
            tags: ['retro'],
        });
        ids.push(id);
    }

    return ids;
}

// === Parsing ===

/**
 * Parse a sprint retro from text input.
 *
 * Format:
 * ```
 * Sprint: 3
 * Phase: A3
 *
 * Decisions:
 * - Use RRF with k=60 for ranking
 * - Template-based HyDE over LLM calls
 *
 * Lessons:
 * - ESM dynamic import needed for self-building tests
 *
 * Wins:
 * - 207 tests passing, zero TS errors
 *
 * Improvements:
 * - Need better truncation test thresholds
 * ```
 */
export function parseSprintRetro(input: string): SprintRetro {
    const lines = input.split('\n');

    let sprint = 0;
    let phase = '';
    const decisions: string[] = [];
    const lessons: string[] = [];
    const wins: string[] = [];
    const improvements: string[] = [];

    let currentSection = '';

    for (const line of lines) {
        const trimmed = line.trim();

        // Parse header fields
        const sprintMatch = trimmed.match(/^Sprint:\s*(\d+)/i);
        if (sprintMatch) { sprint = parseInt(sprintMatch[1]!, 10); continue; }

        const phaseMatch = trimmed.match(/^Phase:\s*(\S+)/i);
        if (phaseMatch) { phase = phaseMatch[1]!; continue; }

        // Detect section headers
        if (/^Decisions?:/i.test(trimmed)) { currentSection = 'decisions'; continue; }
        if (/^Lessons?:/i.test(trimmed)) { currentSection = 'lessons'; continue; }
        if (/^Wins?:/i.test(trimmed)) { currentSection = 'wins'; continue; }
        if (/^Improvements?:/i.test(trimmed)) { currentSection = 'improvements'; continue; }

        // Parse bullet items
        const bulletMatch = trimmed.match(/^[-*]\s+(.+)/);
        if (bulletMatch && currentSection) {
            const item = bulletMatch[1]!;
            switch (currentSection) {
                case 'decisions': decisions.push(item); break;
                case 'lessons': lessons.push(item); break;
                case 'wins': wins.push(item); break;
                case 'improvements': improvements.push(item); break;
            }
        }
    }

    return { sprint, phase, decisions, lessons, wins, improvements };
}

// === Formatting ===

/**
 * Format recalled decisions for display
 */
export function formatRecalledDecisions(results: RecallResult[], query: string): string {
    if (results.length === 0) {
        return `🧠 No past decisions found for: "${query}"`;
    }

    const lines = [
        `🧠 Sprint Memory: "${query}"`,
        `${'─'.repeat(45)}`,
    ];

    for (let i = 0; i < results.length; i++) {
        const r = results[i]!;
        const age = formatAge(r.timestamp);
        const scorePct = (r.score * 100).toFixed(0);
        lines.push(`  ${i + 1}. [${scorePct}%] [${r.phase}/${r.category}] ${r.text.slice(0, 120)}`);
        lines.push(`     ${age}`);
    }

    return lines.join('\n');
}

/**
 * Format age from timestamp
 */
function formatAge(timestamp: number): string {
    if (timestamp === 0) return '';
    const diff = Date.now() - timestamp;
    const hours = Math.floor(diff / 3_600_000);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'just now';
}

/**
 * Format sprint retro for display
 */
export function formatSprintRetro(retro: SprintRetro): string {
    const lines = [
        `📋 Sprint ${retro.sprint} Retro (${retro.phase})`,
        `${'═'.repeat(40)}`,
    ];

    if (retro.decisions.length > 0) {
        lines.push('', '📌 Decisions:');
        retro.decisions.forEach(d => lines.push(`  - ${d}`));
    }
    if (retro.lessons.length > 0) {
        lines.push('', '📖 Lessons:');
        retro.lessons.forEach(l => lines.push(`  - ${l}`));
    }
    if (retro.wins.length > 0) {
        lines.push('', '🏆 Wins:');
        retro.wins.forEach(w => lines.push(`  - ${w}`));
    }
    if (retro.improvements.length > 0) {
        lines.push('', '🔧 Improvements:');
        retro.improvements.forEach(i => lines.push(`  - ${i}`));
    }

    return lines.join('\n');
}
