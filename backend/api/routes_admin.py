from __future__ import annotations

from fastapi import APIRouter, Query

from backend.api.data_access import global_kpis, records, table
from backend.api.query_filters import filter_exact, filter_risk


router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/dashboard")
def admin_dashboard(domain: str | None = None, risk: str | None = None):
    sentiment_stats = table("sentiment_stats")
    product_kpis = table("product_kpis")
    supplier_kpis = table("supplier_kpis")
    categories = table("category_kpis")

    product_kpis = filter_exact(product_kpis, "domain", domain)
    supplier_kpis = filter_exact(supplier_kpis, "domain", domain)
    categories = filter_exact(categories, "domain", domain)
    product_kpis = filter_risk(product_kpis, risk)
    categories = filter_risk(categories, risk)
    categories = categories.sort_values("risk_score", ascending=False)

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
def admin_problematic_products(
    limit: int = Query(default=25, ge=1, le=100),
    domain: str | None = None,
    risk: str | None = None,
):
    products = table("product_kpis")
    products = filter_exact(products, "domain", domain)
    products = filter_risk(products, risk)
    return records(products.sort_values("risk_score", ascending=False).head(limit))


@router.get("/risky-suppliers")
def admin_risky_suppliers(
    limit: int = Query(default=25, ge=1, le=100),
    domain: str | None = None,
    risk: str | None = None,
):
    suppliers = table("supplier_kpis")
    suppliers = filter_exact(suppliers, "domain", domain)
    if risk is not None and "supplier_negative_rate" in suppliers.columns:
        suppliers = suppliers.rename(columns={"supplier_negative_rate": "risk_score"})
        suppliers = filter_risk(suppliers, risk)
        suppliers = suppliers.rename(columns={"risk_score": "supplier_negative_rate"})
    suppliers = suppliers.sort_values(["nb_problematic_products", "supplier_negative_rate"], ascending=[False, False])
    return records(suppliers.head(limit))


@router.get("/suppliers-risk")
def admin_suppliers_risk(
    limit: int = Query(default=25, ge=1, le=100),
    domain: str | None = None,
    risk: str | None = None,
):
    return admin_risky_suppliers(limit, domain, risk)


@router.get("/category-comparison")
def admin_category_comparison(limit: int = Query(default=50, ge=1, le=200)):
    return records(table("category_kpis").sort_values("category_score", ascending=False).head(limit))


@router.get("/categories-risk")
def admin_categories_risk(
    limit: int = Query(default=50, ge=1, le=200),
    domain: str | None = None,
    risk: str | None = None,
):
    categories = table("category_kpis")
    categories = filter_exact(categories, "domain", domain)
    categories = filter_risk(categories, risk)
    return records(categories.sort_values("risk_score", ascending=False).head(limit))


@router.get("/categories/performance")
def categories_performance(domain: str | None = None, risk: str | None = None):
    categories = table("category_kpis")
    categories = filter_exact(categories, "domain", domain)
    categories = filter_risk(categories, risk)
    return records(categories.sort_values("risk_score", ascending=False))
