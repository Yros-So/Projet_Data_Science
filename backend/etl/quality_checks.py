from __future__ import annotations

from typing import Any

import pandas as pd


def _missing_columns(df: pd.DataFrame, required_columns: list[str]) -> list[str]:
    return [column for column in required_columns if column not in df.columns]


def _null_rates(df: pd.DataFrame, columns: list[str]) -> dict[str, float]:
    return {
        column: round(float(df[column].isna().mean()), 4)
        for column in columns
        if column in df.columns and len(df) > 0
    }


def validate_reviews(reviews: pd.DataFrame) -> dict[str, Any]:
    required = [
        "review_id",
        "global_product_id",
        "domain",
        "user_id",
        "parent_asin",
        "rating",
        "text",
        "sentiment",
        "review_date",
        "verified_purchase",
    ]
    missing = _missing_columns(reviews, required)
    rating_valid_rate = 0.0 if len(reviews) == 0 else float(reviews["rating"].between(1, 5).mean())
    sentiment_values = set(reviews["sentiment"].dropna().unique()) if "sentiment" in reviews else set()

    checks = {
        "table": "reviews_clean",
        "rows": int(len(reviews)),
        "missing_columns": missing,
        "null_rates": _null_rates(reviews, required),
        "duplicate_review_ids": int(reviews["review_id"].duplicated().sum()) if "review_id" in reviews else None,
        "rating_valid_rate": round(rating_valid_rate, 4),
        "sentiment_values": sorted(sentiment_values),
        "status": "ok",
    }
    if missing or len(reviews) == 0 or rating_valid_rate < 1.0 or not sentiment_values.issubset(
        {"positif", "neutre", "negatif"}
    ):
        checks["status"] = "warning"
    return checks


def validate_products(products: pd.DataFrame) -> dict[str, Any]:
    required = [
        "global_product_id",
        "domain",
        "parent_asin",
        "title",
        "main_category",
        "category_id",
        "supplier_id",
        "store",
        "average_rating",
        "rating_number",
    ]
    missing = _missing_columns(products, required)
    unique_rate = 0.0 if len(products) == 0 else float(products["global_product_id"].nunique() / len(products))

    checks = {
        "table": "products_clean",
        "rows": int(len(products)),
        "missing_columns": missing,
        "null_rates": _null_rates(products, required),
        "duplicate_global_product_id": (
            int(products["global_product_id"].duplicated().sum()) if "global_product_id" in products else None
        ),
        "global_product_id_unique_rate": round(unique_rate, 4),
        "status": "ok",
    }
    if missing or len(products) == 0 or unique_rate < 1.0:
        checks["status"] = "warning"
    return checks


def build_quality_report(reviews: pd.DataFrame, products: pd.DataFrame, source: str) -> dict[str, Any]:
    reviews_report = validate_reviews(reviews)
    products_report = validate_products(products)
    status = "ok" if reviews_report["status"] == "ok" and products_report["status"] == "ok" else "warning"
    return {
        "status": status,
        "source": source,
        "checks": [reviews_report, products_report],
    }
