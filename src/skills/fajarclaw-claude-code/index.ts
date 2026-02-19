/**
 * FajarClaw Claude Code — Barrel Export
 * Skill 2: Claude Code SDK/CLI wrapper + Git automation + MCP
 */

export {
    execute,
    executeViaCLI,
    executeViaSDK,
    detectMode,
    isSDKAvailable,
    isCLIAvailable,
    resetDetectionCache,
    type ClaudeCodeOptions,
    type ClaudeCodeResult,
    type ExecutionMode,
} from './claude-code.js';

export {
    commit,
    createBranch,
    switchBranch,
    getCurrentBranch,
    listBranches,
    getStatus,
    getDiff,
    getLog,
    formatCommitMessage,
    type CommitOptions,
    type CommitType,
    type GitResult,
    type BranchInfo,
    type FileStatus,
} from './git-flow.js';

export {
    isMCPAvailable,
    listServers,
    getServerInfo,
    parseServerList,
    formatMCPStatus,
    type MCPServer,
    type MCPResult,
} from './mcp-manager.js';
