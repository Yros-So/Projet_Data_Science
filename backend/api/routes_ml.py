from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

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
        raise HTTPException(status_code=404, detail="Aucune recommandation pour ce produit")
    return records(result)
