from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from backend.api.data_access import records, table


router = APIRouter(prefix="/products", tags=["products"])


@router.get("")
def list_products(limit: int = Query(default=25, ge=1, le=200), search: str | None = None):
    products = table("products").copy()
    if search:
        mask = products["title"].astype(str).str.contains(search, case=False, na=False)
        products = products[mask]
    products = products.sort_values(["popularity_score", "avg_rating"], ascending=[False, False]).head(limit)
    return records(products)


@router.get("/popular")
def popular_products(limit: int = Query(default=10, ge=1, le=100)):
    product_kpis = table("product_kpis").sort_values("popularity_score", ascending=False).head(limit)
    return records(product_kpis)


@router.get("/problematic")
def problematic_products(limit: int = Query(default=10, ge=1, le=100)):
    problematic = table("problematic_products").sort_values("risk_score", ascending=False).head(limit)
    return records(problematic)


@router.get("/{product_id}")
def product_detail(product_id: str):
    products = table("products")
    product = products[products["parent_asin"] == product_id]
    if product.empty:
        raise HTTPException(status_code=404, detail="Produit introuvable")

    reviews = table("reviews_sample")
    product_reviews = reviews[reviews["parent_asin"] == product_id].head(20)
    payload = records(product)[0]
    payload["recent_reviews"] = records(product_reviews)
    return payload


@router.get("/{product_id}/recommendations")
def product_recommendations(product_id: str, limit: int = Query(default=5, ge=1, le=20)):
    recommendations = table("recommendations")
    product_recommendations_df = recommendations[recommendations["product_id"] == product_id].head(limit)
    if product_recommendations_df.empty:
        raise HTTPException(status_code=404, detail="Aucune recommandation pour ce produit")
    return records(product_recommendations_df)

