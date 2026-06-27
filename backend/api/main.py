from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.data_access import clear_cache, ensure_gold_data
from backend.api.routes_admin import router as admin_router
from backend.api.routes_ml import router as ml_router
from backend.api.routes_products import router as products_router
from backend.api.routes_suppliers import router as suppliers_router
from backend.etl.etl_spark import run_etl
from backend.ml.recommendation import build_recommendations


@asynccontextmanager
async def lifespan(_app: FastAPI):
    ensure_gold_data()
    yield


app = FastAPI(
    title="Projet Data Science - E-commerce Reviews",
    description="API pour l'analyse des avis Amazon_Fashion, les KPIs, le sentiment et la recommandation.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products_router)
app.include_router(suppliers_router)
app.include_router(admin_router)
app.include_router(ml_router)

@app.get("/")
def root():
    return {
        "message": "API Projet Data Science e-commerce",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
def health():
    ensure_gold_data()
    return {"status": "ok"}


@app.post("/pipeline/run")
def run_pipeline_endpoint():
    result = run_etl()
    build_recommendations()
    clear_cache()
    return result
