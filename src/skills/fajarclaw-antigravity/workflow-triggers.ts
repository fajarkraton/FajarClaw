/**
 * FajarClaw Workflow Triggers — WF-01 Command Proxy
 * @ref FC-PRD-01 §8.2C (Workflow Triggers)
 *
 * Definisi dan dispatch WF-01 workflow commands:
 * /generate-component, /generate-crud, /generate-tests, dll.
 */

import type { AntigravityTaskOptions } from './antigravity.js';

// === Types ===

/** Workflow yang tersedia */
export type WorkflowId =
    | 'generate-component'
    | 'generate-function'
    | 'generate-crud'
    | 'generate-gworkspace'
    | 'generate-tests'
    | 'review-security'
    | 'deploy-check';

/** Definisi satu workflow */
export interface WorkflowDefinition {
    id: WorkflowId;
    command: string;
    description: string;
    engine: 'antigravity' | 'claude-code' | 'dual';
    /** Template prompt yang digunakan */
    promptTemplate: string;
    /** Parameter yang dibutuhkan */
    parameters: WorkflowParameter[];
}

/** Parameter workflow */
export interface WorkflowParameter {
    name: string;
    description: string;
    required: boolean;
    type: 'string' | 'boolean' | 'number';
    default?: string | boolean | number;
}

/** Parsed workflow trigger dari user message */
export interface ParsedWorkflow {
    workflowId: WorkflowId | null;
    args: Record<string, string>;
    rawArgs: string;
    isValid: boolean;
    error?: string;
}

// === Workflow Registry ===

/**
 * Registry semua workflow yang tersedia
 * @ref FC-PRD-01 §8.2C (WF-01 Workflows)
 */
export const WORKFLOW_REGISTRY: WorkflowDefinition[] = [
    {
        id: 'generate-component',
        command: '/generate-component',
        description: 'Generate React component + test file',
        engine: 'antigravity',
        promptTemplate: 'Buatkan React component "{name}" dengan spesifikasi berikut: {specs}. Sertakan unit test dengan vitest.',
        parameters: [
            { name: 'name', description: 'Nama component', required: true, type: 'string' },
            { name: 'specs', description: 'Spesifikasi component', required: false, type: 'string', default: 'modern, responsive, accessible' },
        ],
    },
    {
        id: 'generate-function',
        command: '/generate-function',
        description: 'Generate Cloud Function + middleware',
        engine: 'claude-code',
        promptTemplate: 'Buatkan Cloud Function "{name}" yang {description}. Tambahkan middleware untuk validation dan error handling.',
        parameters: [
            { name: 'name', description: 'Nama function', required: true, type: 'string' },
            { name: 'description', description: 'Deskripsi fungsi', required: true, type: 'string' },
        ],
    },
    {
        id: 'generate-crud',
        command: '/generate-crud',
        description: 'Generate CRUD operations (API + UI)',
        engine: 'dual',
        promptTemplate: 'Buatkan full CRUD operations untuk entity "{entity}": REST API endpoints (CC) + React admin UI (AG). Fields: {fields}.',
        parameters: [
            { name: 'entity', description: 'Nama entity', required: true, type: 'string' },
            { name: 'fields', description: 'Daftar fields', required: true, type: 'string' },
        ],
    },
    {
        id: 'generate-gworkspace',
        command: '/generate-gworkspace',
        description: 'Generate Google Workspace API integration',
        engine: 'claude-code',
        promptTemplate: 'Buatkan integrasi Google Workspace API untuk {service}: {description}.',
        parameters: [
            { name: 'service', description: 'Google service (Sheets, Drive, Calendar, etc.)', required: true, type: 'string' },
            { name: 'description', description: 'Deskripsi integrasi', required: true, type: 'string' },
        ],
    },
    {
        id: 'generate-tests',
        command: '/generate-tests',
        description: 'Generate unit + integration tests',
        engine: 'claude-code',
        promptTemplate: 'Buatkan comprehensive tests untuk {target}: unit tests + integration tests. Framework: vitest. Coverage target: {coverage}%.',
        parameters: [
            { name: 'target', description: 'File/module yang di-test', required: true, type: 'string' },
            { name: 'coverage', description: 'Target coverage', required: false, type: 'number', default: 80 },
        ],
    },
    {
        id: 'review-security',
        command: '/review-security',
        description: 'Security audit report',
        engine: 'dual',
        promptTemplate: 'Lakukan security audit pada {target}. Check: {checks}. Generate report dengan severity levels.',
        parameters: [
            { name: 'target', description: 'Target audit', required: true, type: 'string' },
            { name: 'checks', description: 'Jenis pengecekan', required: false, type: 'string', default: 'XSS, SQL Injection, Auth bypass, CSRF, sensitive data exposure' },
        ],
    },
    {
        id: 'deploy-check',
        command: '/deploy-check',
        description: 'Pre-deployment checklist',
        engine: 'dual',
        promptTemplate: 'Jalankan pre-deployment checklist untuk {environment}: build check, test pass, lint clean, security scan, performance baseline.',
        parameters: [
            { name: 'environment', description: 'Target environment', required: true, type: 'string' },
        ],
    },
];

// === Workflow Parsing ===

/**
 * Parse user message untuk extract workflow trigger
 */
export function parseWorkflowTrigger(message: string): ParsedWorkflow {
    const trimmed = message.trim();

    // Cari workflow yang matching
    for (const wf of WORKFLOW_REGISTRY) {
        if (trimmed.toLowerCase().startsWith(wf.command)) {
            const rawArgs = trimmed.slice(wf.command.length).trim();
            const args = parseWorkflowArgs(rawArgs);

            // Validate required parameters
            const missingRequired = wf.parameters
                .filter(p => p.required && !args[p.name])
                .map(p => p.name);

            if (missingRequired.length > 0) {
                return {
                    workflowId: wf.id,
                    args,
                    rawArgs,
                    isValid: false,
                    error: `Missing required parameters: ${missingRequired.join(', ')}`,
                };
            }

            return {
                workflowId: wf.id,
                args,
                rawArgs,
                isValid: true,
            };
        }
    }

    // Tidak ada workflow yang match
    return {
        workflowId: null,
        args: {},
        rawArgs: '',
        isValid: false,
    };
}

/**
 * Parse workflow args dari raw string
 * Supports: key=value pairs atau positional args
 */
function parseWorkflowArgs(raw: string): Record<string, string> {
    const args: Record<string, string> = {};
    if (!raw) return args;

    // Coba parse key=value pairs
    const kvPattern = /(\w+)=(?:"([^"]+)"|'([^']+)'|(\S+))/g;
    let match;
    let hasKV = false;

    while ((match = kvPattern.exec(raw)) !== null) {
        const key = match[1]!;
        const value = match[2] ?? match[3] ?? match[4] ?? '';
        args[key] = value;
        hasKV = true;
    }

    // Jika tidak ada key=value, treat seluruh string sebagai first positional arg
    if (!hasKV) {
        args['_positional'] = raw;
        // Juga set sebagai 'name' (most common first param)
        args['name'] = raw.split(' ')[0] ?? raw;
    }

    return args;
}

/**
 * Build prompt dari workflow template dan args
 */
export function buildWorkflowPrompt(
    workflowId: WorkflowId,
    args: Record<string, string>
): string {
    const wf = WORKFLOW_REGISTRY.find(w => w.id === workflowId);
    if (!wf) return '';

    let prompt = wf.promptTemplate;

    // Replace placeholders dengan args
    for (const param of wf.parameters) {
        const value = args[param.name] ?? (param.default?.toString() ?? '');
        prompt = prompt.replace(`{${param.name}}`, value);
    }

    return prompt;
}

/**
 * Build AntigravityTaskOptions dari parsed workflow
 */
export function buildTaskOptions(
    parsed: ParsedWorkflow,
    cwd?: string
): AntigravityTaskOptions | null {
    if (!parsed.isValid || !parsed.workflowId) return null;

    const prompt = buildWorkflowPrompt(parsed.workflowId, parsed.args);

    return {
        task: prompt,
        cwd,
        workflow: parsed.workflowId,
    };
}

/**
 * Dapatkan workflow definition berdasarkan ID
 */
export function getWorkflow(id: WorkflowId): WorkflowDefinition | undefined {
    return WORKFLOW_REGISTRY.find(w => w.id === id);
}

/**
 * List semua workflow yang tersedia, formatted untuk display
 */
export function listWorkflows(): string {
    const lines = ['📋 Available Workflows:', ''];

    for (const wf of WORKFLOW_REGISTRY) {
        const engineIcon = wf.engine === 'claude-code' ? '🔧' :
            wf.engine === 'antigravity' ? '🎨' : '⚡';
        const params = wf.parameters
            .map(p => `${p.name}${p.required ? '*' : ''}`)
            .join(', ');

        lines.push(`  ${engineIcon} \`${wf.command}\` — ${wf.description}`);
        lines.push(`     Params: ${params}`);
    }

    return lines.join('\n');
}
