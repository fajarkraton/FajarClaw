"""
FajarClaw RAG — BGE-M3 Embedding Server
@ref FC-PRD-01 §10.3 (Embedding Pipeline)

FastAPI server yang melayani BGE-M3 embedding:
- Dense vectors (1024d)
- Sparse vectors (lexical weights)

Start: cd /path/to/FajarClaw && source .venv/bin/activate && python python/embedding_server.py
"""

import os
import time
import logging
from typing import Optional
from contextlib import asynccontextmanager

import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

# === Config ===

MODEL_NAME = os.environ.get("EMBEDDING_MODEL", "BAAI/bge-m3")
HOST = os.environ.get("EMBEDDING_HOST", "0.0.0.0")
PORT = int(os.environ.get("EMBEDDING_PORT", "8100"))
USE_GPU = os.environ.get("EMBEDDING_USE_GPU", "true").lower() == "true"

# === Models (Pydantic) ===

class EmbedRequest(BaseModel):
    """Request untuk embedding satu atau banyak text"""
    texts: list[str]
    return_sparse: bool = True

class EmbedResult(BaseModel):
    """Hasil embedding per text"""
    dense: list[float]
    sparse: Optional[dict[int, float]] = None

class EmbedResponse(BaseModel):
    """Response dari embedding endpoint"""
    results: list[EmbedResult]
    model: str
    duration_ms: float

class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    model: str
    device: str
    ready: bool

# === Global Model ===

_model = None
_device = "cpu"

def load_model():
    """Load BGE-M3 model (lazy, sekali saja)"""
    global _model, _device
    
    if _model is not None:
        return _model
    
    logging.info(f"Loading model: {MODEL_NAME}")
    start = time.time()
    
    try:
        from FlagEmbedding import BGEM3FlagModel
        _model = BGEM3FlagModel(
            MODEL_NAME,
            use_fp16=USE_GPU,
            device="cuda" if USE_GPU else "cpu",
        )
        _device = "cuda" if USE_GPU else "cpu"
    except Exception as e:
        logging.warning(f"GPU load failed ({e}), falling back to CPU")
        from FlagEmbedding import BGEM3FlagModel
        _model = BGEM3FlagModel(MODEL_NAME, use_fp16=False, device="cpu")
        _device = "cpu"
    
    elapsed = time.time() - start
    logging.info(f"Model loaded in {elapsed:.1f}s on {_device}")
    return _model

# === FastAPI App ===

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Preload model on startup"""
    load_model()
    yield

app = FastAPI(
    title="FajarClaw Embedding Server",
    description="BGE-M3 dense + sparse embeddings for RAG pipeline",
    version="1.0.0",
    lifespan=lifespan,
)

@app.get("/health", response_model=HealthResponse)
async def health():
    """Health check endpoint"""
    return HealthResponse(
        status="ok" if _model else "loading",
        model=MODEL_NAME,
        device=_device,
        ready=_model is not None,
    )

@app.post("/embed", response_model=EmbedResponse)
async def embed(request: EmbedRequest):
    """
    Generate embeddings for input texts.
    Returns dense (1024d) and optionally sparse vectors.
    """
    model = load_model()
    
    if not request.texts:
        raise HTTPException(400, "texts cannot be empty")
    
    if len(request.texts) > 256:
        raise HTTPException(400, "max 256 texts per request")
    
    start = time.time()
    
    try:
        output = model.encode(
            request.texts,
            return_dense=True,
            return_sparse=request.return_sparse,
            return_colbert_vecs=False,
        )
    except Exception as e:
        raise HTTPException(500, f"Encoding failed: {str(e)}")
    
    results = []
    for i in range(len(request.texts)):
        dense = output["dense_vecs"][i].tolist()
        
        sparse = None
        if request.return_sparse and "lexical_weights" in output:
            raw_sparse = output["lexical_weights"][i]
            # Convert to {token_id: weight} dict
            if hasattr(raw_sparse, 'items'):
                sparse = {int(k): float(v) for k, v in raw_sparse.items()}
            elif isinstance(raw_sparse, np.ndarray):
                nonzero = np.nonzero(raw_sparse)[0]
                sparse = {int(idx): float(raw_sparse[idx]) for idx in nonzero}
            else:
                sparse = {}
        
        results.append(EmbedResult(dense=dense, sparse=sparse))
    
    duration = (time.time() - start) * 1000
    
    return EmbedResponse(
        results=results,
        model=MODEL_NAME,
        duration_ms=round(duration, 2),
    )

# === Entrypoint ===

if __name__ == "__main__":
    import uvicorn
    
    logging.basicConfig(level=logging.INFO)
    logging.info(f"Starting embedding server on {HOST}:{PORT}")
    logging.info(f"Model: {MODEL_NAME}, GPU: {USE_GPU}")
    
    uvicorn.run(app, host=HOST, port=PORT, log_level="info")
