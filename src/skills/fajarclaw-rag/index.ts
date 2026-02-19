/**
 * FajarClaw RAG — Barrel Export
 * @ref FC-PRD-01 §10 (RAG Pipeline)
 *
 * Re-exports all public APIs from the fajarclaw-rag skill.
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

// Retriever
export {
    retrieve,
    retrieveFrom,
    buildContext,
    buildContextSummary,
    formatRetrievalResults,
} from './retriever.js';

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
    RetrievalResult,
    RetrievalResponse,
} from './retriever.js';
