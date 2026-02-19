/**
 * FajarClaw RAG — Query Transformation
 * @ref FC-PRD-01 §10.6 (Query Optimization)
 *
 * Transforms user queries for better retrieval:
 * - expandQuery: add synonyms + bilingual (ID/EN) equivalents
 * - hydeTransform: hypothetical document embedding
 * - decomposeQuery: split complex query → sub-queries
 * - injectMetadataFilters: auto-add collection/type filters
 *
 * Phase A4: Intelligence Layer
 */

// === Types ===

export interface ExpandedQuery {
    /** Original query */
    original: string;
    /** Expanded query with synonyms */
    expanded: string;
    /** Added terms */
    addedTerms: string[];
}

export interface HyDEResult {
    /** Original query */
    original: string;
    /** Generated hypothetical document text */
    hypothetical: string;
    /** Whether to embed the hypothetical doc instead of query */
    useHypothetical: boolean;
}

export interface DecomposedQuery {
    /** Original complex query */
    original: string;
    /** Sub-queries extracted */
    subQueries: string[];
    /** Whether decomposition was applied */
    wasDecomposed: boolean;
}

export interface MetadataFilter {
    /** Milvus filter expression */
    filter: string;
    /** Detected collection targets */
    collections: string[];
    /** Whether filters were auto-injected */
    wasFiltered: boolean;
}

export interface TransformedQuery {
    /** Final query text (after expansion) */
    query: string;
    /** Expansion info */
    expansion: ExpandedQuery;
    /** HyDE result (if applicable) */
    hyde: HyDEResult | null;
    /** Sub-queries (if decomposed) */
    decomposition: DecomposedQuery;
    /** Auto-detected filters */
    metadata: MetadataFilter;
    /** All transformations applied */
    transformsApplied: string[];
}

export interface TransformOptions {
    /** Enable query expansion (default: true) */
    expand?: boolean;
    /** Enable HyDE (default: false — requires more compute) */
    hyde?: boolean;
    /** Enable decomposition (default: true) */
    decompose?: boolean;
    /** Enable metadata filter injection (default: true) */
    injectFilters?: boolean;
}

// === Synonym / Bilingual Dictionary ===

/** Technical synonym pairs (ID ↔ EN) for FajarClaw domain */
const SYNONYM_MAP: Record<string, string[]> = {
    // Programming concepts
    'router': ['routing', 'route', 'dispatch', 'pengarah'],
    'routing': ['router', 'route', 'dispatch'],
    'embed': ['embedding', 'vector', 'encode', 'vektor'],
    'embedding': ['embed', 'vector', 'encode'],
    'search': ['retrieve', 'find', 'query', 'cari', 'pencarian'],
    'retrieve': ['search', 'find', 'retrieval', 'ambil'],
    'cache': ['caching', 'cached', 'memoize', 'simpan sementara'],
    'test': ['testing', 'unit test', 'tes', 'pengujian'],
    'build': ['compile', 'create', 'generate', 'bangun', 'buat'],
    'debug': ['debugging', 'fix', 'troubleshoot', 'perbaiki'],
    'deploy': ['deployment', 'ship', 'release', 'rilis'],

    // FajarClaw-specific
    'claude code': ['claude-code', 'claude', 'anthropic'],
    'antigravity': ['gemini', 'google', 'deepmind'],
    'milvus': ['vector database', 'vector db', 'collection'],
    'reranker': ['rerank', 'cross-encoder', 'qwen3'],
    'chunker': ['chunk', 'chunking', 'split', 'segment'],
    'ingestion': ['ingest', 'index', 'indexing', 'pipeline'],
    'guardrails': ['guard', 'check', 'validate', 'quality'],

    // Indonesian ↔ English
    'bagaimana': ['how', 'cara'],
    'apa': ['what', 'apakah'],
    'dimana': ['where', 'lokasi'],
    'kapan': ['when', 'waktu'],
    'kenapa': ['why', 'alasan'],
    'buat': ['create', 'make', 'build'],
    'cari': ['search', 'find', 'retrieve'],
    'tambah': ['add', 'insert', 'append'],
    'hapus': ['delete', 'remove', 'drop'],
    'ubah': ['modify', 'update', 'change', 'edit'],
};

// === Collection / Type Detection ===

const COLLECTION_KEYWORDS: Record<string, string[]> = {
    'fc_codebase': ['code', 'function', 'class', 'import', 'typescript', 'file', '.ts', 'src/', 'implement'],
    'fc_documents': ['doc', 'documentation', 'readme', 'guide', 'manual', 'spec', 'PRD'],
    'fc_decisions': ['decision', 'keputusan', 'sprint', 'retro', 'reason', 'alasan'],
    'fc_errors': ['error', 'bug', 'fix', 'crash', 'fail', 'issue'],
    'fc_tests': ['test', 'spec', 'expect', 'vitest', 'assert'],
};

const DOCTYPE_KEYWORDS: Record<string, string[]> = {
    'code': ['function', 'class', 'import', 'export', 'const', 'interface', 'type'],
    'markdown': ['readme', 'documentation', 'guide', '.md'],
    'config': ['config', 'tsconfig', 'package.json', 'env', 'setting'],
};

// === Core Transformations ===

/**
 * Expand query with synonyms and bilingual equivalents.
 *
 * Algorithm:
 * 1. Tokenize query into words
 * 2. For each word, look up synonyms in SYNONYM_MAP
 * 3. Add unique synonyms (max 3 per term)
 * 4. Return expanded query string
 */
export function expandQuery(query: string): ExpandedQuery {
    const words = query.toLowerCase().split(/\s+/);
    const addedTerms: string[] = [];

    for (const word of words) {
        const cleanWord = word.replace(/[?.,!;:'"]/g, '');
        if (cleanWord.length < 2) continue;

        // Check direct synonym match
        const synonyms = SYNONYM_MAP[cleanWord];
        if (synonyms) {
            // Add up to 2 synonyms that aren't already present
            const newTerms = synonyms
                .filter(s => !query.toLowerCase().includes(s.toLowerCase()))
                .slice(0, 2);
            addedTerms.push(...newTerms);
        }

        // Check partial match (e.g., "routing" matches "router" entry)
        for (const [key, syns] of Object.entries(SYNONYM_MAP)) {
            if (key !== cleanWord && (cleanWord.includes(key) || key.includes(cleanWord))) {
                const newTerms = syns
                    .filter(s => !query.toLowerCase().includes(s.toLowerCase()) && !addedTerms.includes(s))
                    .slice(0, 1);
                addedTerms.push(...newTerms);
            }
        }
    }

    // Deduplicate
    const uniqueTerms = [...new Set(addedTerms)].slice(0, 6);

    const expanded = uniqueTerms.length > 0
        ? `${query} ${uniqueTerms.join(' ')}`
        : query;

    return {
        original: query,
        expanded,
        addedTerms: uniqueTerms,
    };
}

/**
 * HyDE: Hypothetical Document Embeddings
 *
 * Generate a short hypothetical document that would answer the query.
 * This doc is then embedded instead of the raw query, improving retrieval
 * for queries that don't share vocabulary with target documents.
 *
 * Note: This is a template-based HyDE (no LLM call). For LLM-powered HyDE,
 * the generateHypothetical function can be overridden with an actual LLM call.
 */
export function hydeTransform(query: string): HyDEResult {
    // Only apply HyDE for "how" / "what" / "why" questions
    const isQuestion = /^(how|what|why|when|where|bagaimana|apa|kenapa|dimana|kapan)\b/i.test(query);

    if (!isQuestion) {
        return {
            original: query,
            hypothetical: query,
            useHypothetical: false,
        };
    }

    // Template-based hypothetical document generation
    const hypothetical = generateHypothetical(query);

    return {
        original: query,
        hypothetical,
        useHypothetical: true,
    };
}

/**
 * Generate a hypothetical document from a query template.
 * This is a lightweight substitute for LLM-generated HyDE.
 */
function generateHypothetical(query: string): string {
    const q = query.toLowerCase();

    // "How does X work?" → "X works by ..."
    const howMatch = q.match(/^(?:how|bagaimana)\s+(?:does|do|is|are|can|to|cara)?\s*(.+?)[\s?]*$/i);
    if (howMatch) {
        const topic = howMatch[1]!.replace(/\?$/, '').trim();
        return `${topic}. This component works by processing the input through a pipeline. It handles the main logic in the core function and returns the result. Implementation details include configuration, error handling, and integration with other modules.`;
    }

    // "What is X?" → "X is ..."
    const whatMatch = q.match(/^(?:what|apa)\s+(?:is|are|itu|yang)?\s*(.+?)[\s?]*$/i);
    if (whatMatch) {
        const topic = whatMatch[1]!.replace(/\?$/, '').trim();
        return `${topic} is a component in the FajarClaw system. It provides functionality for processing and managing data. It integrates with other modules through standardized interfaces and follows the project's architectural patterns.`;
    }

    // "Why X?" → "The reason X is ..."
    const whyMatch = q.match(/^(?:why|kenapa|mengapa)\s+(.+?)[\s?]*$/i);
    if (whyMatch) {
        const topic = whyMatch[1]!.replace(/\?$/, '').trim();
        return `The reason ${topic} is because of the architectural decision to optimize for maintainability and performance. This design choice was made during the planning phase to ensure scalability and code quality.`;
    }

    // Fallback
    return `${query.replace(/\?$/, '')}. This document describes the implementation details, configuration, and usage patterns for this feature in the FajarClaw codebase.`;
}

/**
 * Decompose a complex query into simpler sub-queries.
 *
 * Triggers: conjunctions (and, or, also), multiple question words,
 * or queries longer than 15 words.
 */
export function decomposeQuery(query: string): DecomposedQuery {
    const words = query.split(/\s+/);

    // Don't decompose short queries
    if (words.length <= 8) {
        return { original: query, subQueries: [query], wasDecomposed: false };
    }

    const subQueries: string[] = [];

    // Split on conjunctions: "and", "or", "also", "dan", "atau", "serta"
    const conjunctionPattern = /\b(?:and|or|also|plus|dan|atau|serta|juga)\b/i;
    if (conjunctionPattern.test(query)) {
        const parts = query.split(conjunctionPattern)
            .map(p => p.trim())
            .filter(p => p.length > 5);
        if (parts.length >= 2) {
            subQueries.push(...parts);
        }
    }

    // Split on semicolons / question marks (multiple questions)
    if (subQueries.length === 0 && /[;?]/.test(query)) {
        const parts = query.split(/[;?]/)
            .map(p => p.trim())
            .filter(p => p.length > 5);
        if (parts.length >= 2) {
            subQueries.push(...parts.map(p => p.endsWith('?') ? p : `${p}?`));
        }
    }

    // Very long query → extract key phrases as sub-queries
    if (subQueries.length === 0 && words.length > 15) {
        // Take first half and second half as separate queries
        const mid = Math.floor(words.length / 2);
        subQueries.push(words.slice(0, mid).join(' '));
        subQueries.push(words.slice(mid).join(' '));
    }

    const wasDecomposed = subQueries.length > 1;

    return {
        original: query,
        subQueries: wasDecomposed ? subQueries : [query],
        wasDecomposed,
    };
}

/**
 * Auto-detect and inject metadata filters based on query content.
 *
 * Scans query for collection and doc_type keywords,
 * returns Milvus filter expressions.
 */
export function injectMetadataFilters(query: string): MetadataFilter {
    const q = query.toLowerCase();
    const detectedCollections: string[] = [];
    const conditions: string[] = [];

    // Detect target collections
    for (const [collection, keywords] of Object.entries(COLLECTION_KEYWORDS)) {
        const hits = keywords.filter(kw => q.includes(kw.toLowerCase()));
        if (hits.length >= 2) {
            detectedCollections.push(collection);
        }
    }

    // Detect doc_type
    for (const [docType, keywords] of Object.entries(DOCTYPE_KEYWORDS)) {
        const hits = keywords.filter(kw => q.includes(kw.toLowerCase()));
        if (hits.length >= 2) {
            conditions.push(`doc_type == "${docType}"`);
        }
    }

    const filter = conditions.length > 0 ? conditions.join(' && ') : '';

    return {
        filter,
        collections: detectedCollections,
        wasFiltered: conditions.length > 0 || detectedCollections.length > 0,
    };
}

// === Full Pipeline ===

/**
 * Apply all transformations to a query.
 *
 * Pipeline:
 * 1. Expand query (synonyms + bilingual)
 * 2. Decompose (if complex)
 * 3. HyDE (if enabled and question-type)
 * 4. Inject metadata filters
 *
 * @returns TransformedQuery with all intermediate results
 */
export function transformQuery(
    query: string,
    options?: TransformOptions
): TransformedQuery {
    const doExpand = options?.expand ?? true;
    const doHyde = options?.hyde ?? false;
    const doDecompose = options?.decompose ?? true;
    const doFilter = options?.injectFilters ?? true;

    const transformsApplied: string[] = [];

    // Step 1: Expand
    const expansion = doExpand ? expandQuery(query) : { original: query, expanded: query, addedTerms: [] };
    if (expansion.addedTerms.length > 0) transformsApplied.push('expand');

    // Step 2: Decompose
    const decomposition = doDecompose ? decomposeQuery(query) : { original: query, subQueries: [query], wasDecomposed: false };
    if (decomposition.wasDecomposed) transformsApplied.push('decompose');

    // Step 3: HyDE
    const hyde = doHyde ? hydeTransform(query) : null;
    if (hyde?.useHypothetical) transformsApplied.push('hyde');

    // Step 4: Metadata filters
    const metadata = doFilter ? injectMetadataFilters(query) : { filter: '', collections: [], wasFiltered: false };
    if (metadata.wasFiltered) transformsApplied.push('filter');

    return {
        query: expansion.expanded,
        expansion,
        hyde,
        decomposition,
        metadata,
        transformsApplied,
    };
}

/**
 * Format transformation results for display
 */
export function formatTransformResult(result: TransformedQuery): string {
    const lines = [
        `🔄 Query Transform:`,
        `  Original: "${result.expansion.original}"`,
    ];

    if (result.expansion.addedTerms.length > 0) {
        lines.push(`  📖 Expanded: +${result.expansion.addedTerms.join(', ')}`);
    }

    if (result.decomposition.wasDecomposed) {
        lines.push(`  🔀 Decomposed into ${result.decomposition.subQueries.length} sub-queries`);
    }

    if (result.hyde?.useHypothetical) {
        lines.push(`  📝 HyDE: hypothetical doc generated (${result.hyde.hypothetical.length} chars)`);
    }

    if (result.metadata.wasFiltered) {
        if (result.metadata.collections.length > 0) {
            lines.push(`  🎯 Collections: ${result.metadata.collections.join(', ')}`);
        }
        if (result.metadata.filter) {
            lines.push(`  🔍 Filter: ${result.metadata.filter}`);
        }
    }

    if (result.transformsApplied.length === 0) {
        lines.push(`  (no transformations applied)`);
    }

    return lines.join('\n');
}
