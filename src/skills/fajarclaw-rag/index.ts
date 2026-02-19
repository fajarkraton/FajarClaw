/**
 * FajarClaw RAG — Barrel Export
 * @ref FC-PRD-01 §10 (RAG Pipeline)
 *
 * Re-exports all public APIs from the fajarclaw-rag skill.
 * Phase A3: reranker, hybrid retrieval, prompt builder, evaluator.
 * Phase A4: query transform, cache, sprint memory, guardrails.
 */

// Collection schemas
export {
    ALL_COLLECTIONS,
    DOCUMENTS_COLLECTION,
    CODEBASE_COLLECTION,
    DENSE_DIM,
} from './collection-schemas.js';

// Milvus client
export {
    connect,
    disconnect,
    getClient,
    createAllCollections,
    dropAllCollections,
    listCollections,
    insert,
    search,
    sparseSearch,
    getCollectionCount,
    formatCollectionStatus,
} from './milvus-client.js';

// Embedder
export {
    embed,
    embedSingle,
    embedBatch,
    isServerReady,
    getHealth,
    setServerUrl,
    getServerUrl,
    formatEmbedStatus,
} from './embedder.js';

// Chunker
export {
    chunkMarkdown,
    chunkCode,
    chunkFile,
    detectFileType,
} from './chunker.js';

// Indexer
export {
    indexFile,
    indexDirectory,
    watchAndIndex,
    formatIndexResults,
} from './indexer.js';

// Retriever (Phase A2 + A3)
export {
    retrieve,
    retrieveFrom,
    hybridRetrieve,
    rrfFusion,
    compareRetrieval,
    buildContext,
    buildContextSummary,
    formatRetrievalResults,
} from './retriever.js';

// Reranker (Phase A3)
export {
    rerank,
    rerankTexts,
    isRerankerReady,
    getRerankerHealth,
    formatRerankerStatus,
} from './reranker.js';

// Prompt Builder (Phase A3)
export {
    buildPrompt,
    formatSprintContext,
    estimateTokens,
    formatPromptStats,
} from './prompt-builder.js';

// Evaluator (Phase A3)
export {
    runEval,
    runEvalComparison,
    computeRecall,
    computeMRR,
    computeNDCG,
    formatEvalSummary,
    formatEvalComparison,
    EVAL_DATASET,
} from './evaluator.js';

// RAG Router (Phase A2 + A3)
export {
    routeWithRAG,
    isRAGCommand,
} from './rag-router.js';

// Types
export type {
    EmbedOptions,
    EmbedResult,
    EmbedResponse,
    EmbedServerHealth,
} from './embedder.js';

export type {
    Chunk,
    ChunkOptions,
} from './chunker.js';

export type {
    IndexResult,
    IndexOptions,
} from './indexer.js';

export type {
    RetrieveOptions,
    HybridRetrieveOptions,
    RetrievalResult,
    RetrievalResponse,
} from './retriever.js';

export type {
    RerankCandidate,
    RankedResult,
    RerankResponse,
} from './reranker.js';

export type {
    SprintContext,
    CodeAwareness,
    PromptOptions,
    AssembledPrompt,
} from './prompt-builder.js';

export type {
    EvalQuery,
    EvalResult,
    EvalSummary,
} from './evaluator.js';

export type {
    RAGRoutedTask,
    RAGCommandResult,
} from './rag-router.js';

// Query Transform (Phase A4)
export {
    expandQuery,
    hydeTransform,
    decomposeQuery,
    injectMetadataFilters,
    transformQuery,
    formatTransformResult,
} from './query-transform.js';

// Cache (Phase A4)
export {
    LRUCache as RAGCache,
    hashKey,
    makeCacheKey,
    getCachedEmbedding,
    setCachedEmbedding,
    getCachedRetrieval,
    setCachedRetrieval,
    getCachedRerank,
    setCachedRerank,
    clearAllCaches,
    clearCache,
    getCacheStats,
    formatCacheStats,
} from './cache.js';

// Sprint Memory (Phase A4)
export {
    saveDecision,
    recallDecisions,
    saveSprintRetro,
    parseSprintRetro,
    formatRecalledDecisions,
    formatSprintRetro as formatSprintRetroDisplay,
} from './sprint-memory.js';

// Guardrails (Phase A4)
export {
    checkCodeStandard,
    checkTraceability,
    checkSecurity,
    checkDuplication,
    checkConsistency,
    runAllGuardrails,
    formatGuardrailReport,
} from './guardrails.js';

// Phase A4 Types
export type {
    ExpandedQuery,
    HyDEResult,
    DecomposedQuery,
    MetadataFilter,
    TransformedQuery,
    TransformOptions,
} from './query-transform.js';

export type {
    CacheStats,
    AllCacheStats,
} from './cache.js';

export type {
    Decision,
    SaveDecisionOptions,
    RecallResult,
    SprintRetro,
} from './sprint-memory.js';

export type {
    GuardrailResult,
    GuardrailReport,
    GuardrailOptions,
} from './guardrails.js';
