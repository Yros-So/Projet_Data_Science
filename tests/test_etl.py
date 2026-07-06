from __future__ import annotations

import sys
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT_DIR))

from backend.config import GOLD_CATEGORY_KPIS_PATH, GOLD_DATA_QUALITY_REPORT_PATH, GOLD_GLOBAL_KPIS_PATH, GOLD_PRODUCT_KPIS_PATH
from backend.storage import read_json, read_table


def test_gold_tables_and_quality_report_are_valid():
    product_kpis = read_table(GOLD_PRODUCT_KPIS_PATH)
    assert not product_kpis.empty
    assert {
        "global_product_id",
        "domain",
        "parent_asin",
        "nb_reviews",
        "avg_rating",
        "risk_score",
        "confidence_score",
        "buyability_score",
        "future_purchase_score",
        "purchase_decision",
    }.issubset(product_kpis.columns)
    assert set(product_kpis["purchase_decision"].unique()).issubset({"Achetable", "A surveiller", "A eviter"})
    assert product_kpis["domain"].nunique() >= 3

    category_kpis = read_table(GOLD_CATEGORY_KPIS_PATH)
    assert not category_kpis.empty
    assert {"category_id", "domain", "category_score", "nb_products", "nb_reviews"}.issubset(category_kpis.columns)

    report = read_json(GOLD_DATA_QUALITY_REPORT_PATH)
    global_kpis = read_json(GOLD_GLOBAL_KPIS_PATH)
    assert global_kpis["total_reviews"] > 0
    assert report["status"] in {"warning", "ok"}
    assert report["schema_status"] == "ok"
    assert report["scale"]["status"] in {"under_target", "production_ready"}
    assert report["scale"]["min_reviews_required_per_dataset"] == 1500000
    assert len(report["checks"]) == 2
