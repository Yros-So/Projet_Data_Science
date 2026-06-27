from __future__ import annotations

import sys
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT_DIR))

from backend.config import GOLD_DATA_QUALITY_REPORT_PATH, GOLD_PRODUCT_KPIS_PATH
from backend.etl.etl_spark import run_etl
from backend.storage import read_json, read_table


def test_etl_generates_gold_tables_and_quality_report():
    result = run_etl()

    assert result["reviews"] > 0
    assert result["products"] > 0
    assert result["quality_status"] == "ok"

    product_kpis = read_table(GOLD_PRODUCT_KPIS_PATH)
    assert not product_kpis.empty
    assert {
        "parent_asin",
        "nb_reviews",
        "avg_rating",
        "risk_score",
        "buyability_score",
        "future_purchase_score",
        "purchase_decision",
    }.issubset(product_kpis.columns)
    assert set(product_kpis["purchase_decision"].unique()).issubset({"Achetable", "A surveiller", "A eviter"})

    report = read_json(GOLD_DATA_QUALITY_REPORT_PATH)
    assert report["status"] == "ok"
    assert len(report["checks"]) == 2
