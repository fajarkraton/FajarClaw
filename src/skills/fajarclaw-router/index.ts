/**
 * FajarClaw Router — Barrel Export
 * Skill 1: Task classification, routing, dan result merging
 */

export { parseCommand, scoreKeywords, routeTask, formatRoutingDecision } from './router.js';
export { selectPattern, describePattern } from './patterns.js';
export {
    mergeResults,
    createPendingResult,
    createSuccessResult,
    createErrorResult,
    formatMergedSummary,
} from './merger.js';
