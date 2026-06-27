from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

ROOT_DIR = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT_DIR))

from sqlalchemy import create_engine, text

from backend.config import (
    GOLD_CATEGORY_KPIS_PATH,
    GOLD_DATA_QUALITY_REPORT_PATH,
    GOLD_GLOBAL_KPIS_PATH,
    GOLD_PRODUCT_KPIS_PATH,
    GOLD_PRODUCTS_PATH,
    GOLD_PROBLEMATIC_PRODUCTS_PATH,
    GOLD_RECOMMENDATIONS_PATH,
    GOLD_REVIEWS_SAMPLE_PATH,
    GOLD_SENTIMENT_STATS_PATH,
    GOLD_SUPPLIER_KPIS_PATH,
)
from backend.etl.etl_spark import run_etl
from backend.ml.recommendation import build_recommendations
from backend.storage import read_json, read_table


DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://postgres:postgres@localhost:55432/ecommerce_ds")

MANAGED_TABLES = [
    "recommendations",
    "data_quality_report",
    "global_dashboard",
    "sentiment_stats",
    "problematic_products",
    "category_kpis",
    "supplier_kpis",
    "product_kpis",
    "reviews_sample",
    "products",
]


def _table_file_exists(path: Path) -> bool:
    return path.exists() or path.with_suffix(".csv").exists()


def _ensure_gold_outputs() -> None:
    etl_outputs = [
        GOLD_PRODUCTS_PATH,
        GOLD_REVIEWS_SAMPLE_PATH,
        GOLD_PRODUCT_KPIS_PATH,
        GOLD_SUPPLIER_KPIS_PATH,
        GOLD_CATEGORY_KPIS_PATH,
        GOLD_PROBLEMATIC_PRODUCTS_PATH,
        GOLD_SENTIMENT_STATS_PATH,
        GOLD_GLOBAL_KPIS_PATH,
        GOLD_DATA_QUALITY_REPORT_PATH,
    ]
    if not all(_table_file_exists(path) for path in etl_outputs):
        run_etl()

    if not _table_file_exists(GOLD_RECOMMENDATIONS_PATH):
        build_recommendations()


def _utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _global_dashboard_dataframe() -> pd.DataFrame:
    payload = read_json(GOLD_GLOBAL_KPIS_PATH)
    domains = payload.get("domains", [])
    return pd.DataFrame(
        [
            {
                "dashboard_id": "latest",
                "total_reviews": payload.get("total_reviews"),
                "total_products": payload.get("total_products"),
                "total_suppliers": payload.get("total_suppliers"),
                "total_categories": payload.get("total_categories"),
                "domains": json.dumps(domains, ensure_ascii=False),
                "average_rating_global": payload.get("average_rating_global"),
                "positive_rate_global": payload.get("positive_rate_global"),
                "negative_rate_global": payload.get("negative_rate_global"),
                "data_source": payload.get("data_source"),
                "loaded_at": _utc_now(),
            }
        ]
    )


def _data_quality_report_dataframe() -> pd.DataFrame:
    payload = read_json(GOLD_DATA_QUALITY_REPORT_PATH)
    return pd.DataFrame(
        [
            {
                "report_id": "latest",
                "status": payload.get("status"),
                "source": payload.get("source"),
                "payload": json.dumps(payload, ensure_ascii=False),
                "loaded_at": _utc_now(),
            }
        ]
    )


def _gold_tables() -> dict[str, pd.DataFrame]:
    return {
        "products": read_table(GOLD_PRODUCTS_PATH),
        "reviews_sample": read_table(GOLD_REVIEWS_SAMPLE_PATH),
        "product_kpis": read_table(GOLD_PRODUCT_KPIS_PATH),
        "supplier_kpis": read_table(GOLD_SUPPLIER_KPIS_PATH),
        "category_kpis": read_table(GOLD_CATEGORY_KPIS_PATH),
        "problematic_products": read_table(GOLD_PROBLEMATIC_PRODUCTS_PATH),
        "sentiment_stats": read_table(GOLD_SENTIMENT_STATS_PATH),
        "recommendations": read_table(GOLD_RECOMMENDATIONS_PATH),
        "global_dashboard": _global_dashboard_dataframe(),
        "data_quality_report": _data_quality_report_dataframe(),
    }


def _reset_schema(engine) -> None:
    schema_path = Path(__file__).with_name("schema.sql")
    with engine.begin() as connection:
        for table_name in MANAGED_TABLES:
            connection.execute(text(f'DROP TABLE IF EXISTS "{table_name}" CASCADE'))
        connection.execute(text(schema_path.read_text(encoding="utf-8")))


def _clean_dataframe(dataframe: pd.DataFrame) -> pd.DataFrame:
    return dataframe.where(pd.notnull(dataframe), None)


def load_gold_to_postgres() -> dict[str, int]:
    _ensure_gold_outputs()

    engine = create_engine(DATABASE_URL)
    _reset_schema(engine)

    counts: dict[str, int] = {}
    tables = _gold_tables()
    for table_name, dataframe in tables.items():
        clean = _clean_dataframe(dataframe)
        clean.to_sql(table_name, engine, if_exists="append", index=False, chunksize=1000, method="multi")
        counts[table_name] = len(clean)
        print(f"Table chargee: {table_name} ({counts[table_name]} lignes)")

    print("Chargement PostgreSQL termine.")
    return counts


if __name__ == "__main__":
    load_gold_to_postgres()
