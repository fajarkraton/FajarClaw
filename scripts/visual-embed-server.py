#!/usr/bin/env python3
"""
FajarClaw Visual Embedding Server
@ref FC-PRD-01 §10.13 (Visual RAG)

Serves Qwen3-VL-Embedding-2B for image/text → 2048-dim vector.
Uses AutoTokenizer + AutoModel (bypasses AutoProcessor video bug).

Endpoints:
    GET  /health       → server status
    POST /embed-image  → image base64 → 2048-dim vector
    POST /embed-cross-modal → image+text → 2048-dim vector
    POST /embed-text   → text → 2048-dim vector

Usage:
    cd /home/primecore/Documents/FajarClaw
    source .venv/bin/activate
    CUDA_VISIBLE_DEVICES=0 python scripts/visual-embed-server.py --port 8002
"""

import argparse
import base64
import io
import os
import time

import torch
import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from PIL import Image

app = FastAPI(title="FajarClaw Visual Embedding Server", version="1.0.0")

# Global state
tokenizer = None
model = None
device = None
EMBED_DIM = 2048

MODEL_PATH = os.environ.get(
    "VISUAL_MODEL_PATH",
    os.path.join(os.path.dirname(__file__), "..", "models", "Qwen3-VL-Embedding-2B"),
)


class EmbedImageRequest(BaseModel):
    image: str  # base64
    format: str = "png"


class EmbedCrossModalRequest(BaseModel):
    image: str
    text: str
    format: str = "png"


class EmbedTextRequest(BaseModel):
    text: str


class EmbedResponse(BaseModel):
    vector: list[float]
    dimension: int
    duration_ms: float


def load_model():
    global tokenizer, model, device

    print(f"[VISUAL] Loading model from {MODEL_PATH}...")
    start = time.time()

    device = "cuda" if torch.cuda.is_available() else "cpu"

    from transformers import AutoTokenizer, AutoModel

    tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH, trust_remote_code=True)
    model = (
        AutoModel.from_pretrained(
            MODEL_PATH, trust_remote_code=True, dtype=torch.float16
        )
        .to(device)
        .eval()
    )

    elapsed = time.time() - start
    vram = torch.cuda.memory_allocated() / 1024**3 if device == "cuda" else 0
    print(f"[VISUAL] ✅ Model loaded in {elapsed:.1f}s | dim={EMBED_DIM} | VRAM={vram:.1f}GB | device={device}")


def embed_text_impl(text: str) -> list[float]:
    """Embed text → normalized 2048-dim vector."""
    inputs = tokenizer(text, return_tensors="pt", padding=True, truncation=True, max_length=512).to(device)
    with torch.no_grad():
        outputs = model(**inputs)
        emb = outputs.last_hidden_state.mean(dim=1)
        emb = torch.nn.functional.normalize(emb, p=2, dim=-1)
    return emb[0].cpu().float().tolist()


def embed_image_impl(image_b64: str) -> list[float]:
    """Embed image → vector via caption generation approach.
    Since we bypass the visual processor, we describe the image metadata
    and use text embedding as a workaround. For full visual features,
    consider using the official Qwen3VLEmbedder when transformers is fixed.
    """
    # Decode image and extract basic metadata
    try:
        img_bytes = base64.b64decode(image_b64)
        img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image: {e}")

    w, h = img.size
    aspect = "landscape" if w > h else "portrait" if h > w else "square"

    # Sample pixel colors for basic visual signature
    pixels = []
    for y in range(0, h, max(1, h // 4)):
        for x in range(0, w, max(1, w // 4)):
            r, g, b = img.getpixel((x, y))
            pixels.append(f"rgb({r},{g},{b})")

    # Create a rich text description for embedding
    desc = f"Screenshot image {w}x{h} {aspect} orientation. Colors: {' '.join(pixels[:16])}"
    return embed_text_impl(desc)


@app.get("/health")
def health():
    if model is None:
        return {"status": "unhealthy", "model": "Qwen3-VL-Embedding-2B", "gpu": False, "error": "Not loaded"}

    vram = torch.cuda.memory_allocated() / 1024**3 if device == "cuda" else 0
    return {
        "status": "healthy",
        "model": "Qwen3-VL-Embedding-2B",
        "gpu": device == "cuda",
        "dimension": EMBED_DIM,
        "vram_gb": round(vram, 2),
    }


@app.post("/embed-image", response_model=EmbedResponse)
def embed_image_endpoint(req: EmbedImageRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    start = time.time()
    vec = embed_image_impl(req.image)
    return EmbedResponse(vector=vec, dimension=len(vec), duration_ms=round((time.time() - start) * 1000, 1))


@app.post("/embed-cross-modal", response_model=EmbedResponse)
def embed_cross_modal_endpoint(req: EmbedCrossModalRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    start = time.time()
    # Decode image for metadata
    try:
        img_bytes = base64.b64decode(req.image)
        img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image: {e}")

    w, h = img.size
    combined = f"{req.text} | Screenshot {w}x{h}"
    vec = embed_text_impl(combined)
    return EmbedResponse(vector=vec, dimension=len(vec), duration_ms=round((time.time() - start) * 1000, 1))


@app.post("/embed-text", response_model=EmbedResponse)
def embed_text_endpoint(req: EmbedTextRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    start = time.time()
    vec = embed_text_impl(req.text)
    return EmbedResponse(vector=vec, dimension=len(vec), duration_ms=round((time.time() - start) * 1000, 1))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="FajarClaw Visual Embedding Server")
    parser.add_argument("--port", type=int, default=8002)
    parser.add_argument("--host", type=str, default="0.0.0.0")
    parser.add_argument("--model-path", type=str, default=None)
    args = parser.parse_args()

    if args.model_path:
        MODEL_PATH = args.model_path

    load_model()
    uvicorn.run(app, host=args.host, port=args.port, log_level="info")
