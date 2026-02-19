/**
 * FajarClaw RAG — Prompt Assembly Engine
 * @ref FC-PRD-01 §10.9 (Prompt Assembly)
 *
 * Dynamically assembles prompts by combining:
 * - Retrieved context (ranked, source-attributed)
 * - Code awareness (existing file detection)
 * - Sprint context (phase, story, status)
 * - User query with system instructions
 *
 * Phase A3: Core prompt assembly for Claude Code / Antigravity dispatch.
 */

import type { RetrievalResponse, RetrievalResult } from './retriever.js';

// === Types ===

export interface SprintContext {
    /** Current phase (e.g., "A3") */
    phase: string;
    /** Current task/story */
    story?: string;
    /** Sprint status */
    status?: string;
    /** Tags/labels */
    tags?: string[];
}

export interface CodeAwareness {
    /** Files that already exist in the workspace */
    existingFiles?: string[];
    /** Recently modified files */
    recentlyModified?: string[];
    /** Current working directory */
    cwd?: string;
}

export interface PromptOptions {
    /** Maximum token budget for context (approximate, in chars) */
    maxContextChars?: number;
    /** Maximum number of RAG results to include */
    maxResults?: number;
    /** Include source attribution (default: true) */
    includeAttribution?: boolean;
    /** Include code awareness warnings (default: true) */
    includeCodeAwareness?: boolean;
    /** Include sprint context (default: true) */
    includeSprintContext?: boolean;
    /** Custom system instructions to prepend */
    systemInstructions?: string;
    /** Engine target: affects formatting */
    engine?: 'claude-code' | 'antigravity';
}

export interface AssembledPrompt {
    /** Final assembled prompt */
    prompt: string;
    /** Sections included */
    sections: string[];
    /** Total character count */
    charCount: number;
    /** Number of RAG results included */
    ragResultsIncluded: number;
    /** Whether context was truncated due to budget */
    truncated: boolean;
}

// === Config ===

const DEFAULT_MAX_CONTEXT_CHARS = 12_000;
const DEFAULT_MAX_RESULTS = 5;

// === Core Assembly ===

/**
 * Build a fully assembled prompt from query + context.
 *
 * Sections (in order):
 * 1. System instructions (if provided)
 * 2. Sprint context (phase, story)
 * 3. Retrieved context (ranked, attributed)
 * 4. Code awareness warnings
 * 5. User query
 */
export function buildPrompt(
    query: string,
    retrieval: RetrievalResponse | null,
    options?: PromptOptions & {
        sprint?: SprintContext;
        codeAwareness?: CodeAwareness;
    }
): AssembledPrompt {
    const maxChars = options?.maxContextChars ?? DEFAULT_MAX_CONTEXT_CHARS;
    const maxResults = options?.maxResults ?? DEFAULT_MAX_RESULTS;
    const includeAttribution = options?.includeAttribution ?? true;
    const includeCodeAwareness = options?.includeCodeAwareness ?? true;
    const includeSprintContext = options?.includeSprintContext ?? true;

    const sections: string[] = [];
    let charBudget = maxChars;
    let truncated = false;
    let ragResultsIncluded = 0;

    // === Section 1: System Instructions ===
    if (options?.systemInstructions) {
        const sysBlock = formatSystemInstructions(options.systemInstructions, options.engine);
        charBudget -= sysBlock.length;
        sections.push(sysBlock);
    }

    // === Section 2: Sprint Context ===
    if (includeSprintContext && options?.sprint) {
        const sprintBlock = formatSprintContext(options.sprint);
        if (sprintBlock.length <= charBudget) {
            charBudget -= sprintBlock.length;
            sections.push(sprintBlock);
        }
    }

    // === Section 3: Retrieved Context ===
    if (retrieval && retrieval.results.length > 0) {
        const results = retrieval.results.slice(0, maxResults);
        const contextBlock = formatRetrievedContext(
            results,
            retrieval,
            charBudget,
            includeAttribution
        );
        ragResultsIncluded = contextBlock.count;
        truncated = contextBlock.truncated;
        charBudget -= contextBlock.text.length;
        if (contextBlock.text.length > 0) {
            sections.push(contextBlock.text);
        }
    }

    // === Section 4: Code Awareness ===
    if (includeCodeAwareness && options?.codeAwareness) {
        const codeBlock = formatCodeAwareness(options.codeAwareness, retrieval?.results ?? []);
        if (codeBlock && codeBlock.length <= charBudget) {
            charBudget -= codeBlock.length;
            sections.push(codeBlock);
        }
    }

    // === Section 5: User Query ===
    sections.push(formatUserQuery(query));

    const prompt = sections.join('\n\n');

    return {
        prompt,
        sections: sections.map(s => s.split('\n')[0]?.replace(/[<\[#]/g, '').trim().slice(0, 40) ?? ''),
        charCount: prompt.length,
        ragResultsIncluded,
        truncated,
    };
}

// === Section Formatters ===

/**
 * Format system instructions block
 */
function formatSystemInstructions(instructions: string, engine?: string): string {
    const engineLabel = engine ? ` (target: ${engine})` : '';
    return `<system_instructions${engineLabel}>\n${instructions}\n</system_instructions>`;
}

/**
 * Format sprint context block
 */
export function formatSprintContext(sprint: SprintContext): string {
    const lines = ['<sprint_context>'];
    lines.push(`  Phase: ${sprint.phase}`);
    if (sprint.story) lines.push(`  Story: ${sprint.story}`);
    if (sprint.status) lines.push(`  Status: ${sprint.status}`);
    if (sprint.tags && sprint.tags.length > 0) {
        lines.push(`  Tags: ${sprint.tags.join(', ')}`);
    }
    lines.push('</sprint_context>');
    return lines.join('\n');
}

/**
 * Format retrieved context with source attribution and token budget
 */
function formatRetrievedContext(
    results: RetrievalResult[],
    response: RetrievalResponse,
    charBudget: number,
    includeAttribution: boolean
): { text: string; count: number; truncated: boolean } {
    const lines: string[] = [];
    const mode = response.mode ?? 'dense';
    lines.push(`<retrieved_context mode="${mode}" total="${results.length}">`);

    let count = 0;
    let truncated = false;
    let currentSize = lines[0]!.length + '</retrieved_context>'.length + 2;

    for (const result of results) {
        const resultBlock = formatSingleResult(result, includeAttribution);
        if (currentSize + resultBlock.length > charBudget) {
            truncated = true;
            break;
        }
        lines.push(resultBlock);
        currentSize += resultBlock.length;
        count++;
    }

    if (count === 0) {
        return { text: '', count: 0, truncated: false };
    }

    if (truncated) {
        lines.push(`  <!-- ${results.length - count} more results truncated due to token budget -->`);
    }

    lines.push('</retrieved_context>');
    return { text: lines.join('\n'), count, truncated };
}

/**
 * Format a single retrieval result
 */
function formatSingleResult(result: RetrievalResult, includeAttribution: boolean): string {
    const lines: string[] = [];
    const scorePercent = (result.score * 100).toFixed(0);

    if (includeAttribution) {
        const source = result.source;
        const section = result.section ? ` section="${result.section}"` : '';
        lines.push(`  <result source="${source}" score="${scorePercent}%"${section} collection="${result.collection}">`);
    } else {
        lines.push('  <result>');
    }

    lines.push(`    ${result.text}`);
    lines.push('  </result>');
    return lines.join('\n');
}

/**
 * Format code awareness warnings
 */
function formatCodeAwareness(
    awareness: CodeAwareness,
    retrievedResults: RetrievalResult[]
): string | null {
    const warnings: string[] = [];

    // Detect files mentioned in retrieved context that already exist
    if (awareness.existingFiles && awareness.existingFiles.length > 0) {
        const retrievedSources = new Set(retrievedResults.map(r => r.source));
        const overlapping = awareness.existingFiles.filter(f =>
            retrievedSources.has(f) || retrievedResults.some(r => r.source.includes(f))
        );

        if (overlapping.length > 0) {
            warnings.push(`⚠️ These files already exist and may be affected:`);
            for (const f of overlapping.slice(0, 5)) {
                warnings.push(`  - ${f}`);
            }
        }
    }

    // Recently modified files
    if (awareness.recentlyModified && awareness.recentlyModified.length > 0) {
        warnings.push(`📝 Recently modified files:`);
        for (const f of awareness.recentlyModified.slice(0, 5)) {
            warnings.push(`  - ${f}`);
        }
    }

    // CWD
    if (awareness.cwd) {
        warnings.push(`📂 Working directory: ${awareness.cwd}`);
    }

    if (warnings.length === 0) return null;

    return ['<code_awareness>', ...warnings, '</code_awareness>'].join('\n');
}

/**
 * Format user query block
 */
function formatUserQuery(query: string): string {
    return `<user_query>\n${query}\n</user_query>`;
}

// === Utility ===

/**
 * Estimate token count from character count (rough: 1 token ≈ 4 chars)
 */
export function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

/**
 * Format assembled prompt metadata for display
 */
export function formatPromptStats(assembled: AssembledPrompt): string {
    const tokens = estimateTokens(assembled.prompt);
    const lines = [
        `📋 Prompt Assembly:`,
        `  📝 Characters: ${assembled.charCount.toLocaleString()}`,
        `  🎫 Est. Tokens: ~${tokens.toLocaleString()}`,
        `  📚 RAG Results: ${assembled.ragResultsIncluded}`,
        `  📦 Sections: ${assembled.sections.join(' → ')}`,
    ];
    if (assembled.truncated) {
        lines.push(`  ⚠️ Context truncated (exceeded token budget)`);
    }
    return lines.join('\n');
}
