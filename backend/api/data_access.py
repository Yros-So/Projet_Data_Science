from __future__ import annotations

from functools import lru_cache
from typing import Any

import pandas as pd

from backend.config import (
    GOLD_CATEGORY_KPIS_PATH,
    GOLD_GLOBAL_KPIS_PATH,
    GOLD_PROBLEMATIC_PRODUCTS_PATH,
    GOLD_PRODUCT_KPIS_PATH,
    GOLD_PRODUCTS_PATH,
    GOLD_RECOMMENDATIONS_PATH,
    GOLD_REVIEWS_SAMPLE_PATH,
    GOLD_SENTIMENT_STATS_PATH,
    GOLD_SUPPLIER_KPIS_PATH,
)
from backend.etl.etl_spark import run_etl
from backend.ml.recommendation import build_recommendations
from backend.storage import read_json, read_table, to_json_records


def _table_exists(path) -> bool:
    return path.exists() or path.with_suffix(".csv").exists()


def _table_has_columns(path, required_columns: set[str]) -> bool:
    if not _table_exists(path):
        return False
    try:
        return required_columns.issubset(read_table(path).columns)
    except Exception:
        return False


def ensure_gold_data() -> None:
    products_ready = _table_has_columns(
        GOLD_PRODUCTS_PATH,
        {"global_product_id", "domain", "category_id", "dominant_sentiment", "min_review_year", "max_review_year"},
    )
    product_kpis_ready = _table_has_columns(
        GOLD_PRODUCT_KPIS_PATH,
        {"global_product_id", "domain", "confidence_score", "dominant_sentiment", "min_review_year", "max_review_year"},
    )
    categories_ready = _table_has_columns(GOLD_CATEGORY_KPIS_PATH, {"category_id", "domain", "category_score"})
    if not products_ready or not product_kpis_ready or not categories_ready:
        run_etl()

    recommendations_ready = _table_has_columns(GOLD_RECOMMENDATIONS_PATH, {"domain", "recommended_domain"})
    if not recommendations_ready:
        build_recommendations()


@lru_cache(maxsize=16)
def table(name: str) -> pd.DataFrame:
    ensure_gold_data()
    paths = {
        "products": GOLD_PRODUCTS_PATH,
        "reviews_sample": GOLD_REVIEWS_SAMPLE_PATH,
        "product_kpis": GOLD_PRODUCT_KPIS_PATH,
        "category_kpis": GOLD_CATEGORY_KPIS_PATH,
        "problematic_products": GOLD_PROBLEMATIC_PRODUCTS_PATH,
        "supplier_kpis": GOLD_SUPPLIER_KPIS_PATH,
        "sentiment_stats": GOLD_SENTIMENT_STATS_PATH,
        "recommendations": GOLD_RECOMMENDATIONS_PATH,
    }
    return read_table(paths[name])


@lru_cache(maxsize=1)
def global_kpis() -> dict[str, Any]:
    ensure_gold_data()
    return read_json(GOLD_GLOBAL_KPIS_PATH)


def clear_cache() -> None:
    table.cache_clear()
    global_kpis.cache_clear()


def records(df: pd.DataFrame) -> list[dict[str, Any]]:
    return to_json_records(df)
