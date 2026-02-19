/**
 * FajarClaw MCP Manager — MCP Server Orchestration (Basic)
 * @ref FC-PRD-01 §7.2C (MCP Server Orchestration)
 *
 * Phase A1: basic MCP listing dan info
 * Fase selanjutnya: full MCP tool calling
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// === Types ===

/** Info tentang MCP server yang terinstall */
export interface MCPServer {
    name: string;
    status: 'connected' | 'disconnected' | 'unknown';
}

/** Hasil MCP operation */
export interface MCPResult {
    success: boolean;
    data: string;
    error?: string;
}

// === MCP Operations ===

/**
 * Cek apakah MCP tersedia via Claude Code CLI
 */
export async function isMCPAvailable(): Promise<boolean> {
    try {
        await execFileAsync('claude', ['mcp', 'list'], {
            timeout: 10_000,
        });
        return true;
    } catch {
        return false;
    }
}

/**
 * List semua MCP servers yang terkonfigurasi
 * @ref FC-PRD-01 §7.2C
 */
export async function listServers(): Promise<MCPResult> {
    try {
        const { stdout } = await execFileAsync('claude', ['mcp', 'list'], {
            timeout: 10_000,
        });

        return {
            success: true,
            data: stdout.trim(),
        };
    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return {
            success: false,
            data: '',
            error: `Gagal list MCP servers: ${errorMsg}`,
        };
    }
}

/**
 * Dapatkan detail server MCP tertentu
 */
export async function getServerInfo(serverName: string): Promise<MCPResult> {
    try {
        const { stdout } = await execFileAsync(
            'claude', ['mcp', 'get', serverName],
            { timeout: 10_000 }
        );

        return {
            success: true,
            data: stdout.trim(),
        };
    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return {
            success: false,
            data: '',
            error: `Gagal get info server ${serverName}: ${errorMsg}`,
        };
    }
}

/**
 * Parse output MCP list menjadi structured data
 * Output format bervariasi, ini parser basic
 */
export function parseServerList(rawOutput: string): MCPServer[] {
    if (!rawOutput.trim()) return [];

    const servers: MCPServer[] = [];
    const lines = rawOutput.split('\n').filter(Boolean);

    for (const line of lines) {
        // Coba parse berbagai format output
        const trimmed = line.trim();
        if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
            const name = trimmed.replace(/^[-•]\s*/, '').split(/\s+/)[0];
            if (name) {
                servers.push({ name, status: 'unknown' });
            }
        } else if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('MCP')) {
            const name = trimmed.split(/\s+/)[0];
            if (name) {
                servers.push({ name, status: 'unknown' });
            }
        }
    }

    return servers;
}

/**
 * Format MCP status untuk display
 */
export function formatMCPStatus(available: boolean, servers: MCPServer[]): string {
    if (!available) {
        return '🔌 MCP: tidak tersedia (claude mcp not configured)';
    }

    if (servers.length === 0) {
        return '🔌 MCP: tersedia, 0 servers configured';
    }

    const lines = [`🔌 MCP: ${servers.length} server(s) configured`];
    for (const server of servers) {
        const icon = server.status === 'connected' ? '✅' : '⬜';
        lines.push(`  ${icon} ${server.name}`);
    }

    return lines.join('\n');
}
