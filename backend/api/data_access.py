from __future__ import annotations

import json
import os
from functools import lru_cache
from pathlib import Path
from typing import Any

import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

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

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://postgres:postgres@localhost:55432/ecommerce_ds")
VALID_DATA_SOURCES = {"files", "postgres", "auto"}

TABLE_PATHS = {
    "products": GOLD_PRODUCTS_PATH,
    "reviews_sample": GOLD_REVIEWS_SAMPLE_PATH,
    "product_kpis": GOLD_PRODUCT_KPIS_PATH,
    "category_kpis": GOLD_CATEGORY_KPIS_PATH,
    "problematic_products": GOLD_PROBLEMATIC_PRODUCTS_PATH,
    "supplier_kpis": GOLD_SUPPLIER_KPIS_PATH,
    "sentiment_stats": GOLD_SENTIMENT_STATS_PATH,
    "recommendations": GOLD_RECOMMENDATIONS_PATH,
}


def _table_exists(path) -> bool:
    return path.exists() or path.with_suffix(".csv").exists()


def _table_has_columns(path, required_columns: set[str]) -> bool:
    if not _table_exists(path):
        return False
    try:
        return required_columns.issubset(read_table(path).columns)
    except Exception:
        return False


def configured_data_source() -> str:
    source = os.getenv("API_DATA_SOURCE", "auto").strip().lower()
    if source not in VALID_DATA_SOURCES:
        return "files"
    return source


@lru_cache(maxsize=1)
def _postgres_engine():
    return create_engine(DATABASE_URL)


def _postgres_table_ready(table_name: str) -> bool:
    try:
        with _postgres_engine().connect() as connection:
            result = connection.execute(text(f'SELECT 1 FROM "{table_name}" LIMIT 1'))
            result.fetchone()
        return True
    except SQLAlchemyError:
        return False


def _postgres_ready() -> bool:
    return _postgres_table_ready("products") and _postgres_table_ready("global_dashboard")


def active_data_source() -> str:
    source = configured_data_source()
    if source == "auto":
        return "postgres" if _postgres_ready() else "files"
    return source


def ensure_gold_data() -> None:
    source = active_data_source()
    if source == "postgres":
        if not _postgres_ready():
            raise RuntimeError("API_DATA_SOURCE=postgres mais les tables PostgreSQL ne sont pas disponibles.")
        return

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
    if name not in TABLE_PATHS:
        raise KeyError(f"Table API inconnue: {name}")
    if active_data_source() == "postgres":
        return pd.read_sql_query(f'SELECT * FROM "{name}"', _postgres_engine())
    return read_table(TABLE_PATHS[name])


@lru_cache(maxsize=1)
def global_kpis() -> dict[str, Any]:
    ensure_gold_data()
    if active_data_source() == "postgres":
        data = pd.read_sql_query('SELECT * FROM "global_dashboard" LIMIT 1', _postgres_engine())
        if data.empty:
            return {}
        payload = data.iloc[0].where(pd.notnull(data.iloc[0]), None).to_dict()
        payload.pop("dashboard_id", None)
        payload.pop("loaded_at", None)
        if isinstance(payload.get("domains"), str):
            try:
                payload["domains"] = json.loads(payload["domains"])
            except json.JSONDecodeError:
                payload["domains"] = [payload["domains"]]
        return payload
    return read_json(GOLD_GLOBAL_KPIS_PATH)


def clear_cache() -> None:
    table.cache_clear()
    global_kpis.cache_clear()
    _postgres_engine.cache_clear()


def data_source_status() -> dict[str, Any]:
    return {
        "configured": configured_data_source(),
        "active": active_data_source(),
        "postgres_ready": _postgres_ready(),
    }


def records(df: pd.DataFrame) -> list[dict[str, Any]]:
    return to_json_records(df)
