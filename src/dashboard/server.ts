/**
 * FajarClaw Command Center — Server
 * @ref FC-BP-01 Phase A6
 *
 * Express server serving dashboard UI + REST API.
 * Port 3900 by default.
 */

import express, { type Request, type Response, type NextFunction } from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { apiRouter } from './api-routes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env['DASHBOARD_PORT'] ?? '3900');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const app: any = express();

// ─── Middleware ───
app.use(express.json());

// CORS for local dev
app.use((_req: Request, res: Response, next: NextFunction) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    next();
});

// ─── Static UI ───
app.use(express.static(join(__dirname, 'ui')));

// ─── API Routes ───
app.use('/api', apiRouter);

// ─── SPA Fallback ───
app.get('/{*path}', (_req: Request, res: Response) => {
    res.sendFile(join(__dirname, 'ui', 'index.html'));
});

// ─── Start ───
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════╗
║   🦅 FajarClaw Command Center v4.0.0        ║
║   ──────────────────────────────────────     ║
║   Dashboard: http://localhost:${PORT}          ║
║   API:       http://localhost:${PORT}/api      ║
║   Health:    http://localhost:${PORT}/api/health║
╚══════════════════════════════════════════════╝
    `);
});

export { app };
