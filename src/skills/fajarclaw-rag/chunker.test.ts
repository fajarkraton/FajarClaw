/**
 * FajarClaw RAG — Chunker Tests
 */

import { describe, it, expect } from 'vitest';
import { chunkMarkdown, chunkCode, chunkFile, detectFileType } from './chunker.js';

describe('chunkMarkdown', () => {
    it('harus split markdown by headings', () => {
        const content = `# Introduction
This is the intro section with enough text to be a proper chunk for testing purposes.

## Features
Feature list goes here with details about the application capabilities and modules.

## Architecture
Architecture description here with enough details about the system design and components.`;

        const chunks = chunkMarkdown(content, 'test.md', { minChunkSize: 30 });
        expect(chunks.length).toBeGreaterThanOrEqual(3);
        expect(chunks[0]!.section).toBe('Introduction');
        expect(chunks[1]!.section).toBe('Features');
        expect(chunks[2]!.section).toBe('Architecture');
        expect(chunks[0]!.docType).toBe('markdown');
    });

    it('harus handle empty content', () => {
        const chunks = chunkMarkdown('', 'empty.md');
        expect(chunks).toHaveLength(0);
    });

    it('harus handle content without headings', () => {
        const content = 'Just some plain text without any headings. This needs to be long enough to pass the minimum chunk size threshold for the test.';
        const chunks = chunkMarkdown(content, 'plain.md');
        expect(chunks.length).toBeGreaterThanOrEqual(1);
        expect(chunks[0]!.section).toBe('Untitled');
    });

    it('harus split large sections by size', () => {
        const longContent = '# Big Section\n\n' + 'A'.repeat(3000);
        const chunks = chunkMarkdown(longContent, 'big.md', { maxChunkSize: 500 });
        expect(chunks.length).toBeGreaterThan(1);
    });

    it('harus generate unique chunk IDs', () => {
        const content = `# A
Content A here enough text.

# B
Content B here enough text.`;
        const chunks = chunkMarkdown(content, 'test.md');
        const ids = chunks.map(c => c.id);
        expect(new Set(ids).size).toBe(ids.length);
    });
});

describe('chunkCode', () => {
    it('harus detect TypeScript functions', () => {
        const code = `
export function routeTask(message: string) {
  const engine = 'claude-code';
  const result = { engine, message, timestamp: Date.now() };
  return result;
}

export async function executeTask(task: string) {
  const output = await processTask(task);
  return { success: true, output: output.toString() };
}
`;
        const chunks = chunkCode(code, 'router.ts', 'typescript');
        expect(chunks.length).toBeGreaterThanOrEqual(2);
        expect(chunks.some(c => c.symbol === 'routeTask')).toBe(true);
        expect(chunks.some(c => c.symbol === 'executeTask')).toBe(true);
    });

    it('harus detect classes', () => {
        const code = `
export class Router {
  route(msg: string) { return msg; }
}
`;
        const chunks = chunkCode(code, 'router.ts', 'typescript');
        expect(chunks.some(c => c.symbol === 'Router')).toBe(true);
        expect(chunks.some(c => c.chunkType === 'class')).toBe(true);
    });

    it('harus fallback ke size-based untuk kode tanpa functions', () => {
        const code = 'const x = 1;\nconst y = 2;\nconst z = x + y;\n'.repeat(5);
        const chunks = chunkCode(code, 'config.ts', 'typescript');
        expect(chunks.length).toBeGreaterThanOrEqual(1);
        expect(chunks[0]!.chunkType).toBe('module');
    });

    it('harus set language field', () => {
        const code = [
            'def hello():',
            '    message = "world"',
            '    greeting = f"Hello {message}"',
            '    print(greeting)',
            '    for i in range(10):',
            '        print(f"  Count: {i}")',
            '    return message * 3',
            '',
            'def goodbye():',
            '    farewell = "See you later!"',
            '    print(farewell)',
            '    return farewell',
        ].join('\n');
        const chunks = chunkCode(code, 'hello.py', 'python', { minChunkSize: 30 });
        expect(chunks.length).toBeGreaterThanOrEqual(1);
        expect(chunks[0]!.language).toBe('python');
    });
});

describe('detectFileType', () => {
    it('harus detect markdown', () => {
        expect(detectFileType('README.md')).toEqual({ docType: 'markdown', language: 'md' });
        expect(detectFileType('docs/guide.mdx')).toEqual({ docType: 'markdown', language: 'mdx' });
    });

    it('harus detect TypeScript', () => {
        expect(detectFileType('router.ts')).toEqual({ docType: 'code', language: 'typescript' });
        expect(detectFileType('App.tsx')).toEqual({ docType: 'code', language: 'typescript' });
    });

    it('harus detect Python', () => {
        expect(detectFileType('server.py')).toEqual({ docType: 'code', language: 'python' });
    });

    it('harus detect Rust', () => {
        expect(detectFileType('main.rs')).toEqual({ docType: 'code', language: 'rust' });
    });
});

describe('chunkFile', () => {
    it('harus auto-detect markdown', () => {
        const content = `# Title

This is the introduction section with enough text to pass the minimum chunk size requirement. It contains multiple sentences about the document topic and provides context for readers to understand the overall structure of this markdown file.`;
        const chunks = chunkFile(content, 'doc.md');
        expect(chunks[0]!.docType).toBe('markdown');
    });

    it('harus auto-detect code', () => {
        const code = `export function fooBarBaz(input: string): number {
  const result = input.length * 42;
  console.log('Processing:', input);
  return result;
}`;
        const chunks = chunkFile(code, 'foo.ts');
        expect(chunks[0]!.docType).toBe('code');
    });
});
