from __future__ import annotations

from fastapi import APIRouter

from backend.api.data_access import table


router = APIRouter(prefix="/filters", tags=["filters"])


def _unique_values(dataframe, column: str) -> list:
    if column not in dataframe.columns:
        return []
    values = dataframe[column].dropna().astype(str).unique().tolist()
    return sorted(values)


@router.get("/options")
def filter_options():
    products = table("products")
    product_kpis = table("product_kpis")

    years = set()
    if {"min_review_year", "max_review_year"}.issubset(product_kpis.columns):
        for _, row in product_kpis[["min_review_year", "max_review_year"]].dropna().iterrows():
            years.update(range(int(row["min_review_year"]), int(row["max_review_year"]) + 1))

    return {
        "domains": _unique_values(products, "domain"),
        "categories": _unique_values(products, "main_category"),
        "category_ids": _unique_values(products, "category_id"),
        "suppliers": _unique_values(products, "store"),
        "supplier_ids": _unique_values(products, "supplier_id"),
        "sentiments": ["positif", "neutre", "negatif"],
        "risk_levels": ["faible", "moyen", "eleve"],
        "years": sorted(years),
        "sorts": ["popularite", "note", "confiance", "achetable", "futur", "risque"],
    }
