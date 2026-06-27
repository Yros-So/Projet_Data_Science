from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from backend.api.data_access import records, table
from backend.api.query_filters import filter_exact, filter_risk, sort_frame


router = APIRouter(prefix="/suppliers", tags=["suppliers"])


@router.get("")
def list_suppliers(
    limit: int = Query(default=25, ge=1, le=100),
    domain: str | None = None,
    risk: str | None = None,
    sort_by: str = "score",
    sort_order: str = "desc",
):
    suppliers = table("supplier_kpis")
    suppliers = filter_exact(suppliers, "domain", domain)
    if risk is not None and "supplier_negative_rate" in suppliers.columns:
        suppliers = suppliers.rename(columns={"supplier_negative_rate": "risk_score"})
        suppliers = filter_risk(suppliers, risk)
        suppliers = suppliers.rename(columns={"risk_score": "supplier_negative_rate"})
    suppliers = sort_frame(
        suppliers,
        sort_by,
        sort_order,
        {
            "score": "supplier_score",
            "risque": "supplier_negative_rate",
            "risk": "supplier_negative_rate",
            "note": "avg_supplier_rating",
            "rating": "avg_supplier_rating",
            "avis": "nb_reviews",
            "reviews": "nb_reviews",
        },
        "supplier_score",
    ).head(limit)
    return records(suppliers)


@router.get("/{supplier_id}")
def supplier_detail(supplier_id: str):
    suppliers = table("supplier_kpis")
    supplier = suppliers[suppliers["supplier_id"] == supplier_id]
    if supplier.empty:
        raise HTTPException(status_code=404, detail="Fournisseur introuvable")
    return records(supplier)[0]


@router.get("/{supplier_id}/dashboard")
def supplier_dashboard(supplier_id: str):
    suppliers = table("supplier_kpis")
    supplier = suppliers[suppliers["supplier_id"] == supplier_id]
    if supplier.empty:
        raise HTTPException(status_code=404, detail="Fournisseur introuvable")

    products = table("product_kpis")
    supplier_products = products[products["supplier_id"] == supplier_id]
    top_products = supplier_products.sort_values("avg_rating", ascending=False).head(5)
    risky_products = supplier_products.sort_values("risk_score", ascending=False).head(5)
    reviews = table("reviews_sample")
    supplier_product_ids = set(supplier_products["global_product_id"].dropna().astype(str))
    if "global_product_id" in reviews.columns:
        negative_reviews = reviews[
            reviews["global_product_id"].astype(str).isin(supplier_product_ids) & (reviews["sentiment"] == "negatif")
        ].head(10)
    else:
        negative_reviews = reviews.iloc[0:0]

    return {
        "supplier": records(supplier)[0],
        "top_products": records(top_products),
        "problematic_products": records(risky_products),
        "negative_reviews": records(negative_reviews),
    }


def _supplier_negative_reviews(supplier_id: str, limit: int):
    products = table("product_kpis")
    supplier_products = products[products["supplier_id"] == supplier_id]
    if supplier_products.empty:
        raise HTTPException(status_code=404, detail="Fournisseur introuvable")

    reviews = table("reviews_sample")
    supplier_product_ids = set(supplier_products["global_product_id"].dropna().astype(str))
    if "global_product_id" not in reviews.columns:
        return reviews.iloc[0:0]

    return reviews[
        reviews["global_product_id"].astype(str).isin(supplier_product_ids) & (reviews["sentiment"] == "negatif")
    ].head(limit)


@router.get("/{supplier_id}/products")
def supplier_products(supplier_id: str, limit: int = Query(default=25, ge=1, le=100)):
    products = table("product_kpis")
    supplier_products_df = products[products["supplier_id"] == supplier_id]
    if supplier_products_df.empty:
        raise HTTPException(status_code=404, detail="Fournisseur introuvable")
    supplier_products_df = supplier_products_df.sort_values("popularity_score", ascending=False).head(limit)
    return records(supplier_products_df)


@router.get("/{supplier_id}/problematic-products")
def supplier_problematic_products(supplier_id: str, limit: int = Query(default=10, ge=1, le=100)):
    products = table("product_kpis")
    supplier_products_df = products[products["supplier_id"] == supplier_id]
    if supplier_products_df.empty:
        raise HTTPException(status_code=404, detail="Fournisseur introuvable")
    risky_products = supplier_products_df.sort_values("risk_score", ascending=False).head(limit)
    return records(risky_products)


@router.get("/{supplier_id}/negative-reviews")
def supplier_negative_reviews(supplier_id: str, limit: int = Query(default=10, ge=1, le=100)):
    return records(_supplier_negative_reviews(supplier_id, limit))
