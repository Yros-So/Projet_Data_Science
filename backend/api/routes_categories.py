from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from backend.api.data_access import records, table
from backend.api.query_filters import filter_exact, filter_risk, sort_frame


router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("")
def list_categories(
    limit: int = Query(default=50, ge=1, le=200),
    domain: str | None = None,
    risk: str | None = None,
    sort_by: str = "score",
    sort_order: str = "desc",
):
    categories = table("category_kpis")
    categories = filter_exact(categories, "domain", domain)
    categories = filter_risk(categories, risk)
    categories = sort_frame(
        categories,
        sort_by,
        sort_order,
        {
            "score": "category_score",
            "risque": "risk_score",
            "risk": "risk_score",
            "note": "avg_rating",
            "rating": "avg_rating",
            "avis": "nb_reviews",
            "reviews": "nb_reviews",
        },
        "category_score",
    ).head(limit)
    return records(categories)


@router.get("/performance")
def category_performance(
    limit: int = Query(default=50, ge=1, le=200),
    domain: str | None = None,
    risk: str | None = None,
):
    categories = table("category_kpis")
    categories = filter_exact(categories, "domain", domain)
    categories = filter_risk(categories, risk)
    categories = categories.sort_values(["risk_score", "nb_reviews"], ascending=[False, False]).head(limit)
    return records(categories)


@router.get("/{category_id}/products")
def category_products(category_id: str, limit: int = Query(default=25, ge=1, le=100)):
    products = table("products")
    category_products_df = products[products["category_id"] == category_id]
    if category_products_df.empty:
        raise HTTPException(status_code=404, detail="Categorie introuvable")
    category_products_df = category_products_df.sort_values(
        ["buyability_score", "popularity_score"],
        ascending=[False, False],
    ).head(limit)
    return records(category_products_df)
