/**
 * FajarClaw Command Center — API Routes
 * @ref FC-BP-01 Phase A6
 *
 * REST endpoints wrapping existing FajarClaw modules.
 */

import { Router, type Request, type Response } from 'express';
import { execSync } from 'child_process';

// Import FajarClaw modules
import { retrieve, hybridRetrieve, type RetrievalResult } from '../skills/fajarclaw-rag/retriever.js';
import { getCollectionCount } from '../skills/fajarclaw-rag/milvus-client.js';
import { ALL_COLLECTIONS, type CollectionSchema } from '../skills/fajarclaw-rag/collection-schemas.js';
import { runEval, formatEvalSummary, exportAsRAGAS } from '../skills/fajarclaw-rag/evaluator.js';
import { getCacheStats } from '../skills/fajarclaw-rag/cache.js';
import { recallDecisions } from '../skills/fajarclaw-rag/sprint-memory.js';
import { routeTask } from '../skills/fajarclaw-router/router.js';
import { getVisualHealth } from '../skills/fajarclaw-rag/visual-embedder.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const apiRouter: any = Router();

// ─── Health ───

apiRouter.get('/health', async (_req: Request, res: Response) => {
    const servers = await Promise.allSettled([
        checkServer('Milvus', 'localhost', 19530),
        checkServer('BGE-M3', 'localhost', 11435),
        checkServer('Reranker', 'localhost', 8001),
        checkVisualServer(),
    ]);

    const names = ['milvus', 'bge_m3', 'reranker', 'qwen3_vl'];
    const labels = ['Milvus', 'BGE-M3 Embedder', 'Qwen3 Reranker', 'Qwen3-VL Visual'];

    const results = servers.map((s, i) => {
        if (s.status === 'fulfilled') {
            return { id: names[i], name: labels[i], ...s.value };
        }
        return { id: names[i], name: labels[i], status: 'unhealthy', error: 'Check failed' };
    });

    res.json({ servers: results, timestamp: new Date().toISOString() });
});

async function checkServer(_name: string, host: string, port: number) {
    try {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 2000);
        const response = await fetch(`http://${host}:${port}/health`, { signal: controller.signal });
        return { status: response.ok ? 'healthy' : 'unhealthy', port };
    } catch {
        // For Milvus, check TCP port
        try {
            execSync(`nc -z ${host} ${port} 2>/dev/null`, { timeout: 2000 });
            return { status: 'healthy', port };
        } catch {
            return { status: 'unhealthy', port };
        }
    }
}

async function checkVisualServer() {
    try {
        const health = await getVisualHealth();
        return { status: health.status, port: 8002, gpu: health.gpu, dimension: health.dimension };
    } catch {
        return { status: 'unhealthy', port: 8002 };
    }
}

// ─── GPU ───

apiRouter.get('/gpu', (_req: Request, res: Response) => {
    try {
        const output = execSync(
            'nvidia-smi --query-gpu=name,memory.total,memory.used,memory.free,utilization.gpu,temperature.gpu --format=csv,noheader,nounits',
            { timeout: 3000 }
        ).toString().trim();

        const parts = output.split(',').map((s: string) => s.trim());
        res.json({
            name: parts[0],
            memory: {
                total: parseInt(parts[1]),
                used: parseInt(parts[2]),
                free: parseInt(parts[3]),
            },
            utilization: parseInt(parts[4]),
            temperature: parseInt(parts[5]),
        });
    } catch {
        res.json({ name: 'N/A', memory: { total: 0, used: 0, free: 0 }, utilization: 0, temperature: 0 });
    }
});

// ─── Collections ───

apiRouter.get('/collections', async (_req: Request, res: Response) => {
    try {
        const collections = await Promise.allSettled(
            ALL_COLLECTIONS.map(async (schema: CollectionSchema) => {
                try {
                    const rowCount = await getCollectionCount(schema.name);
                    return { name: schema.name, description: schema.description, rowCount };
                } catch {
                    return { name: schema.name, description: schema.description, rowCount: 0, error: 'Unavailable' };
                }
            })
        );

        res.json({
            collections: collections.map((c: PromiseSettledResult<{ name: string; description: string; rowCount: number; error?: string }>) =>
                c.status === 'fulfilled' ? c.value : { name: 'unknown', rowCount: 0 }
            ),
        });
    } catch (err) {
        res.status(500).json({ error: String(err) });
    }
});

// ─── Search ───

apiRouter.post('/search', async (req: Request, res: Response) => {
    const { query, mode = 'hybrid', topK = 10 } = req.body as { query: string; mode?: string; topK?: number };

    if (!query) {
        res.status(400).json({ error: 'Query required' });
        return;
    }

    try {
        const start = Date.now();
        const response = mode === 'basic'
            ? await retrieve(query, { topK })
            : await hybridRetrieve(query, { topK });

        res.json({
            query,
            mode,
            count: response.results.length,
            durationMs: Date.now() - start,
            results: response.results.map((r: RetrievalResult) => ({
                text: r.text?.substring(0, 300),
                score: r.score,
                source: r.source,
                collection: r.collection,
            })),
        });
    } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
});

// ─── Routing ───

apiRouter.post('/route', async (req: Request, res: Response) => {
    const { task } = req.body as { task: string };
    if (!task) {
        res.status(400).json({ error: 'Task required' });
        return;
    }

    try {
        const result = routeTask(task);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
});

// ─── Eval ───

apiRouter.post('/eval', async (_req: Request, res: Response) => {
    try {
        const start = Date.now();
        const result = await runEval();
        res.json({
            summary: formatEvalSummary(result),
            ragas: exportAsRAGAS(result),
            durationMs: Date.now() - start,
        });
    } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
});

// ─── Sprint Memory ───

apiRouter.get('/sprint-memory', async (req: Request, res: Response) => {
    const query = req.query['q'] as string | undefined;
    try {
        if (query) {
            const recalled = await recallDecisions(query);
            res.json({ query, results: recalled });
        } else {
            res.json({ stats: { totalEntries: 0, decisions: 0, patterns: 0 } });
        }
    } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
});

// ─── Cache ───

apiRouter.get('/cache', (_req: Request, res: Response) => {
    try {
        const stats = getCacheStats();
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
});
