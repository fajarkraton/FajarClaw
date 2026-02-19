/**
 * FajarClaw Router — Unit Tests
 * @ref FC-BP-01 §4.3 Day 2 (test keyword scoring accuracy)
 */

import { describe, it, expect } from 'vitest';
import { parseCommand, scoreKeywords, routeTask, formatRoutingDecision } from './router.js';

// === parseCommand Tests ===

describe('parseCommand', () => {
    it('harus parse /build:cc sebagai override Claude Code', () => {
        const result = parseCommand('/build:cc push ke GitHub');
        expect(result.command).toBe('/build:cc');
        expect(result.task).toBe('push ke GitHub');
        expect(result.isOverride).toBe(true);
    });

    it('harus parse /build:ag sebagai override Antigravity', () => {
        const result = parseCommand('/build:ag buat form login');
        expect(result.command).toBe('/build:ag');
        expect(result.task).toBe('buat form login');
        expect(result.isOverride).toBe(true);
    });

    it('harus parse /build:dual sebagai override Dual', () => {
        const result = parseCommand('/build:dual buat full-stack fitur login');
        expect(result.command).toBe('/build:dual');
        expect(result.task).toBe('buat full-stack fitur login');
        expect(result.isOverride).toBe(true);
    });

    it('harus parse /build sebagai auto-route (bukan override)', () => {
        const result = parseCommand('/build buat REST API');
        expect(result.command).toBe('/build');
        expect(result.task).toBe('buat REST API');
        expect(result.isOverride).toBe(false);
    });

    it('harus handle message tanpa command prefix', () => {
        const result = parseCommand('buatkan aku komponen sidebar');
        expect(result.command).toBeNull();
        expect(result.task).toBe('buatkan aku komponen sidebar');
        expect(result.isOverride).toBe(false);
    });

    it('harus case-insensitive untuk command', () => {
        const result = parseCommand('/BUILD:CC push ke GitHub');
        expect(result.command).toBe('/build:cc');
        expect(result.isOverride).toBe(true);
    });
});

// === scoreKeywords Tests ===

describe('scoreKeywords', () => {
    // Claude Code routing
    it('harus route "git push origin main" ke Claude Code', () => {
        const result = scoreKeywords('git push origin main');
        expect(result.engine).toBe('claude-code');
        expect(result.confidence).toBeGreaterThan(0);
        expect(result.matchedKeywords).toContain('git');
        expect(result.matchedKeywords).toContain('push');
    });

    it('harus route "buat REST API endpoint" ke Claude Code', () => {
        const result = scoreKeywords('buat REST API endpoint');
        expect(result.engine).toBe('claude-code');
        expect(result.matchedKeywords).toContain('api');
        expect(result.matchedKeywords).toContain('endpoint');
    });

    it('harus route "deploy ke production dengan docker" ke Claude Code', () => {
        const result = scoreKeywords('deploy ke production dengan docker');
        expect(result.engine).toBe('claude-code');
        expect(result.matchedKeywords).toContain('deploy');
        expect(result.matchedKeywords).toContain('docker');
    });

    it('harus route "npm install dan jalankan unit test" ke Claude Code', () => {
        const result = scoreKeywords('npm install dan jalankan unit test');
        expect(result.engine).toBe('claude-code');
        expect(result.matchedKeywords).toContain('npm');
    });

    // Antigravity routing
    it('harus route "buat form component login" ke Antigravity', () => {
        const result = scoreKeywords('buat form component login');
        expect(result.engine).toBe('antigravity');
        expect(result.matchedKeywords).toContain('form');
        expect(result.matchedKeywords).toContain('component');
    });

    it('harus route "buat dashboard layout responsive" ke Antigravity', () => {
        const result = scoreKeywords('buat dashboard layout responsive');
        expect(result.engine).toBe('antigravity');
        expect(result.matchedKeywords).toContain('dashboard');
        expect(result.matchedKeywords).toContain('layout');
        expect(result.matchedKeywords).toContain('responsive');
    });

    it('harus route "jalankan lighthouse audit dan screenshot" ke Antigravity', () => {
        const result = scoreKeywords('jalankan lighthouse audit dan screenshot');
        expect(result.engine).toBe('antigravity');
        expect(result.matchedKeywords).toContain('lighthouse');
        expect(result.matchedKeywords).toContain('screenshot');
    });

    it('harus route "buat komponen UI dengan tailwind styling" ke Antigravity', () => {
        const result = scoreKeywords('buat komponen UI dengan tailwind styling');
        expect(result.engine).toBe('antigravity');
        expect(result.matchedKeywords).toContain('komponen');
        expect(result.matchedKeywords).toContain('ui');
        expect(result.matchedKeywords).toContain('tailwind');
    });

    // Dual Mode routing
    it('harus route "buat full-stack feature sprint" ke Dual', () => {
        const result = scoreKeywords('buat full-stack feature sprint');
        expect(result.engine).toBe('dual');
        expect(result.matchedKeywords).toContain('full-stack');
        expect(result.matchedKeywords).toContain('sprint');
    });

    it('harus route "security audit aplikasi" ke Dual', () => {
        const result = scoreKeywords('security audit aplikasi');
        expect(result.engine).toBe('dual');
        expect(result.matchedKeywords).toContain('security audit');
    });

    // Edge cases
    it('harus return confidence rendah untuk pesan tanpa keyword', () => {
        const result = scoreKeywords('hai apa kabar');
        expect(result.confidence).toBe(0);
        expect(result.confidenceLevel).toBe('low');
        expect(result.matchedKeywords).toHaveLength(0);
    });

    it('harus handle pesan kosong', () => {
        const result = scoreKeywords('');
        expect(result.confidence).toBe(0);
        expect(result.engine).toBe('claude-code'); // default
    });
});

// === routeTask Tests (Full Pipeline) ===

describe('routeTask', () => {
    it('harus override ke Claude Code dengan /build:cc', () => {
        const result = routeTask('/build:cc push ke GitHub');
        expect(result.engine).toBe('claude-code');
        expect(result.confidence).toBe(1.0);
        expect(result.confidenceLevel).toBe('high');
    });

    it('harus override ke Antigravity dengan /build:ag', () => {
        const result = routeTask('/build:ag buat button component');
        expect(result.engine).toBe('antigravity');
        expect(result.confidence).toBe(1.0);
    });

    it('harus override ke Dual dengan /build:dual', () => {
        const result = routeTask('/build:dual buat login system');
        expect(result.engine).toBe('dual');
        expect(result.confidence).toBe(1.0);
    });

    it('harus auto-route /build ke engine berdasarkan keyword', () => {
        const result = routeTask('/build buat form login');
        expect(result.engine).toBe('antigravity'); // "form" keyword
    });

    it('harus auto-route message tanpa command berdasarkan keyword', () => {
        const result = routeTask('commit perubahan ke git');
        expect(result.engine).toBe('claude-code');
    });

    it('harus include pattern dalam hasil route', () => {
        const result = routeTask('/build:dual buat backend dan frontend');
        expect(result.pattern).toBeDefined();
        expect(['pipeline', 'parallel', 'verify']).toContain(result.pattern);
    });

    it('harus include timestamp', () => {
        const result = routeTask('/build test');
        expect(result.timestamp).toBeInstanceOf(Date);
    });
});

// === formatRoutingDecision Tests ===

describe('formatRoutingDecision', () => {
    it('harus format Claude Code routing decision', () => {
        const routed = routeTask('/build:cc deploy');
        const formatted = formatRoutingDecision(routed);
        expect(formatted).toContain('Claude Code');
        expect(formatted).toContain('100%');
    });

    it('harus tampilkan warning untuk low confidence', () => {
        const routed = routeTask('halo saja');
        const formatted = formatRoutingDecision(routed);
        expect(formatted).toContain('⚠️');
    });
});
