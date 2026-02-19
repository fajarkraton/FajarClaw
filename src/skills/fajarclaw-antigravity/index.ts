/**
 * FajarClaw Antigravity — Barrel Export
 * Skill 3: IDE connector + multi-agent + workflow triggers
 */

export {
    detectConnection,
    getConnection,
    resetConnectionCache,
    executeTask,
    formatStatus,
    type AntigravityConnection,
    type AntigravityTaskOptions,
    type AntigravityResult,
    type ConnectionStatus,
    type ConnectionMode,
} from './antigravity.js';

export {
    spawnParallel,
    spawnSequential,
    spawnWithDependencies,
    formatSpawnResult,
    type AgentTask,
    type AgentStatus,
    type AgentResult,
    type SpawnConfig,
    type SpawnResult,
} from './agent-manager.js';

export {
    parseWorkflowTrigger,
    buildWorkflowPrompt,
    buildTaskOptions,
    getWorkflow,
    listWorkflows,
    WORKFLOW_REGISTRY,
    type WorkflowId,
    type WorkflowDefinition,
    type ParsedWorkflow,
} from './workflow-triggers.js';
