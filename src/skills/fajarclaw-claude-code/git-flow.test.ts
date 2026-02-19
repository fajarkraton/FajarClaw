/**
 * FajarClaw Git Flow — Unit Tests
 * @ref FC-BP-01 §4.3 Day 3
 */

import { describe, it, expect } from 'vitest';
import {
    formatCommitMessage,
    getCurrentBranch,
    getStatus,
    getLog,
    type CommitOptions,
} from './git-flow.js';

const PROJECT_CWD = '/home/primecore/Documents/FajarClaw';

describe('formatCommitMessage', () => {
    it('harus format feat tanpa scope', () => {
        const opts: CommitOptions = {
            type: 'feat',
            message: 'add login form',
        };
        expect(formatCommitMessage(opts)).toBe('feat: add login form');
    });

    it('harus format feat dengan scope', () => {
        const opts: CommitOptions = {
            type: 'feat',
            scope: 'auth',
            message: 'add login form',
        };
        expect(formatCommitMessage(opts)).toBe('feat(auth): add login form');
    });

    it('harus format fix dengan scope', () => {
        const opts: CommitOptions = {
            type: 'fix',
            scope: 'router',
            message: 'handle empty message',
        };
        expect(formatCommitMessage(opts)).toBe('fix(router): handle empty message');
    });

    it('harus format chore', () => {
        const opts: CommitOptions = {
            type: 'chore',
            message: 'update dependencies',
        };
        expect(formatCommitMessage(opts)).toBe('chore: update dependencies');
    });

    it('harus format docs dengan scope', () => {
        const opts: CommitOptions = {
            type: 'docs',
            scope: 'readme',
            message: 'update installation guide',
        };
        expect(formatCommitMessage(opts)).toBe('docs(readme): update installation guide');
    });

    it('harus format refactor', () => {
        const opts: CommitOptions = {
            type: 'refactor',
            scope: 'router',
            message: 'extract keyword scoring',
        };
        expect(formatCommitMessage(opts)).toBe('refactor(router): extract keyword scoring');
    });

    it('harus format test', () => {
        const opts: CommitOptions = {
            type: 'test',
            message: 'add merger test cases',
        };
        expect(formatCommitMessage(opts)).toBe('test: add merger test cases');
    });
});

describe('getCurrentBranch', () => {
    it('harus return nama branch saat ini', async () => {
        const branch = await getCurrentBranch(PROJECT_CWD);
        expect(branch).toBe('main');
    });
});

describe('getStatus', () => {
    it('harus return status file', async () => {
        const status = await getStatus(PROJECT_CWD);
        expect(status).toHaveProperty('staged');
        expect(status).toHaveProperty('modified');
        expect(status).toHaveProperty('untracked');
        expect(Array.isArray(status.staged)).toBe(true);
    });
});

describe('getLog', () => {
    it('harus return git log', async () => {
        const log = await getLog(5, PROJECT_CWD);
        expect(log).toContain('feat');
    });
});
