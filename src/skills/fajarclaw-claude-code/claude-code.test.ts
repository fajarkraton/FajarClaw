/**
 * FajarClaw Claude Code — Unit Tests
 * @ref FC-BP-01 §4.3 Day 3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    resetDetectionCache,
    type ClaudeCodeOptions,
} from './claude-code.js';

// === Tests tanpa actual execution (mock-friendly) ===

describe('ClaudeCodeOptions', () => {
    it('harus accept minimal options', () => {
        const opts: ClaudeCodeOptions = {
            prompt: 'buat hello world',
        };
        expect(opts.prompt).toBe('buat hello world');
        expect(opts.mode).toBeUndefined();
        expect(opts.cwd).toBeUndefined();
    });

    it('harus accept full options', () => {
        const opts: ClaudeCodeOptions = {
            prompt: 'buat API endpoint',
            cwd: '/home/user/project',
            model: 'claude-opus-4-0',
            maxTokens: 4096,
            mode: 'cli',
            timeout: 60000,
            context: 'Existing code: ...',
        };
        expect(opts.mode).toBe('cli');
        expect(opts.timeout).toBe(60000);
        expect(opts.context).toContain('Existing');
    });
});

describe('resetDetectionCache', () => {
    it('harus bisa dipanggil tanpa error', () => {
        expect(() => resetDetectionCache()).not.toThrow();
    });
});
