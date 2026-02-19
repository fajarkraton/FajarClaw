/**
 * FajarClaw Agent Manager — Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
    spawnParallel,
    spawnSequential,
    spawnWithDependencies,
    formatSpawnResult,
    type AgentTask,
    type SpawnConfig,
} from './agent-manager.js';

// Mock executor: return task description setelah delay singkat
const mockExecutor = async (task: AgentTask): Promise<string> => {
    await new Promise(r => setTimeout(r, 10));
    return `Done: ${task.description}`;
};

const failingExecutor = async (task: AgentTask): Promise<string> => {
    if (task.id === 'fail-task') throw new Error('Task failed intentionally');
    return `Done: ${task.description}`;
};

const baseConfig: SpawnConfig = {
    mode: 'parallel',
    executor: mockExecutor,
    taskTimeout: 5000,
};

describe('spawnParallel', () => {
    it('harus execute semua tasks secara parallel', async () => {
        const tasks: AgentTask[] = [
            { id: 'task-1', description: 'Build API' },
            { id: 'task-2', description: 'Build UI' },
            { id: 'task-3', description: 'Write tests' },
        ];

        const result = await spawnParallel(tasks, baseConfig);

        expect(result.mode).toBe('parallel');
        expect(result.successCount).toBe(3);
        expect(result.failCount).toBe(0);
        expect(result.results).toHaveLength(3);
        expect(result.results[0]!.output).toContain('Build API');
    });

    it('harus handle partial failure', async () => {
        const tasks: AgentTask[] = [
            { id: 'ok-task', description: 'Success task' },
            { id: 'fail-task', description: 'Will fail' },
        ];

        const result = await spawnParallel(tasks, {
            ...baseConfig,
            executor: failingExecutor,
        });

        expect(result.successCount).toBe(1);
        expect(result.failCount).toBe(1);
    });

    it('harus batch tasks sesuai maxConcurrency', async () => {
        const tasks: AgentTask[] = [
            { id: 't1', description: 'Task 1' },
            { id: 't2', description: 'Task 2' },
            { id: 't3', description: 'Task 3' },
            { id: 't4', description: 'Task 4' },
        ];

        const result = await spawnParallel(tasks, {
            ...baseConfig,
            maxConcurrency: 2,
        });

        expect(result.successCount).toBe(4);
    });
});

describe('spawnSequential', () => {
    it('harus execute tasks secara berurutan', async () => {
        const order: string[] = [];
        const trackingExecutor = async (task: AgentTask): Promise<string> => {
            order.push(task.id);
            await new Promise(r => setTimeout(r, 5));
            return `Done: ${task.id}`;
        };

        const tasks: AgentTask[] = [
            { id: 'first', description: 'First task' },
            { id: 'second', description: 'Second task' },
            { id: 'third', description: 'Third task' },
        ];

        const result = await spawnSequential(tasks, {
            ...baseConfig,
            executor: trackingExecutor,
        });

        expect(result.mode).toBe('sequential');
        expect(result.successCount).toBe(3);
        expect(order).toEqual(['first', 'second', 'third']);
    });

    it('harus lanjut meskipun ada failure', async () => {
        const tasks: AgentTask[] = [
            { id: 'ok-task', description: 'OK' },
            { id: 'fail-task', description: 'Fail' },
            { id: 'ok-task-2', description: 'OK 2' },
        ];

        const result = await spawnSequential(tasks, {
            ...baseConfig,
            executor: failingExecutor,
        });

        expect(result.successCount).toBe(2);
        expect(result.failCount).toBe(1);
        expect(result.results).toHaveLength(3);
    });
});

describe('spawnWithDependencies', () => {
    it('harus resolve dependencies dan execute in order', async () => {
        const order: string[] = [];
        const trackingExecutor = async (task: AgentTask): Promise<string> => {
            order.push(task.id);
            return `Done: ${task.id}`;
        };

        const tasks: AgentTask[] = [
            { id: 'build', description: 'Build', dependsOn: ['setup'] },
            { id: 'setup', description: 'Setup' },
            { id: 'test', description: 'Test', dependsOn: ['build'] },
        ];

        const result = await spawnWithDependencies(tasks, {
            ...baseConfig,
            executor: trackingExecutor,
        });

        expect(result.successCount).toBe(3);
        // Setup harus selesai sebelum build, build sebelum test
        const setupIdx = order.indexOf('setup');
        const buildIdx = order.indexOf('build');
        const testIdx = order.indexOf('test');
        expect(setupIdx).toBeLessThan(buildIdx);
        expect(buildIdx).toBeLessThan(testIdx);
    });

    it('harus handle tasks tanpa dependencies', async () => {
        const tasks: AgentTask[] = [
            { id: 'a', description: 'A' },
            { id: 'b', description: 'B' },
        ];

        const result = await spawnWithDependencies(tasks, baseConfig);
        expect(result.successCount).toBe(2);
    });
});

describe('formatSpawnResult', () => {
    it('harus format all-success result', async () => {
        const tasks: AgentTask[] = [
            { id: 'task-1', description: 'Task 1' },
        ];
        const result = await spawnParallel(tasks, baseConfig);
        const formatted = formatSpawnResult(result);

        expect(formatted).toContain('✅');
        expect(formatted).toContain('1/1');
    });

    it('harus format partial-failure result', async () => {
        const tasks: AgentTask[] = [
            { id: 'ok-task', description: 'OK' },
            { id: 'fail-task', description: 'Fail' },
        ];
        const result = await spawnParallel(tasks, {
            ...baseConfig,
            executor: failingExecutor,
        });
        const formatted = formatSpawnResult(result);

        expect(formatted).toContain('⚠️');
        expect(formatted).toContain('1/2');
    });
});
