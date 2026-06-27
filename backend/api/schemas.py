from pydantic import BaseModel, Field


class SentimentRequest(BaseModel):
    text: str = Field(..., min_length=2, examples=["Produit de mauvaise qualite, taille trop petite."])


class SentimentResponse(BaseModel):
    text: str
    sentiment: str
    confidence: float | None = None

