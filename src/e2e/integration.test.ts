/**
 * FajarClaw v4.0 — E2E Integration Tests
 * @ref FC-BP-01 §4.3 Day 5 (5 test scenarios)
 *
 * Tests the full pipeline: message → route → (mock) execute → merge → response
 */

import { describe, it, expect } from 'vitest';
import {
    routeTask,
    scoreKeywords,
    parseCommand,
    formatRoutingDecision,
} from '../skills/fajarclaw-router/index.js';
import {
    mergeResults,
    createSuccessResult,
    createErrorResult,
} from '../skills/fajarclaw-router/merger.js';
import { selectPattern } from '../skills/fajarclaw-router/patterns.js';
import {
    formatCommitMessage,
    getCurrentBranch,
    getStatus,
    type CommitOptions,
} from '../skills/fajarclaw-claude-code/index.js';
import {
    parseWorkflowTrigger,
    buildWorkflowPrompt,
    listWorkflows,
    WORKFLOW_REGISTRY,
} from '../skills/fajarclaw-antigravity/index.js';
import {
    spawnParallel,
    type AgentTask,
    type SpawnConfig,
} from '../skills/fajarclaw-antigravity/agent-manager.js';

const PROJECT_CWD = '/home/primecore/Documents/FajarClaw';

// ═══════════════════════════════════════════════════════
// Scenario 1: Full routing pipeline — Backend Task
// ═══════════════════════════════════════════════════════

describe('E2E Scenario 1: Backend Task → Claude Code', () => {
    it('harus route "git commit dan push" ke Claude Code dengan confidence tinggi', () => {
        const routed = routeTask('git commit dan push ke main');

        expect(routed.engine).toBe('claude-code');
        expect(routed.confidence).toBeGreaterThan(0.5);
        expect(routed.matchedKeywords).toContain('git');
        expect(routed.matchedKeywords).toContain('commit');
        expect(routed.matchedKeywords).toContain('push');
    });

    it('harus route "buat REST API endpoint untuk users" ke Claude Code', () => {
        const routed = routeTask('/build buat REST API endpoint untuk users');

        expect(routed.engine).toBe('claude-code');
        expect(routed.matchedKeywords).toContain('api');
        expect(routed.matchedKeywords).toContain('endpoint');
    });

    it('harus merge single-engine success result', () => {
        const routed = routeTask('git commit');
        const results = [createSuccessResult('claude-code', 'Committed 3 files', 1200)];
        const merged = mergeResults(routed, results);

        expect(merged.success).toBe(true);
        expect(merged.mergedOutput).toContain('Committed 3 files');
        expect(merged.totalDuration).toBe(1200);
    });
});

// ═══════════════════════════════════════════════════════
// Scenario 2: Full routing pipeline — Frontend Task
// ═══════════════════════════════════════════════════════

describe('E2E Scenario 2: Frontend Task → Antigravity', () => {
    it('harus route "buat dashboard layout dengan sidebar" ke Antigravity', () => {
        const routed = routeTask('buat dashboard layout dengan sidebar responsive');

        expect(routed.engine).toBe('antigravity');
        expect(routed.matchedKeywords).toContain('dashboard');
        expect(routed.matchedKeywords).toContain('layout');
        expect(routed.matchedKeywords).toContain('sidebar');
    });

    it('harus route workflow trigger ke correct workflow', () => {
        const parsed = parseWorkflowTrigger('/generate-component name=LoginForm');
        expect(parsed.workflowId).toBe('generate-component');
        expect(parsed.isValid).toBe(true);

        const prompt = buildWorkflowPrompt('generate-component', parsed.args);
        expect(prompt).toContain('LoginForm');
    });

    it('harus merge single Antigravity result', () => {
        const routed = routeTask('buat UI komponen button');
        const results = [createSuccessResult('antigravity', '<Button>Click me</Button>', 800)];
        const merged = mergeResults(routed, results);

        expect(merged.success).toBe(true);
        expect(merged.mergedOutput).toContain('Antigravity');
    });
});

// ═══════════════════════════════════════════════════════
// Scenario 3: Dual-Engine Collaboration
// ═══════════════════════════════════════════════════════

describe('E2E Scenario 3: Dual-Engine → Full-Stack Feature', () => {
    it('harus route "buat full-stack CRUD feature" ke Dual mode', () => {
        const routed = routeTask('buat full-stack CRUD feature untuk manajemen user');

        expect(routed.engine).toBe('dual');
        expect(routed.matchedKeywords).toContain('full-stack');
        expect(routed.matchedKeywords).toContain('crud');
    });

    it('harus select parallel pattern untuk dual + "dan"', () => {
        const pattern = selectPattern('dual', 'buat backend dan frontend');
        expect(pattern).toBe('parallel');
    });

    it('harus merge dual parallel results', () => {
        const routed = routeTask('/build:dual buat backend dan frontend');
        const results = [
            createSuccessResult('claude-code', 'API ready at /api/users', 2000),
            createSuccessResult('antigravity', 'User list component ready', 1500),
        ];
        const merged = mergeResults(routed, results);

        expect(merged.success).toBe(true);
        expect(merged.mergedOutput).toContain('API ready');
        expect(merged.mergedOutput).toContain('User list component');
        expect(merged.totalDuration).toBe(3500);
    });

    it('harus handle partial failure di dual mode', () => {
        const routed = routeTask('/build:dual deploy dan verify');
        const results = [
            createSuccessResult('claude-code', 'Deployed to staging', 3000),
            createErrorResult('antigravity', 'Browser timeout', 5000),
        ];
        const merged = mergeResults(routed, results);

        expect(merged.success).toBe(true);
        expect(merged.mergedOutput).toContain('Deployed');
        expect(merged.mergedOutput).toContain('⚠️');
        expect(merged.mergedOutput).toContain('Browser timeout');
    });
});

// ═══════════════════════════════════════════════════════
// Scenario 4: Override Commands + Workflows
// ═══════════════════════════════════════════════════════

describe('E2E Scenario 4: Override Commands + Workflow Integration', () => {
    it('/build:cc harus bypass routing dan go straight ke CC', () => {
        const routed = routeTask('/build:cc buat form login dengan dashboard');
        // "form", "dashboard" would normally route to AG, but override wins
        expect(routed.engine).toBe('claude-code');
        expect(routed.confidence).toBe(1.0);
    });

    it('/build:ag harus bypass routing dan go straight ke AG', () => {
        const routed = routeTask('/build:ag git push ke production');
        // "git", "push" would normally route to CC, but override wins
        expect(routed.engine).toBe('antigravity');
        expect(routed.confidence).toBe(1.0);
    });

    it('/generate-crud harus trigger dual-engine workflow', () => {
        const parsed = parseWorkflowTrigger('/generate-crud entity=Product fields="name,price,stock"');
        expect(parsed.workflowId).toBe('generate-crud');
        expect(parsed.isValid).toBe(true);

        const wf = WORKFLOW_REGISTRY.find(w => w.id === 'generate-crud');
        expect(wf!.engine).toBe('dual');

        const prompt = buildWorkflowPrompt('generate-crud', parsed.args);
        expect(prompt).toContain('Product');
        expect(prompt).toContain('name,price,stock');
    });

    it('listWorkflows harus show semua 7 workflows', () => {
        const list = listWorkflows();
        expect(list).toContain('/generate-component');
        expect(list).toContain('/generate-function');
        expect(list).toContain('/generate-crud');
        expect(list).toContain('/generate-gworkspace');
        expect(list).toContain('/generate-tests');
        expect(list).toContain('/review-security');
        expect(list).toContain('/deploy-check');
    });
});

// ═══════════════════════════════════════════════════════
// Scenario 5: Cross-Skill Integration
// ═══════════════════════════════════════════════════════

describe('E2E Scenario 5: Cross-Skill Integration', () => {
    it('Git flow + routing harus work together', async () => {
        // Get current branch
        const branch = await getCurrentBranch(PROJECT_CWD);
        expect(branch).toBe('main');

        // Format commit message
        const commitMsg = formatCommitMessage({
            type: 'feat',
            scope: 'e2e',
            message: 'add E2E integration tests',
        });
        expect(commitMsg).toBe('feat(e2e): add E2E integration tests');

        // Route a commit-related task
        const routed = routeTask(commitMsg);
        expect(routed.engine).toBe('claude-code'); // "feat" not a keyword but commit context
    });

    it('Agent spawning + routing harus work together', async () => {
        const tasks: AgentTask[] = [
            { id: 'route', description: 'Route task' },
            { id: 'execute', description: 'Execute task' },
        ];

        const config: SpawnConfig = {
            mode: 'parallel',
            executor: async (task) => {
                if (task.id === 'route') {
                    const routed = routeTask('buat API endpoint');
                    return `Routed to: ${routed.engine}`;
                }
                return `Executed: ${task.description}`;
            },
            taskTimeout: 5000,
        };

        const result = await spawnParallel(tasks, config);
        expect(result.successCount).toBe(2);

        const routeResult = result.results.find(r => r.taskId === 'route');
        expect(routeResult!.output).toContain('claude-code');
    });

    it('formatRoutingDecision harus format all engine types', () => {
        const cc = formatRoutingDecision(routeTask('/build:cc deploy'));
        expect(cc).toContain('Claude Code');

        const ag = formatRoutingDecision(routeTask('/build:ag buat form'));
        expect(ag).toContain('Antigravity');

        const dual = formatRoutingDecision(routeTask('/build:dual full'));
        expect(dual).toContain('Dual');
    });

    it('getStatus harus return valid file status', async () => {
        const status = await getStatus(PROJECT_CWD);
        expect(status).toHaveProperty('staged');
        expect(status).toHaveProperty('modified');
        expect(status).toHaveProperty('untracked');
    });
});
