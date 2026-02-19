"""
FajarClaw RAG — Qwen3-Reranker Server
@ref FC-PRD-01 §10.7 (Cross-Encoder Reranking)

FastAPI server for Qwen3-Reranker-0.6B cross-encoder model.
Accepts query + candidates, returns reranked results with scores.
"""

import os
import time
import logging
from typing import Optional

import uvicorn
from fastapi import FastAPI
from pydantic import BaseModel, Field

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="FajarClaw Reranker", version="1.0.0")

# === Config ===

MODEL_NAME = os.environ.get("RERANKER_MODEL", "Qwen/Qwen3-Reranker-0.6B")
HOST = os.environ.get("RERANKER_HOST", "0.0.0.0")
PORT = int(os.environ.get("RERANKER_PORT", "8101"))
USE_GPU = os.environ.get("RERANKER_USE_GPU", "true").lower() == "true"

# === Model ===

model = None
tokenizer = None
device = "cpu"


def load_model():
    """Load reranker model (lazy, on first request or startup)."""
    global model, tokenizer, device
    import torch
    from transformers import AutoModelForSequenceClassification, AutoTokenizer

    if USE_GPU and torch.cuda.is_available():
        device = "cuda"
    else:
        device = "cpu"

    logging.info(f"Loading model: {MODEL_NAME} on {device}")
    start = time.time()

    tokenizer = AutoTokenizer.from_pretrained(
        MODEL_NAME,
        trust_remote_code=True,
        padding_side="left",
    )
    # Set pad_token if missing (required for batch inference)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
        tokenizer.pad_token_id = tokenizer.eos_token_id

    model = AutoModelForSequenceClassification.from_pretrained(
        MODEL_NAME,
        trust_remote_code=True,
        dtype=torch.float16 if device == "cuda" else torch.float32,
    )
    # Set pad_token_id on model config
    if model.config.pad_token_id is None:
        model.config.pad_token_id = tokenizer.pad_token_id
    model = model.to(device)
    model.eval()

    elapsed = time.time() - start
    logging.info(f"Model loaded in {elapsed:.1f}s on {device}")


# === Request/Response ===

class Candidate(BaseModel):
    text: str
    id: Optional[str] = None
    metadata: Optional[dict] = None


class RerankRequest(BaseModel):
    query: str
    candidates: list[Candidate] = Field(..., max_length=100)
    top_k: int = Field(default=5, ge=1, le=100)


class RankedResult(BaseModel):
    text: str
    score: float
    original_index: int
    id: Optional[str] = None
    metadata: Optional[dict] = None


class RerankResponse(BaseModel):
    ranked: list[RankedResult]
    query: str
    model: str
    duration_ms: float


class HealthResponse(BaseModel):
    ready: bool
    model: str
    device: str
    status: str


# === Endpoints ===

@app.post("/rerank", response_model=RerankResponse)
async def rerank(req: RerankRequest):
    """Rerank candidates using cross-encoder scoring."""
    import torch

    if model is None:
        load_model()

    start = time.time()

    # Format pairs for cross-encoder
    prefix = "Instruct: Given a web search query, retrieve relevant passages that answer the query\nQuery: "
    pairs = []
    for candidate in req.candidates:
        pairs.append([prefix + req.query, candidate.text])

    # Score each pair individually to avoid batch padding issues
    scores = []
    with torch.no_grad():
        for pair in pairs:
            inputs = tokenizer(
                [pair],
                padding=True,
                truncation=True,
                max_length=512,
                return_tensors="pt",
            ).to(device)
            outputs = model(**inputs)
            logits = outputs.logits
            logging.debug(f"Logits shape: {logits.shape}, values: {logits}")
            # Flatten and take first value as relevance score
            flat = logits.flatten().cpu().float()
            score_val = flat[0].item()
            scores.append(score_val)

    # Build ranked results
    indexed_scores = [(i, s) for i, s in enumerate(scores)]
    indexed_scores.sort(key=lambda x: x[1], reverse=True)

    ranked = []
    for rank, (idx, score) in enumerate(indexed_scores[:req.top_k]):
        candidate = req.candidates[idx]
        ranked.append(RankedResult(
            text=candidate.text,
            score=float(score),
            original_index=idx,
            id=candidate.id,
            metadata=candidate.metadata,
        ))

    duration_ms = (time.time() - start) * 1000

    return RerankResponse(
        ranked=ranked,
        query=req.query,
        model=MODEL_NAME,
        duration_ms=round(duration_ms, 1),
    )


@app.get("/health", response_model=HealthResponse)
async def health():
    """Health check endpoint."""
    ready = model is not None
    return HealthResponse(
        ready=ready,
        model=MODEL_NAME,
        device=device,
        status="ready" if ready else "model_not_loaded",
    )


@app.on_event("startup")
async def startup():
    """Load model on startup."""
    logging.info(f"Starting reranker server on {HOST}:{PORT}")
    logging.info(f"Model: {MODEL_NAME}, GPU: {USE_GPU}")
    load_model()


if __name__ == "__main__":
    uvicorn.run(
        "reranker_server:app",
        host=HOST,
        port=PORT,
        workers=1,
        log_level="info",
    )
