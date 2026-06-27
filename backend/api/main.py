from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.data_access import clear_cache, data_source_status, ensure_gold_data
from backend.api.routes_admin import router as admin_router
from backend.api.routes_categories import router as categories_router
from backend.api.routes_filters import router as filters_router
from backend.api.routes_ml import router as ml_router
from backend.api.routes_products import router as products_router
from backend.api.routes_recommendations import router as recommendations_router
from backend.api.routes_sentiment import router as sentiment_router
from backend.api.routes_suppliers import router as suppliers_router
from backend.etl.etl_spark import run_etl
from backend.ml.recommendation import build_recommendations
from backend.ml.train_sentiment_model import train_sentiment_model


@asynccontextmanager
async def lifespan(_app: FastAPI):
    ensure_gold_data()
    yield


app = FastAPI(
    title="Projet Data Science - E-commerce Reviews",
    description="API multi-categories pour l'analyse des avis Amazon Reviews, les KPIs, le sentiment et la recommandation.",
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
app.include_router(categories_router)
app.include_router(filters_router)
app.include_router(suppliers_router)
app.include_router(admin_router)
app.include_router(ml_router)
app.include_router(recommendations_router)
app.include_router(sentiment_router)

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
    return {"status": "ok", "data_source": data_source_status()}


@app.post("/pipeline/run")
def run_pipeline_endpoint():
    result = run_etl()
    recommendations = build_recommendations()
    metrics = train_sentiment_model()
    clear_cache()
    return {
        **result,
        "recommendations": int(len(recommendations)),
        "model": {
            "best_model": metrics["best_model"],
            "accuracy": metrics["accuracy"],
            "classes": metrics["classes"],
        },
    }
