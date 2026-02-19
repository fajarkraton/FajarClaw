/**
 * FajarClaw Patterns — Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { selectPattern, describePattern } from './patterns.js';

describe('selectPattern', () => {
    // Single engine → selalu pipeline
    it('harus return pipeline untuk engine claude-code', () => {
        expect(selectPattern('claude-code', 'buat api endpoint')).toBe('pipeline');
    });

    it('harus return pipeline untuk engine antigravity', () => {
        expect(selectPattern('antigravity', 'buat form login')).toBe('pipeline');
    });

    // Dual engine — pattern detection
    it('harus return parallel untuk dual mode dengan "dan" keyword', () => {
        expect(selectPattern('dual', 'buat backend dan frontend')).toBe('parallel');
    });

    it('harus return verify untuk dual mode dengan "test" keyword', () => {
        expect(selectPattern('dual', 'jalankan test dan verify hasilnya')).toBe('verify');
    });

    it('harus return pipeline untuk dual mode dengan "lalu" keyword', () => {
        expect(selectPattern('dual', 'deploy lalu check di browser')).toBe('pipeline');
    });

    it('harus return parallel sebagai default untuk dual tanpa keyword pattern', () => {
        expect(selectPattern('dual', 'buat fitur baru')).toBe('parallel');
    });
});

describe('describePattern', () => {
    it('harus return single engine description untuk non-dual', () => {
        const desc = describePattern('pipeline', 'claude-code');
        expect(desc).toContain('Single engine');
        expect(desc).toContain('claude-code');
    });

    it('harus return parallel description untuk dual', () => {
        const desc = describePattern('parallel', 'dual');
        expect(desc).toContain('simultaneously');
    });

    it('harus return verify description untuk dual verify', () => {
        const desc = describePattern('verify', 'dual');
        expect(desc).toContain('validates');
    });
});
