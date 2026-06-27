from __future__ import annotations

from fastapi import APIRouter

from backend.api.schemas import SentimentRequest, SentimentResponse
from backend.ml.train_sentiment_model import predict_sentiment


router = APIRouter(prefix="/ml", tags=["machine-learning"])


@router.post("/sentiment/predict", response_model=SentimentResponse)
def sentiment_predict(payload: SentimentRequest):
    return predict_sentiment(payload.text)

