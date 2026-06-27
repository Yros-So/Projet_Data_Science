from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from backend.api.data_access import records, table
from backend.api.query_filters import filter_category, filter_exact, filter_risk, filter_year, sort_frame


router = APIRouter(prefix="/products", tags=["products"])


def _product_mask(products, product_id: str):
    if "global_product_id" in products.columns:
        mask = products["global_product_id"] == product_id
        if mask.any():
            return mask
    return products["parent_asin"] == product_id


def _resolve_global_product_id(products, product_id: str) -> str:
    product = products[_product_mask(products, product_id)]
    if product.empty or "global_product_id" not in product.columns:
        return product_id
    return str(product.iloc[0]["global_product_id"])


@router.get("")
def list_products(
    limit: int = Query(default=25, ge=1, le=200),
    search: str | None = None,
    domain: str | None = None,
    category: str | None = None,
    category_id: str | None = None,
    supplier_id: str | None = None,
    supplier: str | None = None,
    sentiment: str | None = None,
    risk: str | None = None,
    year: int | None = Query(default=None, ge=2000, le=2100),
    sort_by: str = "popularite",
    sort_order: str = "desc",
):
    products = table("products").copy()
    if search:
        mask = products["title"].astype(str).str.contains(search, case=False, na=False)
        products = products[mask]
    products = filter_exact(products, "domain", domain)
    products = filter_category(products, category_id or category)
    products = filter_exact(products, "supplier_id", supplier_id)
    products = filter_exact(products, "store", supplier)
    products = filter_exact(products, "dominant_sentiment", sentiment)
    products = filter_risk(products, risk)
    products = filter_year(products, year)
    products = sort_frame(
        products,
        sort_by,
        sort_order,
        {
            "popularite": "popularity_score",
            "popularity": "popularity_score",
            "note": "avg_rating",
            "rating": "avg_rating",
            "confiance": "confidence_score",
            "confidence": "confidence_score",
            "achetable": "buyability_score",
            "buyability": "buyability_score",
            "futur": "future_purchase_score",
            "future": "future_purchase_score",
            "risque": "risk_score",
            "risk": "risk_score",
            "avis_negatifs": "negative_rate",
            "negative": "negative_rate",
        },
        "popularity_score",
    ).head(limit)
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
    product = products[_product_mask(products, product_id)]
    if product.empty:
        raise HTTPException(status_code=404, detail="Produit introuvable")

    reviews = table("reviews_sample")
    resolved_id = str(product.iloc[0].get("global_product_id", product_id))
    if "global_product_id" in reviews.columns:
        product_reviews = reviews[reviews["global_product_id"] == resolved_id].head(20)
    else:
        product_reviews = reviews[reviews["parent_asin"] == product_id].head(20)
    payload = records(product)[0]
    payload["recent_reviews"] = records(product_reviews)
    return payload


@router.get("/{product_id}/recommendations")
def product_recommendations(product_id: str, limit: int = Query(default=5, ge=1, le=20)):
    resolved_id = _resolve_global_product_id(table("products"), product_id)
    recommendations = table("recommendations")
    product_recommendations_df = recommendations[recommendations["product_id"] == resolved_id].head(limit)
    if product_recommendations_df.empty:
        raise HTTPException(status_code=404, detail="Aucune recommandation pour ce produit")
    return records(product_recommendations_df)
