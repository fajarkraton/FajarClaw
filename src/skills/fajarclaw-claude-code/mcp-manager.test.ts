/**
 * FajarClaw MCP Manager — Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { parseServerList, formatMCPStatus, type MCPServer } from './mcp-manager.js';

describe('parseServerList', () => {
    it('harus return empty array untuk input kosong', () => {
        expect(parseServerList('')).toEqual([]);
    });

    it('harus parse list dengan dash prefix', () => {
        const raw = '- github\n- sentry\n- firebase';
        const servers = parseServerList(raw);
        expect(servers).toHaveLength(3);
        expect(servers[0]!.name).toBe('github');
        expect(servers[1]!.name).toBe('sentry');
        expect(servers[2]!.name).toBe('firebase');
    });

    it('harus parse list dengan bullet prefix', () => {
        const raw = '• github-server\n• slack-bot';
        const servers = parseServerList(raw);
        expect(servers).toHaveLength(2);
        expect(servers[0]!.name).toBe('github-server');
    });

    it('harus set status ke unknown', () => {
        const servers = parseServerList('- test-server');
        expect(servers[0]!.status).toBe('unknown');
    });
});

describe('formatMCPStatus', () => {
    it('harus format status saat MCP tidak tersedia', () => {
        const result = formatMCPStatus(false, []);
        expect(result).toContain('tidak tersedia');
    });

    it('harus format status saat MCP tersedia tanpa servers', () => {
        const result = formatMCPStatus(true, []);
        expect(result).toContain('0 servers');
    });

    it('harus format status dengan servers', () => {
        const servers: MCPServer[] = [
            { name: 'github', status: 'connected' },
            { name: 'sentry', status: 'disconnected' },
        ];
        const result = formatMCPStatus(true, servers);
        expect(result).toContain('2 server(s)');
        expect(result).toContain('github');
        expect(result).toContain('sentry');
        expect(result).toContain('✅'); // connected
        expect(result).toContain('⬜'); // disconnected
    });
});
