from __future__ import annotations

from functools import lru_cache
from typing import Any

import pandas as pd

from backend.config import (
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


def ensure_gold_data() -> None:
    if not GOLD_PRODUCTS_PATH.exists() and not GOLD_PRODUCTS_PATH.with_suffix(".csv").exists():
        run_etl()
    if not GOLD_RECOMMENDATIONS_PATH.exists() and not GOLD_RECOMMENDATIONS_PATH.with_suffix(".csv").exists():
        build_recommendations()


@lru_cache(maxsize=16)
def table(name: str) -> pd.DataFrame:
    ensure_gold_data()
    paths = {
        "products": GOLD_PRODUCTS_PATH,
        "reviews_sample": GOLD_REVIEWS_SAMPLE_PATH,
        "product_kpis": GOLD_PRODUCT_KPIS_PATH,
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

