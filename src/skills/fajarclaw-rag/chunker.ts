/**
 * FajarClaw RAG — Document Chunker
 * @ref FC-PRD-01 §10.2 (Chunking Strategy)
 *
 * Section-aware markdown chunking + basic code chunking.
 * Preserves heading hierarchy and code block boundaries.
 */

// === Types ===

export interface Chunk {
    /** Unique chunk ID — `${sourceHash}:${index}` */
    id: string;
    /** Chunk text content */
    text: string;
    /** Source file path */
    source: string;
    /** Section heading (for markdown) or symbol name (for code) */
    section: string;
    /** Chunk index within document */
    chunkIndex: number;
    /** Document type */
    docType: 'markdown' | 'code';
    /** Programming language (for code) */
    language?: string;
    /** Symbol name (function/class for code) */
    symbol?: string;
    /** Chunk type */
    chunkType?: 'section' | 'function' | 'class' | 'module' | 'import';
}

export interface ChunkOptions {
    /** Max characters per chunk (default: 1500) */
    maxChunkSize?: number;
    /** Overlap characters between chunks (default: 200) */
    overlap?: number;
    /** Min characters to keep a chunk (default: 50) */
    minChunkSize?: number;
}

const DEFAULT_OPTIONS: Required<ChunkOptions> = {
    maxChunkSize: 1500,
    overlap: 200,
    minChunkSize: 50,
};

// === Markdown Chunking ===

/**
 * Chunk markdown document by sections (heading-aware).
 * Splits on headings (#, ##, ###) and respects code blocks.
 */
export function chunkMarkdown(
    content: string,
    source: string,
    options?: ChunkOptions
): Chunk[] {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const sections = splitMarkdownSections(content);
    const chunks: Chunk[] = [];
    const sourceHash = hashSource(source);

    for (const section of sections) {
        const sectionChunks = splitBySize(section.content, opts);

        for (const text of sectionChunks) {
            if (text.trim().length < opts.minChunkSize) continue;

            chunks.push({
                id: `${sourceHash}:${chunks.length}`,
                text: section.heading ? `# ${section.heading}\n\n${text}` : text,
                source,
                section: section.heading || 'Untitled',
                chunkIndex: chunks.length,
                docType: 'markdown',
                chunkType: 'section',
            });
        }
    }

    return chunks;
}

interface MarkdownSection {
    heading: string;
    level: number;
    content: string;
}

/**
 * Split markdown into sections by heading
 */
function splitMarkdownSections(content: string): MarkdownSection[] {
    const lines = content.split('\n');
    const sections: MarkdownSection[] = [];
    let currentHeading = '';
    let currentLevel = 0;
    let currentContent: string[] = [];

    for (const line of lines) {
        const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);

        if (headingMatch) {
            // Save previous section
            if (currentContent.length > 0 || currentHeading) {
                sections.push({
                    heading: currentHeading,
                    level: currentLevel,
                    content: currentContent.join('\n').trim(),
                });
            }

            currentHeading = headingMatch[2]!;
            currentLevel = headingMatch[1]!.length;
            currentContent = [];
        } else {
            currentContent.push(line);
        }
    }

    // Save last section
    if (currentContent.length > 0 || currentHeading) {
        sections.push({
            heading: currentHeading,
            level: currentLevel,
            content: currentContent.join('\n').trim(),
        });
    }

    return sections;
}

// === Code Chunking ===

/**
 * Chunk source code by function/class boundaries.
 * Uses regex-based detection (no AST dependency for Phase A2).
 */
export function chunkCode(
    content: string,
    source: string,
    language: string,
    options?: ChunkOptions
): Chunk[] {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const chunks: Chunk[] = [];
    const sourceHash = hashSource(source);

    // Detect code blocks (functions, classes)
    const blocks = detectCodeBlocks(content, language);

    if (blocks.length === 0) {
        // No detectable blocks — chunk by size
        const sizeChunks = splitBySize(content, opts);
        for (const text of sizeChunks) {
            if (text.trim().length < opts.minChunkSize) continue;
            chunks.push({
                id: `${sourceHash}:${chunks.length}`,
                text,
                source,
                section: 'module',
                chunkIndex: chunks.length,
                docType: 'code',
                language,
                chunkType: 'module',
            });
        }
        return chunks;
    }

    for (const block of blocks) {
        const blockChunks = splitBySize(block.content, opts);
        for (const text of blockChunks) {
            if (text.trim().length < opts.minChunkSize) continue;
            chunks.push({
                id: `${sourceHash}:${chunks.length}`,
                text,
                source,
                section: block.name,
                chunkIndex: chunks.length,
                docType: 'code',
                language,
                symbol: block.name,
                chunkType: block.type,
            });
        }
    }

    return chunks;
}

interface CodeBlock {
    name: string;
    type: 'function' | 'class' | 'import';
    content: string;
    startLine: number;
}

/**
 * Detect function/class boundaries in code (regex-based)
 */
function detectCodeBlocks(content: string, language: string): CodeBlock[] {
    const blocks: CodeBlock[] = [];
    const lines = content.split('\n');

    // Language-specific patterns
    const patterns = getLanguagePatterns(language);

    let currentBlock: CodeBlock | null = null;
    let braceDepth = 0;
    let blockStartBraceDepth = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;

        // Check for function/class start
        if (!currentBlock) {
            for (const pattern of patterns) {
                const match = line.match(pattern.regex);
                if (match) {
                    currentBlock = {
                        name: match[1] ?? 'anonymous',
                        type: pattern.type,
                        content: line,
                        startLine: i,
                    };
                    blockStartBraceDepth = braceDepth;
                    break;
                }
            }
        }

        // Track braces
        for (const ch of line) {
            if (ch === '{') braceDepth++;
            if (ch === '}') braceDepth--;
        }

        // Add line to current block
        if (currentBlock && i > currentBlock.startLine) {
            currentBlock.content += '\n' + line;
        }

        // Check if block ended (brace depth returned)
        if (currentBlock && braceDepth <= blockStartBraceDepth && i > currentBlock.startLine) {
            blocks.push(currentBlock);
            currentBlock = null;
        }
    }

    // Push any remaining block
    if (currentBlock) {
        blocks.push(currentBlock);
    }

    return blocks;
}

interface LanguagePattern {
    regex: RegExp;
    type: 'function' | 'class' | 'import';
}

function getLanguagePatterns(language: string): LanguagePattern[] {
    switch (language) {
        case 'typescript':
        case 'javascript':
            return [
                { regex: /(?:export\s+)?(?:async\s+)?function\s+(\w+)/, type: 'function' },
                { regex: /(?:export\s+)?class\s+(\w+)/, type: 'class' },
                { regex: /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\(/, type: 'function' },
            ];
        case 'python':
            return [
                { regex: /^(?:async\s+)?def\s+(\w+)/, type: 'function' },
                { regex: /^class\s+(\w+)/, type: 'class' },
            ];
        case 'rust':
            return [
                { regex: /(?:pub\s+)?(?:async\s+)?fn\s+(\w+)/, type: 'function' },
                { regex: /(?:pub\s+)?struct\s+(\w+)/, type: 'class' },
                { regex: /(?:pub\s+)?impl\s+(\w+)/, type: 'class' },
            ];
        default:
            return [
                { regex: /function\s+(\w+)/, type: 'function' },
                { regex: /class\s+(\w+)/, type: 'class' },
            ];
    }
}

// === Utilities ===

/**
 * Split text into chunks by size with overlap
 */
function splitBySize(text: string, opts: Required<ChunkOptions>): string[] {
    if (text.length <= opts.maxChunkSize) return [text];

    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
        let end = start + opts.maxChunkSize;

        // Try to break at paragraph or line boundary
        if (end < text.length) {
            const lastParagraph = text.lastIndexOf('\n\n', end);
            if (lastParagraph > start + opts.maxChunkSize / 2) {
                end = lastParagraph;
            } else {
                const lastLine = text.lastIndexOf('\n', end);
                if (lastLine > start + opts.maxChunkSize / 2) {
                    end = lastLine;
                }
            }
        }

        chunks.push(text.slice(start, end).trim());
        start = end - opts.overlap;
        if (start < 0) start = 0;
        if (end >= text.length) break;
    }

    return chunks;
}

/**
 * Hash source path for chunk ID generation
 */
function hashSource(source: string): string {
    let hash = 0;
    for (let i = 0; i < source.length; i++) {
        hash = ((hash << 5) - hash + source.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(36);
}

/**
 * Detect file type from extension
 */
export function detectFileType(filepath: string): { docType: 'markdown' | 'code'; language: string } {
    const ext = filepath.split('.').pop()?.toLowerCase() ?? '';

    const codeExts: Record<string, string> = {
        ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
        py: 'python', rs: 'rust', go: 'go', java: 'java', cpp: 'cpp', c: 'c',
        rb: 'ruby', php: 'php', swift: 'swift', kt: 'kotlin',
    };

    const markdownExts = ['md', 'mdx', 'txt', 'rst'];

    if (markdownExts.includes(ext)) {
        return { docType: 'markdown', language: ext };
    }

    if (ext in codeExts) {
        return { docType: 'code', language: codeExts[ext]! };
    }

    return { docType: 'code', language: ext };
}

/**
 * Auto-chunk file content based on detected type
 */
export function chunkFile(
    content: string,
    source: string,
    options?: ChunkOptions
): Chunk[] {
    const { docType, language } = detectFileType(source);

    if (docType === 'markdown') {
        return chunkMarkdown(content, source, options);
    }

    return chunkCode(content, source, language, options);
}
