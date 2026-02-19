#!/usr/bin/env python3
"""
FajarClaw Visual Embedding Server
@ref FC-PRD-01 §10.13 (Visual RAG)

Serves Qwen3-VL-Embedding-2B for real image/text → 2048-dim vector.
Uses AutoProcessor + AutoModel with patched transformers.

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

app = FastAPI(title="FajarClaw Visual Embedding Server", version="2.0.0")

# Global state
processor = None
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
    global processor, model, device

    print(f"[VISUAL] Loading model from {MODEL_PATH}...")
    start = time.time()
    device = "cuda" if torch.cuda.is_available() else "cpu"

    from transformers import AutoProcessor, AutoModel

    processor = AutoProcessor.from_pretrained(MODEL_PATH, trust_remote_code=True)
    model = AutoModel.from_pretrained(
        MODEL_PATH, trust_remote_code=True, dtype=torch.float16
    ).to(device).eval()

    elapsed = time.time() - start
    vram = torch.cuda.memory_allocated() / 1024**3 if device == "cuda" else 0
    print(f"[VISUAL] ✅ Model loaded in {elapsed:.1f}s | dim={EMBED_DIM} | VRAM={vram:.1f}GB")


def get_embedding(inputs) -> list[float]:
    """Forward pass → normalized embedding."""
    with torch.no_grad():
        out = model(**inputs)
        emb = out.last_hidden_state.mean(dim=1)
        emb = torch.nn.functional.normalize(emb, p=2, dim=-1)
    return emb[0].cpu().float().tolist()


def decode_b64_image(image_b64: str) -> Image.Image:
    try:
        return Image.open(io.BytesIO(base64.b64decode(image_b64))).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image: {e}")


@app.get("/health")
def health():
    if model is None:
        return {"status": "unhealthy", "model": "Qwen3-VL-Embedding-2B", "gpu": False}
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
    """Embed image → 2048-dim vector (REAL visual pipeline)."""
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    start = time.time()

    img = decode_b64_image(req.image)
    messages = [{"role": "user", "content": [
        {"type": "image", "image": img},
        {"type": "text", "text": "Describe this screenshot."},
    ]}]
    text_input = processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = processor(text=text_input, images=[img], return_tensors="pt", padding=True)
    inputs = {k: v.to(device) for k, v in inputs.items()}

    vec = get_embedding(inputs)
    return EmbedResponse(vector=vec, dimension=len(vec), duration_ms=round((time.time() - start) * 1000, 1))


@app.post("/embed-cross-modal", response_model=EmbedResponse)
def embed_cross_modal_endpoint(req: EmbedCrossModalRequest):
    """Embed image + text → 2048-dim vector."""
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    start = time.time()

    img = decode_b64_image(req.image)
    messages = [{"role": "user", "content": [
        {"type": "image", "image": img},
        {"type": "text", "text": req.text},
    ]}]
    text_input = processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = processor(text=text_input, images=[img], return_tensors="pt", padding=True)
    inputs = {k: v.to(device) for k, v in inputs.items()}

    vec = get_embedding(inputs)
    return EmbedResponse(vector=vec, dimension=len(vec), duration_ms=round((time.time() - start) * 1000, 1))


@app.post("/embed-text", response_model=EmbedResponse)
def embed_text_endpoint(req: EmbedTextRequest):
    """Embed text for visual search → 2048-dim vector."""
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    start = time.time()

    messages = [{"role": "user", "content": [{"type": "text", "text": req.text}]}]
    text_input = processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = processor(text=text_input, return_tensors="pt", padding=True)
    inputs = {k: v.to(device) for k, v in inputs.items()}

    vec = get_embedding(inputs)
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
