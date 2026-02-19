/**
 * FajarClaw Workflow Triggers — Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
    parseWorkflowTrigger,
    buildWorkflowPrompt,
    getWorkflow,
    listWorkflows,
    WORKFLOW_REGISTRY,
} from './workflow-triggers.js';

describe('WORKFLOW_REGISTRY', () => {
    it('harus punya 7 workflows', () => {
        expect(WORKFLOW_REGISTRY).toHaveLength(7);
    });

    it('setiap workflow harus punya required fields', () => {
        for (const wf of WORKFLOW_REGISTRY) {
            expect(wf.id).toBeTruthy();
            expect(wf.command).toMatch(/^\//);
            expect(wf.description).toBeTruthy();
            expect(wf.engine).toBeTruthy();
            expect(wf.promptTemplate).toBeTruthy();
            expect(Array.isArray(wf.parameters)).toBe(true);
        }
    });
});

describe('parseWorkflowTrigger', () => {
    it('harus parse /generate-component', () => {
        const result = parseWorkflowTrigger('/generate-component name=LoginForm');
        expect(result.workflowId).toBe('generate-component');
        expect(result.args['name']).toBe('LoginForm');
        expect(result.isValid).toBe(true);
    });

    it('harus parse /generate-component with positional arg', () => {
        const result = parseWorkflowTrigger('/generate-component LoginForm');
        expect(result.workflowId).toBe('generate-component');
        expect(result.args['name']).toBe('LoginForm');
        expect(result.isValid).toBe(true);
    });

    it('harus parse /generate-crud dengan multiple args', () => {
        const result = parseWorkflowTrigger('/generate-crud entity=User fields="name,email,role"');
        expect(result.workflowId).toBe('generate-crud');
        expect(result.args['entity']).toBe('User');
        expect(result.args['fields']).toBe('name,email,role');
        expect(result.isValid).toBe(true);
    });

    it('harus reject missing required parameter', () => {
        const result = parseWorkflowTrigger('/generate-function');
        expect(result.workflowId).toBe('generate-function');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Missing required');
    });

    it('harus return null workflowId untuk non-workflow message', () => {
        const result = parseWorkflowTrigger('buat login form');
        expect(result.workflowId).toBeNull();
        expect(result.isValid).toBe(false);
    });

    it('harus parse /review-security', () => {
        const result = parseWorkflowTrigger('/review-security target=auth-module');
        expect(result.workflowId).toBe('review-security');
        expect(result.isValid).toBe(true);
    });

    it('harus parse /deploy-check', () => {
        const result = parseWorkflowTrigger('/deploy-check environment=production');
        expect(result.workflowId).toBe('deploy-check');
        expect(result.isValid).toBe(true);
    });
});

describe('buildWorkflowPrompt', () => {
    it('harus build prompt dari template', () => {
        const prompt = buildWorkflowPrompt('generate-component', {
            name: 'LoginForm',
            specs: 'with email + password fields',
        });
        expect(prompt).toContain('LoginForm');
        expect(prompt).toContain('email + password fields');
    });

    it('harus gunakan default value jika arg tidak ada', () => {
        const prompt = buildWorkflowPrompt('generate-tests', {
            target: 'router.ts',
        });
        expect(prompt).toContain('router.ts');
        expect(prompt).toContain('80'); // default coverage
    });

    it('harus return empty string untuk invalid workflow', () => {
        const prompt = buildWorkflowPrompt('nonexistent' as any, {});
        expect(prompt).toBe('');
    });
});

describe('getWorkflow', () => {
    it('harus return workflow by ID', () => {
        const wf = getWorkflow('generate-component');
        expect(wf).toBeDefined();
        expect(wf!.engine).toBe('antigravity');
    });

    it('harus return undefined untuk ID yang tidak ada', () => {
        const wf = getWorkflow('nonexistent' as any);
        expect(wf).toBeUndefined();
    });
});

describe('listWorkflows', () => {
    it('harus return formatted list', () => {
        const list = listWorkflows();
        expect(list).toContain('Available Workflows');
        expect(list).toContain('/generate-component');
        expect(list).toContain('/generate-crud');
        expect(list).toContain('/review-security');
        expect(list).toContain('🔧'); // claude-code
        expect(list).toContain('🎨'); // antigravity
        expect(list).toContain('⚡'); // dual
    });
});
