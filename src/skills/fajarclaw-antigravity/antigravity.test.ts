/**
 * FajarClaw Antigravity — Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
    formatStatus,
    resetConnectionCache,
    type AntigravityConnection,
} from './antigravity.js';

describe('formatStatus', () => {
    it('harus format status connected via IDE', () => {
        const conn: AntigravityConnection = {
            status: 'connected',
            mode: 'ide',
            endpoint: 'localhost',
            version: '1.0.0',
        };
        const result = formatStatus(conn);
        expect(result).toContain('🟢');
        expect(result).toContain('IDE Direct');
        expect(result).toContain('localhost');
    });

    it('harus format status connected via browser', () => {
        const conn: AntigravityConnection = {
            status: 'connected',
            mode: 'browser',
            endpoint: 'cdp://localhost',
        };
        const result = formatStatus(conn);
        expect(result).toContain('🟢');
        expect(result).toContain('Browser CDP');
    });

    it('harus format status disconnected', () => {
        const conn: AntigravityConnection = {
            status: 'disconnected',
            mode: 'none',
        };
        const result = formatStatus(conn);
        expect(result).toContain('🔴');
        expect(result).toContain('Not Connected');
    });

    it('harus format status fallback', () => {
        const conn: AntigravityConnection = {
            status: 'fallback',
            mode: 'browser',
        };
        const result = formatStatus(conn);
        expect(result).toContain('🟡');
    });
});

describe('resetConnectionCache', () => {
    it('harus reset tanpa error', () => {
        expect(() => resetConnectionCache()).not.toThrow();
    });
});
