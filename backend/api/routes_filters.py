from __future__ import annotations

import pandas as pd
from fastapi import APIRouter

from backend.api.data_access import table


router = APIRouter(prefix="/filters", tags=["filters"])


def _unique_values(dataframe, column: str, limit: int = 500) -> list:
    if column not in dataframe.columns:
        return []
    values = dataframe[column].dropna().astype(str).value_counts().head(limit).index.tolist()
    return sorted(values)


@router.get("/options")
def filter_options():
    product_kpis = table("product_kpis")

    years = []
    if {"min_review_year", "max_review_year"}.issubset(product_kpis.columns):
        min_year = pd.to_numeric(product_kpis["min_review_year"], errors="coerce").dropna()
        max_year = pd.to_numeric(product_kpis["max_review_year"], errors="coerce").dropna()
        if not min_year.empty and not max_year.empty:
            years = list(range(int(min_year.min()), int(max_year.max()) + 1))

    return {
        "domains": _unique_values(product_kpis, "domain"),
        "categories": _unique_values(product_kpis, "main_category"),
        "category_ids": _unique_values(product_kpis, "category_id"),
        "suppliers": _unique_values(product_kpis, "store"),
        "supplier_ids": _unique_values(product_kpis, "supplier_id"),
        "sentiments": ["positif", "neutre", "negatif"],
        "risk_levels": ["faible", "moyen", "eleve"],
        "years": years,
        "sorts": ["popularite", "note", "confiance", "achetable", "futur", "risque"],
    }
