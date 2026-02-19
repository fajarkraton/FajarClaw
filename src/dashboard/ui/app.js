/**
 * FajarClaw Command Center — Client App
 * @ref FC-BP-01 Phase A6
 */

const API = '/api';

// ─── Navigation ───

document.querySelectorAll('.sidebar__item').forEach(item => {
    item.addEventListener('click', () => {
        document.querySelectorAll('.sidebar__item').forEach(i => i.classList.remove('active'));
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        item.classList.add('active');
        const panel = document.getElementById(`panel-${item.dataset.panel}`);
        if (panel) panel.classList.add('active');

        // Load data on panel switch
        const p = item.dataset.panel;
        if (p === 'collections') loadCollections();
        if (p === 'memory') loadMemoryStats();
    });
});

// ─── Health Polling ───

async function loadHealth() {
    try {
        const res = await fetch(`${API}/health`);
        const data = await res.json();
        renderServers(data.servers);
        updateTopbar(data.servers);
    } catch {
        document.getElementById('topbar-text').textContent = 'Disconnected';
    }
}

function renderServers(servers) {
    const container = document.getElementById('server-cards');
    container.innerHTML = servers.map(s => `
        <div class="card">
            <div class="server-card">
                <div class="server-card__icon server-card__icon--${s.status}">
                    ${getServerIcon(s.id)}
                </div>
                <div>
                    <div class="server-card__name">${s.name}</div>
                    <div class="server-card__port">:${s.port}</div>
                </div>
                <div class="server-card__status">
                    <span class="server-card__dot server-card__dot--${s.status}"></span>
                    ${s.status === 'healthy' ? 'Online' : 'Offline'}
                </div>
            </div>
        </div>
    `).join('');
}

function getServerIcon(id) {
    const icons = { milvus: '🗄️', bge_m3: '🧬', reranker: '🎯', qwen3_vl: '👁️' };
    return icons[id] || '⚙️';
}

function updateTopbar(servers) {
    const healthy = servers.filter(s => s.status === 'healthy').length;
    const text = document.getElementById('topbar-text');
    const dot = document.querySelector('.topbar__dot');
    text.textContent = `${healthy}/${servers.length} servers online`;
    dot.style.background = healthy === servers.length ? 'var(--success)' :
        healthy > 0 ? 'var(--warning)' : 'var(--danger)';
}

// ─── GPU ───

async function loadGpu() {
    try {
        const res = await fetch(`${API}/gpu`);
        const gpu = await res.json();
        const used = gpu.memory.used;
        const total = gpu.memory.total;
        const pct = total > 0 ? used / total : 0;

        document.getElementById('gpu-name').textContent = gpu.name || 'N/A';
        document.getElementById('gpu-vram-used').textContent = (used / 1024).toFixed(1);
        document.getElementById('gpu-free').textContent = gpu.memory.free;
        document.getElementById('gpu-util').textContent = gpu.utilization;
        document.getElementById('gpu-temp').textContent = gpu.temperature;

        // Arc: circumference = 2 * PI * 50 ≈ 314
        const offset = 314 - (314 * pct);
        document.getElementById('gpu-arc').style.strokeDashoffset = offset;
    } catch { /* ignore */ }
}

// ─── Cache ───

async function loadCache() {
    try {
        const res = await fetch(`${API}/cache`);
        const stats = await res.json();
        document.getElementById('cache-stats').innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 12px;">
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: var(--text-secondary); font-size: 13px;">Entries</span>
                    <span style="font-family: var(--mono); font-weight: 600;">${stats.size ?? 0}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: var(--text-secondary); font-size: 13px;">Hits</span>
                    <span style="font-family: var(--mono); font-weight: 600; color: var(--success);">${stats.hits ?? 0}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: var(--text-secondary); font-size: 13px;">Misses</span>
                    <span style="font-family: var(--mono); font-weight: 600; color: var(--text-muted);">${stats.misses ?? 0}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: var(--text-secondary); font-size: 13px;">Hit Rate</span>
                    <span style="font-family: var(--mono); font-weight: 600; color: var(--accent);">${stats.hitRate ? (stats.hitRate * 100).toFixed(1) : 0}%</span>
                </div>
            </div>
        `;
    } catch {
        document.getElementById('cache-stats').innerHTML = `
            <div class="empty-state"><div class="empty-state__text">Cache unavailable</div></div>
        `;
    }
}

// ─── Search ───

document.getElementById('search-btn').addEventListener('click', doSearch);
document.getElementById('search-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') doSearch();
});

async function doSearch() {
    const query = document.getElementById('search-input').value.trim();
    const mode = document.getElementById('search-mode').value;
    if (!query) return;

    const container = document.getElementById('search-results');
    container.innerHTML = '<div class="loading"><div class="loading__spinner"></div></div>';

    try {
        const res = await fetch(`${API}/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, mode, topK: 10 }),
        });
        const data = await res.json();

        if (data.results?.length > 0) {
            container.innerHTML = `
                <div class="card__header">
                    <span class="card__title">${data.count} results</span>
                    <span class="card__badge card__badge--success">${data.durationMs}ms • ${data.mode}</span>
                </div>
                ${data.results.map(r => `
                    <div class="result-card">
                        <div class="result-card__header">
                            <span class="result-card__source">${r.source || r.collection || 'unknown'}</span>
                            <span class="result-card__score">${(r.score * 100).toFixed(1)}%</span>
                        </div>
                        <div class="result-card__text">${escapeHtml(r.text || '')}</div>
                    </div>
                `).join('')}
            `;
        } else {
            container.innerHTML = '<div class="empty-state"><div class="empty-state__icon">🔍</div><div class="empty-state__text">No results found</div></div>';
        }
    } catch (err) {
        container.innerHTML = `<div class="empty-state"><div class="empty-state__text">Error: ${err.message}</div></div>`;
    }
}

// ─── Collections ───

async function loadCollections() {
    const container = document.getElementById('collections-list');
    container.innerHTML = '<div class="loading"><div class="loading__spinner"></div></div>';

    try {
        const res = await fetch(`${API}/collections`);
        const data = await res.json();
        const maxCount = Math.max(...data.collections.map(c => c.rowCount || 0), 1);

        container.innerHTML = data.collections.map(c => {
            const count = c.rowCount || 0;
            const pct = (count / maxCount) * 100;
            return `
                <div class="collection-row">
                    <span class="collection-row__name">${c.name}</span>
                    <div class="collection-row__bar">
                        <div class="collection-row__fill" style="width: ${Math.max(pct, 1)}%"></div>
                    </div>
                    <span class="collection-row__count">${count.toLocaleString()}</span>
                    <span class="collection-row__desc">${c.description || ''}</span>
                </div>
            `;
        }).join('');
    } catch (err) {
        container.innerHTML = `<div class="empty-state"><div class="empty-state__text">Error: ${err.message}</div></div>`;
    }
}

// ─── Routing ───

document.getElementById('route-btn').addEventListener('click', doRoute);
document.getElementById('route-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') doRoute();
});

async function doRoute() {
    const task = document.getElementById('route-input').value.trim();
    if (!task) return;

    const container = document.getElementById('route-result');
    container.innerHTML = '<div class="loading"><div class="loading__spinner"></div></div>';

    try {
        const res = await fetch(`${API}/route`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task }),
        });
        const data = await res.json();

        const engineClass = data.engine === 'claude-code' ? 'claude-code' : 'antigravity';
        const engineLabel = data.engine === 'claude-code' ? '⚡ Claude Code' : '✨ Antigravity';
        const engineIcon = data.engine === 'claude-code' ? '🟣' : '🟠';

        container.innerHTML = `
            <div class="route-result">
                <div class="route-result__engine route-result__engine--${engineClass}">
                    ${engineIcon} ${engineLabel}
                </div>
                <div style="font-size: 13px; color: var(--text-secondary); margin: 8px 0;">
                    Confidence: <strong style="color: var(--text-primary); font-family: var(--mono);">
                    ${((data.confidence || 0) * 100).toFixed(0)}%</strong>
                </div>
                <div class="route-result__scores">
                    <div>Claude Code: <span>${((data.scores?.claudeCode || 0) * 100).toFixed(0)}%</span></div>
                    <div>Antigravity: <span>${((data.scores?.antigravity || 0) * 100).toFixed(0)}%</span></div>
                </div>
                ${data.command ? `<div style="margin-top: 8px; font-size: 12px; color: var(--text-muted);">Command: <code style="color: var(--accent);">${data.command}</code></div>` : ''}
            </div>
        `;
    } catch (err) {
        container.innerHTML = `<div class="empty-state"><div class="empty-state__text">Error: ${err.message}</div></div>`;
    }
}

// ─── Sprint Memory ───

document.getElementById('memory-btn').addEventListener('click', doMemorySearch);
document.getElementById('memory-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') doMemorySearch();
});

async function doMemorySearch() {
    const query = document.getElementById('memory-input').value.trim();
    const container = document.getElementById('memory-results');
    container.innerHTML = '<div class="loading"><div class="loading__spinner"></div></div>';

    try {
        const url = query ? `${API}/sprint-memory?q=${encodeURIComponent(query)}` : `${API}/sprint-memory`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.results?.length > 0) {
            container.innerHTML = data.results.map(r => `
                <div class="memory-entry">
                    <div class="memory-entry__type">${r.type || 'decision'}</div>
                    <div class="memory-entry__text">${escapeHtml(r.text || r.content || '')}</div>
                    <div class="memory-entry__meta">${r.project || ''} • score: ${(r.score || 0).toFixed(3)}</div>
                </div>
            `).join('');
        } else if (data.stats) {
            container.innerHTML = `
                <div class="card">
                    <div class="card__header"><span class="card__title">Memory Stats</span></div>
                    <pre style="font-family: var(--mono); font-size: 12px; color: var(--text-secondary); white-space: pre-wrap;">${JSON.stringify(data.stats, null, 2)}</pre>
                </div>
            `;
        } else {
            container.innerHTML = '<div class="empty-state"><div class="empty-state__icon">🧠</div><div class="empty-state__text">No memory entries found</div></div>';
        }
    } catch (err) {
        container.innerHTML = `<div class="empty-state"><div class="empty-state__text">Error: ${err.message}</div></div>`;
    }
}

async function loadMemoryStats() {
    const container = document.getElementById('memory-results');
    if (document.getElementById('memory-input').value.trim()) return;

    container.innerHTML = '<div class="loading"><div class="loading__spinner"></div></div>';
    try {
        const res = await fetch(`${API}/sprint-memory`);
        const data = await res.json();
        if (data.stats) {
            container.innerHTML = `
                <div class="card" style="padding: 20px;">
                    <div class="card__header"><span class="card__title">Memory Stats</span></div>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
                        <div>
                            <div style="font-size: 24px; font-weight: 700; font-family: var(--mono); color: var(--accent);">${data.stats.totalEntries ?? 0}</div>
                            <div style="font-size: 12px; color: var(--text-muted);">Total Entries</div>
                        </div>
                        <div>
                            <div style="font-size: 24px; font-weight: 700; font-family: var(--mono); color: var(--success);">${data.stats.decisions ?? 0}</div>
                            <div style="font-size: 12px; color: var(--text-muted);">Decisions</div>
                        </div>
                        <div>
                            <div style="font-size: 24px; font-weight: 700; font-family: var(--mono); color: var(--warning);">${data.stats.patterns ?? 0}</div>
                            <div style="font-size: 12px; color: var(--text-muted);">Patterns</div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = '<div class="empty-state"><div class="empty-state__icon">🧠</div><div class="empty-state__text">Search sprint memory</div></div>';
        }
    } catch {
        container.innerHTML = '<div class="empty-state"><div class="empty-state__icon">🧠</div><div class="empty-state__text">Memory service unavailable</div></div>';
    }
}

// ─── Utilities ───

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ─── Init ───

loadHealth();
loadGpu();
loadCache();

// Poll health every 5s
setInterval(loadHealth, 5000);
setInterval(loadGpu, 5000);
