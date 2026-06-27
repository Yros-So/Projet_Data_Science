from __future__ import annotations

import os
import sys
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT_DIR))

from sqlalchemy import create_engine, text

from backend.config import (
    GOLD_CATEGORY_KPIS_PATH,
    GOLD_PRODUCT_KPIS_PATH,
    GOLD_PRODUCTS_PATH,
    GOLD_RECOMMENDATIONS_PATH,
    GOLD_SUPPLIER_KPIS_PATH,
)
from backend.etl.etl_spark import run_etl
from backend.ml.recommendation import build_recommendations
from backend.storage import read_table


DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://postgres:postgres@localhost:5432/ecommerce_ds")


def load_gold_to_postgres() -> None:
    if not GOLD_PRODUCTS_PATH.exists() and not GOLD_PRODUCTS_PATH.with_suffix(".csv").exists():
        run_etl()
    if not GOLD_RECOMMENDATIONS_PATH.exists() and not GOLD_RECOMMENDATIONS_PATH.with_suffix(".csv").exists():
        build_recommendations()

    engine = create_engine(DATABASE_URL)
    schema_path = Path(__file__).with_name("schema.sql")
    with engine.begin() as connection:
        connection.execute(text(schema_path.read_text(encoding="utf-8")))

    tables = {
        "products": read_table(GOLD_PRODUCTS_PATH),
        "product_kpis": read_table(GOLD_PRODUCT_KPIS_PATH),
        "supplier_kpis": read_table(GOLD_SUPPLIER_KPIS_PATH),
        "category_kpis": read_table(GOLD_CATEGORY_KPIS_PATH),
        "recommendations": read_table(GOLD_RECOMMENDATIONS_PATH),
    }

    for table_name, dataframe in tables.items():
        dataframe.to_sql(table_name, engine, if_exists="replace", index=False)
        print(f"Table chargee: {table_name} ({len(dataframe)} lignes)")


if __name__ == "__main__":
    load_gold_to_postgres()
