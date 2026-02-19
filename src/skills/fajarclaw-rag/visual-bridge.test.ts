/**
 * FajarClaw RAG — Visual-Code Bridge Tests
 */

import { describe, it, expect } from 'vitest';
import {
    createMapping,
    formatCodeForScreenshot,
    formatVisualDiffReport,
    type CodeForScreenshot,
    type VisualDiffReport,
    type VisualDiffResult,
    type ScreenshotMapping,
} from './visual-bridge.js';

describe('createMapping', () => {
    it('harus create a screenshot mapping', () => {
        const mapping = createMapping(
            '/screenshots/login.png',
            'src/pages/login.tsx',
            'LoginForm',
            '/login',
            3
        );
        expect(mapping.screenshot).toBe('/screenshots/login.png');
        expect(mapping.sourceFile).toBe('src/pages/login.tsx');
        expect(mapping.component).toBe('LoginForm');
        expect(mapping.page).toBe('/login');
        expect(mapping.sprint).toBe(3);
        expect(mapping.timestamp).toBeGreaterThan(0);
    });
});

describe('formatCodeForScreenshot', () => {
    it('harus format visual + code matches', () => {
        const result: CodeForScreenshot = {
            visualMatches: [
                { source: '/img/login.png', component: 'LoginForm', score: 0.95 },
                { source: '/img/signup.png', component: 'SignupForm', score: 0.78 },
            ],
            codeMatches: [
                { text: 'export function LoginForm() { return <div>...', source: 'src/pages/login.tsx', score: 0.88 },
            ],
            durationMs: 320,
        };
        const formatted = formatCodeForScreenshot(result);
        expect(formatted).toContain('🔗 Visual → Code Bridge');
        expect(formatted).toContain('📸 Similar Screenshots');
        expect(formatted).toContain('95%');
        expect(formatted).toContain('LoginForm');
        expect(formatted).toContain('💻 Related Code');
        expect(formatted).toContain('login.tsx');
        expect(formatted).toContain('320ms');
    });

    it('harus handle empty matches', () => {
        const result: CodeForScreenshot = {
            visualMatches: [],
            codeMatches: [],
            durationMs: 50,
        };
        const formatted = formatCodeForScreenshot(result);
        expect(formatted).toContain('🔗 Visual → Code Bridge');
        expect(formatted).not.toContain('📸');
    });
});

describe('formatVisualDiffReport', () => {
    it('harus show changed and stable components', () => {
        const report: VisualDiffReport = {
            diffs: [
                { current: '/a.png', baseline: '/a-base.png', similarity: 0.6, hasChanged: true, threshold: 0.85 },
                { current: '/b.png', baseline: '/b-base.png', similarity: 0.95, hasChanged: false, threshold: 0.85 },
            ],
            changed: ['HeaderNav'],
            stable: ['Footer'],
            durationMs: 450,
        };
        const formatted = formatVisualDiffReport(report);
        expect(formatted).toContain('👁️ Visual Diff Report');
        expect(formatted).toContain('Changed: 1');
        expect(formatted).toContain('Stable: 1');
        expect(formatted).toContain('🔴 Changed');
        expect(formatted).toContain('HeaderNav');
        expect(formatted).toContain('🟢 Stable');
        expect(formatted).toContain('Footer');
    });

    it('harus handle all stable', () => {
        const report: VisualDiffReport = {
            diffs: [],
            changed: [],
            stable: ['A', 'B', 'C'],
            durationMs: 100,
        };
        const formatted = formatVisualDiffReport(report);
        expect(formatted).toContain('Changed: 0');
        expect(formatted).toContain('Stable: 3');
    });
});

describe('VisualDiffResult type', () => {
    it('harus have correct shape', () => {
        const diff: VisualDiffResult = {
            current: '/current.png',
            baseline: '/baseline.png',
            similarity: 0.92,
            hasChanged: false,
            threshold: 0.85,
        };
        expect(diff.hasChanged).toBe(false);
        expect(diff.similarity).toBeGreaterThan(diff.threshold);
    });
});
