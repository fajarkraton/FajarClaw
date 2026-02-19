/**
 * FajarClaw v4.0 — Tipe Data Utama
 * @ref FC-PRD-01 §6.3 (RoutedTask interface)
 */

// === Engine Types ===

/** AI engine yang tersedia untuk eksekusi task */
export type Engine = 'claude-code' | 'antigravity' | 'dual';

/** Pola kolaborasi antara dua engine */
export type CollabPattern = 'pipeline' | 'parallel' | 'verify';

/** Level confidence routing decision */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

// === Router Types ===

/** Hasil scoring keyword dari router */
export interface KeywordScore {
    engine: Engine;
    confidence: number;
    matchedKeywords: string[];
    confidenceLevel: ConfidenceLevel;
}

/** Context yang di-inject dari RAG (Phase A2+) */
export interface RetrievedContext {
    documents: RetrievedChunk[];
    existingCode: RetrievedChunk[];
    decisions: RetrievedChunk[];
    screenshots?: RetrievedChunk[];
}

/** Single chunk dari retrieval */
export interface RetrievedChunk {
    text: string;
    score: number;
    metadata: Record<string, unknown>;
    source: string;
}

/** Task yang sudah di-route ke engine yang tepat */
export interface RoutedTask {
    originalMessage: string;
    engine: Engine;
    confidence: number;
    confidenceLevel: ConfidenceLevel;
    matchedKeywords: string[];
    pattern: CollabPattern;
    context?: RetrievedContext;
    timestamp: Date;
}

// === Command Types ===

/** Override command dari user */
export type OverrideCommand = '/build:cc' | '/build:ag' | '/build:dual' | '/build';

/** Parsed command dari user message */
export interface ParsedCommand {
    command: OverrideCommand | null;
    task: string;
    isOverride: boolean;
}

// === Execution Types ===

/** Status eksekusi dari engine */
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed';

/** Hasil eksekusi dari satu engine */
export interface EngineResult {
    engine: Engine;
    status: ExecutionStatus;
    output: string;
    error?: string;
    duration: number;
    timestamp: Date;
}

/** Hasil gabungan dari satu atau kedua engine */
export interface MergedResult {
    routedTask: RoutedTask;
    results: EngineResult[];
    mergedOutput: string;
    totalDuration: number;
    success: boolean;
}

// === System Types ===

/** Status kesehatan sistem */
export interface SystemHealth {
    gateway: boolean;
    claudeCode: boolean;
    antigravity: boolean;
    rag: boolean;
    uptime: number;
}
