/**
 * FajarClaw RAG — Sprint Memory Tests
 *
 * Unit tests for retrospective parsing, formatting, and age display.
 * Integration tests (actually saving to Milvus) are skipped unless Milvus + embed server are available.
 */

import { describe, it, expect } from 'vitest';
import {
    parseSprintRetro,
    formatSprintRetro,
    formatRecalledDecisions,
    type RecallResult,
    type SprintRetro,
} from './sprint-memory.js';

// === Parse Tests ===

describe('parseSprintRetro', () => {
    const sampleRetro = `
Sprint: 3
Phase: A3

Decisions:
- Use RRF with k=60 for hybrid ranking
- Template-based HyDE instead of LLM calls

Lessons:
- ESM dynamic import needed for self-building tests
- Pad token must be set for batch inference

Wins:
- 207 tests passing, zero TS errors
- Reranker running on CUDA

Improvements:
- Need better truncation test thresholds
`;

    it('harus parse sprint number and phase', () => {
        const retro = parseSprintRetro(sampleRetro);
        expect(retro.sprint).toBe(3);
        expect(retro.phase).toBe('A3');
    });

    it('harus parse decisions', () => {
        const retro = parseSprintRetro(sampleRetro);
        expect(retro.decisions.length).toBe(2);
        expect(retro.decisions[0]).toContain('RRF');
        expect(retro.decisions[1]).toContain('HyDE');
    });

    it('harus parse lessons', () => {
        const retro = parseSprintRetro(sampleRetro);
        expect(retro.lessons.length).toBe(2);
        expect(retro.lessons[0]).toContain('ESM');
    });

    it('harus parse wins', () => {
        const retro = parseSprintRetro(sampleRetro);
        expect(retro.wins.length).toBe(2);
        expect(retro.wins[0]).toContain('207');
    });

    it('harus parse improvements', () => {
        const retro = parseSprintRetro(sampleRetro);
        expect(retro.improvements.length).toBe(1);
        expect(retro.improvements[0]).toContain('truncation');
    });

    it('harus handle empty input', () => {
        const retro = parseSprintRetro('');
        expect(retro.sprint).toBe(0);
        expect(retro.phase).toBe('');
        expect(retro.decisions.length).toBe(0);
    });

    it('harus handle minimal input', () => {
        const retro = parseSprintRetro('Sprint: 1\nPhase: A1\nDecisions:\n- First decision');
        expect(retro.sprint).toBe(1);
        expect(retro.decisions.length).toBe(1);
    });
});

// === Format Tests ===

describe('formatSprintRetro', () => {
    const mockRetro: SprintRetro = {
        sprint: 3,
        phase: 'A3',
        decisions: ['Use RRF with k=60'],
        lessons: ['ESM import needed'],
        wins: ['207 tests passing'],
        improvements: ['Better truncation tests'],
    };

    it('harus format retro with all sections', () => {
        const formatted = formatSprintRetro(mockRetro);
        expect(formatted).toContain('Sprint 3');
        expect(formatted).toContain('A3');
        expect(formatted).toContain('📌 Decisions');
        expect(formatted).toContain('📖 Lessons');
        expect(formatted).toContain('🏆 Wins');
        expect(formatted).toContain('🔧 Improvements');
        expect(formatted).toContain('RRF');
    });

    it('harus skip empty sections', () => {
        const minimal: SprintRetro = {
            sprint: 1, phase: 'A1',
            decisions: ['One decision'],
            lessons: [], wins: [], improvements: [],
        };
        const formatted = formatSprintRetro(minimal);
        expect(formatted).toContain('📌 Decisions');
        expect(formatted).not.toContain('📖 Lessons');
    });
});

describe('formatRecalledDecisions', () => {
    it('harus format recalled results', () => {
        const results: RecallResult[] = [
            { text: 'Use RRF with k=60', phase: 'A3', category: 'decision', score: 0.92, tags: [], timestamp: Date.now() - 86400000 },
            { text: 'Template-based HyDE', phase: 'A3', category: 'decision', score: 0.85, tags: [], timestamp: Date.now() - 3600000 },
        ];
        const formatted = formatRecalledDecisions(results, 'ranking strategy');
        expect(formatted).toContain('🧠 Sprint Memory');
        expect(formatted).toContain('ranking strategy');
        expect(formatted).toContain('92%');
        expect(formatted).toContain('RRF');
        expect(formatted).toContain('1d ago');
    });

    it('harus handle empty results', () => {
        const formatted = formatRecalledDecisions([], 'unknown topic');
        expect(formatted).toContain('No past decisions found');
    });
});
