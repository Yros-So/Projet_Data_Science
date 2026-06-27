from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from backend.api.data_access import records, table


router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.get("/{global_product_id}")
def recommendations_for_product(global_product_id: str, limit: int = Query(default=5, ge=1, le=20)):
    recommendations = table("recommendations")
    result = recommendations[recommendations["product_id"] == global_product_id].head(limit)
    if result.empty:
        raise HTTPException(status_code=404, detail="Aucune recommandation pour ce produit")
    return records(result)
