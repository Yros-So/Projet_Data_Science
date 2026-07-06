from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

import pandas as pd


ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT_DIR))

from backend.config import (  # noqa: E402
    GOLD_CATEGORY_KPIS_PATH,
    GOLD_DATA_QUALITY_REPORT_PATH,
    GOLD_GLOBAL_KPIS_PATH,
    GOLD_PRODUCT_KPIS_PATH,
    GOLD_PRODUCTS_PATH,
    GOLD_RECOMMENDATIONS_PATH,
    GOLD_REVIEWS_SAMPLE_PATH,
    GOLD_SENTIMENT_STATS_PATH,
    GOLD_SUPPLIER_KPIS_PATH,
)
from backend.storage import read_json, read_table, to_json_records  # noqa: E402


OUTPUT_DIR = ROOT_DIR / "frontend" / "public" / "static-api"


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def top_frame(frame: pd.DataFrame, columns: list[str], limit: int) -> pd.DataFrame:
    sort_columns = [column for column in columns if column in frame.columns]
    if sort_columns:
        return frame.sort_values(sort_columns, ascending=[False] * len(sort_columns)).head(limit)
    return frame.head(limit)


def main() -> None:
    products = read_table(GOLD_PRODUCTS_PATH)
    product_kpis = read_table(GOLD_PRODUCT_KPIS_PATH)
    suppliers = read_table(GOLD_SUPPLIER_KPIS_PATH)
    categories = read_table(GOLD_CATEGORY_KPIS_PATH)
    sentiment_stats = read_table(GOLD_SENTIMENT_STATS_PATH)
    recommendations = read_table(GOLD_RECOMMENDATIONS_PATH)
    reviews_sample = read_table(GOLD_REVIEWS_SAMPLE_PATH)
    global_kpis = read_json(GOLD_GLOBAL_KPIS_PATH)
    data_quality_report = read_json(GOLD_DATA_QUALITY_REPORT_PATH)

    negative_review_product_ids = set(
        reviews_sample[
            reviews_sample.get("sentiment", pd.Series(dtype=str)).astype(str).str.lower() == "negatif"
        ]
        .get("global_product_id", pd.Series(dtype=str))
        .dropna()
        .astype(str)
    )
    negative_review_products = products[products["global_product_id"].astype(str).isin(negative_review_product_ids)]
    negative_review_product_kpis = product_kpis[
        product_kpis["global_product_id"].astype(str).isin(negative_review_product_ids)
    ]

    product_sample = pd.concat(
        [
            negative_review_products,
            top_frame(products, ["buyability_score", "popularity_score"], 1200),
            top_frame(products, ["risk_score", "nb_reviews"], 500),
            top_frame(products, ["popularity_score"], 500),
        ],
        ignore_index=True,
    ).drop_duplicates(subset=["global_product_id"]).head(2000)

    supplier_ids = set(product_sample.get("supplier_id", pd.Series(dtype=str)).dropna().astype(str))
    supplier_ids.update(negative_review_product_kpis.get("supplier_id", pd.Series(dtype=str)).dropna().astype(str))
    supplier_sample = pd.concat(
        [
            suppliers[suppliers["supplier_id"].astype(str).isin(supplier_ids)],
            top_frame(suppliers, ["supplier_score"], 250),
            top_frame(suppliers, ["supplier_negative_rate", "nb_problematic_products"], 250),
        ],
        ignore_index=True,
    ).drop_duplicates(subset=["supplier_id"]).head(500)

    category_sample = pd.concat(
        [
            top_frame(categories, ["risk_score", "nb_reviews"], 250),
            top_frame(categories, ["category_score", "nb_reviews"], 250),
        ],
        ignore_index=True,
    ).drop_duplicates(subset=["category_id"]).head(500)

    dashboard = {
        "global_kpis": global_kpis,
        "data_quality_report": data_quality_report,
        "sentiment_stats": to_json_records(sentiment_stats),
        "top_products": to_json_records(top_frame(product_kpis, ["popularity_score"], 8)),
        "problematic_products": to_json_records(top_frame(product_kpis, ["risk_score"], 8)),
        "supplier_ranking": to_json_records(top_frame(suppliers, ["supplier_score"], 8)),
        "categories": to_json_records(top_frame(categories, ["risk_score", "nb_reviews"], 50)),
    }

    filter_options = {
        "domains": sorted(product_sample["domain"].dropna().astype(str).unique().tolist()),
        "categories": sorted(product_sample["main_category"].dropna().astype(str).value_counts().head(500).index.tolist()),
        "category_ids": sorted(product_sample["category_id"].dropna().astype(str).value_counts().head(500).index.tolist()),
        "suppliers": sorted(product_sample["store"].dropna().astype(str).value_counts().head(500).index.tolist()),
        "supplier_ids": sorted(product_sample["supplier_id"].dropna().astype(str).value_counts().head(500).index.tolist()),
        "sentiments": ["positif", "neutre", "negatif"],
        "risk_levels": ["faible", "moyen", "eleve"],
        "years": [2020, 2021, 2022, 2023],
        "sorts": ["popularite", "note", "confiance", "achetable", "futur", "risque"],
    }

    product_kpi_sample = product_kpis[
        product_kpis["global_product_id"].astype(str).isin(product_sample["global_product_id"].astype(str))
        | product_kpis["supplier_id"].astype(str).isin(supplier_sample["supplier_id"].astype(str))
    ].drop_duplicates(subset=["global_product_id"]).head(10_000)

    reviews_export = pd.concat(
        [
            reviews_sample[
                reviews_sample.get("global_product_id", pd.Series(dtype=str))
                .astype(str)
                .isin(product_kpi_sample["global_product_id"].astype(str))
            ],
            reviews_sample[reviews_sample.get("sentiment", pd.Series(dtype=str)).astype(str).str.lower() == "negatif"],
            reviews_sample,
        ],
        ignore_index=True,
    ).drop_duplicates(subset=["review_id"]).head(2_000)

    write_json(OUTPUT_DIR / "health.json", {"status": "ok", "data_source": {"configured": "static", "active": "static", "postgres_ready": False}})
    write_json(OUTPUT_DIR / "dashboard.json", dashboard)
    write_json(OUTPUT_DIR / "filters.json", filter_options)
    write_json(OUTPUT_DIR / "products.json", to_json_records(product_sample))
    write_json(OUTPUT_DIR / "product_kpis.json", to_json_records(product_kpi_sample))
    write_json(OUTPUT_DIR / "suppliers.json", to_json_records(supplier_sample))
    write_json(OUTPUT_DIR / "categories.json", to_json_records(category_sample))
    write_json(OUTPUT_DIR / "recommendations.json", to_json_records(recommendations.head(10_000)))
    write_json(OUTPUT_DIR / "reviews_sample.json", to_json_records(reviews_export))
    print(f"Static API exported to {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
