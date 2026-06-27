from __future__ import annotations

from fastapi import APIRouter, Query

from backend.api.data_access import global_kpis, records, table


router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/dashboard")
def admin_dashboard():
    sentiment_stats = table("sentiment_stats")
    product_kpis = table("product_kpis")
    supplier_kpis = table("supplier_kpis")
    categories = table("category_kpis").sort_values("risk_score", ascending=False)

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


@router.get("/global-kpis")
def admin_global_kpis():
    return global_kpis()


@router.get("/problematic-products")
def admin_problematic_products(limit: int = Query(default=25, ge=1, le=100)):
    return records(table("product_kpis").sort_values("risk_score", ascending=False).head(limit))


@router.get("/risky-suppliers")
def admin_risky_suppliers(limit: int = Query(default=25, ge=1, le=100)):
    suppliers = table("supplier_kpis")
    suppliers = suppliers.sort_values(["nb_problematic_products", "supplier_negative_rate"], ascending=[False, False])
    return records(suppliers.head(limit))


@router.get("/suppliers-risk")
def admin_suppliers_risk(limit: int = Query(default=25, ge=1, le=100)):
    return admin_risky_suppliers(limit)


@router.get("/category-comparison")
def admin_category_comparison(limit: int = Query(default=50, ge=1, le=200)):
    return records(table("category_kpis").sort_values("category_score", ascending=False).head(limit))


@router.get("/categories-risk")
def admin_categories_risk(limit: int = Query(default=50, ge=1, le=200)):
    return records(table("category_kpis").sort_values("risk_score", ascending=False).head(limit))


@router.get("/categories/performance")
def categories_performance():
    return records(table("category_kpis").sort_values("risk_score", ascending=False))
