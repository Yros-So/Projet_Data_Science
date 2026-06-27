from __future__ import annotations

from fastapi import APIRouter, Query

from backend.api.data_access import global_kpis, records, table


router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/dashboard")
def admin_dashboard():
    sentiment_stats = table("sentiment_stats")
    product_kpis = table("product_kpis")
    supplier_kpis = table("supplier_kpis")
    categories = (
        product_kpis.groupby("main_category")
        .agg(
            nb_products=("parent_asin", "nunique"),
            avg_rating=("avg_rating", "mean"),
            negative_rate=("negative_rate", "mean"),
        )
        .reset_index()
        .sort_values("negative_rate", ascending=False)
    )

    return {
        "global_kpis": global_kpis(),
        "sentiment_stats": records(sentiment_stats),
        "top_products": records(product_kpis.sort_values("popularity_score", ascending=False).head(8)),
        "problematic_products": records(product_kpis.sort_values("risk_score", ascending=False).head(8)),
        "supplier_ranking": records(supplier_kpis.sort_values("supplier_score", ascending=False).head(8)),
        "categories": records(categories),
    }


@router.get("/suppliers/ranking")
def suppliers_ranking(limit: int = Query(default=10, ge=1, le=100)):
    return records(table("supplier_kpis").sort_values("supplier_score", ascending=False).head(limit))


@router.get("/categories/performance")
def categories_performance():
    product_kpis = table("product_kpis")
    categories = (
        product_kpis.groupby("main_category")
        .agg(
            nb_products=("parent_asin", "nunique"),
            nb_reviews=("nb_reviews", "sum"),
            avg_rating=("avg_rating", "mean"),
            negative_rate=("negative_rate", "mean"),
            risk_score=("risk_score", "mean"),
        )
        .reset_index()
        .sort_values("risk_score", ascending=False)
    )
    return records(categories)

