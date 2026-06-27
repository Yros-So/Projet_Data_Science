from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from backend.api.data_access import records, table


router = APIRouter(prefix="/suppliers", tags=["suppliers"])


@router.get("")
def list_suppliers(limit: int = Query(default=25, ge=1, le=100)):
    suppliers = table("supplier_kpis").sort_values("supplier_score", ascending=False).head(limit)
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

    return {
        "supplier": records(supplier)[0],
        "top_products": records(top_products),
        "problematic_products": records(risky_products),
    }

