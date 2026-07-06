from __future__ import annotations

from fastapi import APIRouter, Query

from backend.api.data_access import records, table
from backend.api.schemas import SentimentRequest, SentimentResponse
from backend.ml.train_sentiment_model import predict_sentiment


router = APIRouter(prefix="/ml", tags=["machine-learning"])


@router.post("/sentiment/predict", response_model=SentimentResponse)
def sentiment_predict(payload: SentimentRequest):
    return predict_sentiment(payload.text)


@router.get("/recommendations/{global_product_id}")
def ml_recommendations(global_product_id: str, limit: int = Query(default=5, ge=1, le=20)):
    recommendations = table("recommendations")
    result = recommendations[recommendations["product_id"] == global_product_id].head(limit)
    if result.empty:
        domain = global_product_id.split("_", 1)[0] if "_" in global_product_id else None
        if domain and "domain" in recommendations.columns:
            result = recommendations[recommendations["domain"] == domain].head(limit)
        if result.empty:
            result = recommendations.head(limit)
    return records(result)
