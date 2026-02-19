# Visual Embedding Server Setup

> @ref FC-PRD-01 §10.13 (Visual RAG) + FC-BP-01 §8.2 (Qwen3-VL)

## Quick Start (Mock Mode)

FajarClaw's visual RAG works immediately in **mock mode** — no model download needed:

```typescript
import { embedImage, isMockMode } from './visual-embedder.js';

console.log(isMockMode()); // true (default)
const result = await embedImage('/path/to/screenshot.png');
// result.dense = 2048-dim deterministic vector
```

## Real Model Setup

### 1. Download Qwen3-VL-Embedding-2B (~4.5GB)

```bash
# Requires ~4.5GB VRAM
pip install transformers torch accelerate
huggingface-cli download Qwen/Qwen3-VL-Embedding-2B --local-dir models/qwen3-vl-embed
```

### 2. Start Visual Embedding Server

```bash
# Start server (see scripts/visual-embed-server.py)
cd /home/primecore/Documents/FajarClaw
source .venv/bin/activate
CUDA_VISIBLE_DEVICES=0 python scripts/visual-embed-server.py --port 8002
```

### 3. Connect FajarClaw

```typescript
import { setMockMode, setVisualServerUrl, embedImage } from './visual-embedder.js';

setMockMode(false);
setVisualServerUrl('http://localhost:8002');

const result = await embedImage('/path/to/screenshot.png');
// result.dense = real 2048-dim Qwen3-VL vector
// result.isMock = false
```

### 4. Verify

```typescript
import { isVisualServerReady, getVisualHealth } from './visual-embedder.js';

console.log(await isVisualServerReady()); // true
console.log(await getVisualHealth());     // { status: 'healthy', model: 'Qwen3-VL-Embedding-2B', gpu: true, dimension: 2048 }
```

## VRAM Budget

| Model | VRAM | Notes |
|-------|------|-------|
| BGE-M3 (text) | ~1.2GB | Always loaded |
| Qwen3-Reranker-0.6B | ~1.5GB | Always loaded |
| Qwen3-VL-Embedding-2B | ~4.5GB | On-demand |
| **Total** | **~7.2GB** | Fits in RTX 4090 16GB |

## Environment Variables

```bash
VISUAL_EMBED_URL=http://localhost:8002  # Visual embedding server
```
