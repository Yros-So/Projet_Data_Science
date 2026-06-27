from __future__ import annotations

import hashlib
import math
from pathlib import Path

import pandas as pd

from backend.config import (
    GOLD_GLOBAL_KPIS_PATH,
    GOLD_DATA_QUALITY_REPORT_PATH,
    GOLD_PROBLEMATIC_PRODUCTS_PATH,
    GOLD_PRODUCT_KPIS_PATH,
    GOLD_PRODUCTS_PATH,
    GOLD_REVIEWS_SAMPLE_PATH,
    GOLD_SENTIMENT_STATS_PATH,
    GOLD_SUPPLIER_KPIS_PATH,
    RAW_PRODUCTS_DIR,
    RAW_REVIEWS_DIR,
    SILVER_PRODUCTS_PATH,
    SILVER_REVIEWS_PATH,
    ensure_project_dirs,
)
from backend.demo_data import build_demo_data
from backend.etl.quality_checks import build_quality_report
from backend.storage import write_json, write_table


REVIEW_COLUMNS = [
    "rating",
    "title",
    "text",
    "asin",
    "parent_asin",
    "user_id",
    "timestamp",
    "helpful_vote",
    "verified_purchase",
]

PRODUCT_COLUMNS = [
    "title",
    "main_category",
    "average_rating",
    "rating_number",
    "features",
    "description",
    "price",
    "store",
    "categories",
    "parent_asin",
]


def _has_data_files(path: Path) -> bool:
    return path.exists() and any(item.is_file() and item.name != ".gitkeep" for item in path.rglob("*"))


def _read_dataset(path: Path) -> pd.DataFrame:
    files = [item for item in path.rglob("*") if item.is_file() and item.name != ".gitkeep"]
    if not files:
        raise FileNotFoundError(path)

    parquet_files = [item for item in files if item.suffix.lower() == ".parquet"]
    csv_files = [item for item in files if item.suffix.lower() == ".csv"]
    json_files = [item for item in files if item.suffix.lower() in {".json", ".jsonl"}]

    if parquet_files:
        return pd.concat([pd.read_parquet(file) for file in parquet_files], ignore_index=True)
    if csv_files:
        return pd.concat([pd.read_csv(file) for file in csv_files], ignore_index=True)
    if json_files:
        return pd.concat([pd.read_json(file, lines=True) for file in json_files], ignore_index=True)

    raise ValueError(f"Format non supporte dans {path}")


def load_raw_data() -> tuple[pd.DataFrame, pd.DataFrame, str]:
    if _has_data_files(RAW_REVIEWS_DIR) and _has_data_files(RAW_PRODUCTS_DIR):
        return _read_dataset(RAW_REVIEWS_DIR), _read_dataset(RAW_PRODUCTS_DIR), "amazon_fashion_local"

    reviews, products = build_demo_data()
    return reviews, products, "demo_generated"


def sentiment_from_rating(rating: float) -> str:
    if rating <= 2:
        return "negatif"
    if rating == 3:
        return "neutre"
    return "positif"


def stable_id(prefix: str, value: object) -> str:
    raw = str(value or "unknown").strip().lower().encode("utf-8")
    digest = hashlib.sha1(raw).hexdigest()[:10]
    return f"{prefix}_{digest}"


def _ensure_columns(df: pd.DataFrame, columns: list[str]) -> pd.DataFrame:
    copy = df.copy()
    for column in columns:
        if column not in copy.columns:
            copy[column] = None
    return copy[columns]


def clean_reviews(reviews: pd.DataFrame) -> pd.DataFrame:
    cleaned = _ensure_columns(reviews, REVIEW_COLUMNS)
    cleaned["rating"] = pd.to_numeric(cleaned["rating"], errors="coerce")
    cleaned["title"] = cleaned["title"].fillna("").astype(str)
    cleaned["text"] = cleaned["text"].fillna("").astype(str).str.strip()
    cleaned["parent_asin"] = cleaned["parent_asin"].fillna(cleaned["asin"])
    cleaned["parent_asin"] = cleaned["parent_asin"].astype(str).str.strip()
    cleaned["user_id"] = cleaned["user_id"].fillna("unknown_user").astype(str)
    cleaned["helpful_vote"] = pd.to_numeric(cleaned["helpful_vote"], errors="coerce").fillna(0).astype(int)
    cleaned["verified_purchase"] = cleaned["verified_purchase"].fillna(False).astype(bool)

    numeric_timestamp = pd.to_numeric(cleaned["timestamp"], errors="coerce")
    cleaned["review_date"] = pd.to_datetime(numeric_timestamp, unit="ms", errors="coerce")
    fallback_dates = pd.to_datetime(cleaned["timestamp"], errors="coerce")
    cleaned["review_date"] = cleaned["review_date"].fillna(fallback_dates)

    cleaned = cleaned.dropna(subset=["rating"])
    cleaned = cleaned[(cleaned["rating"] >= 1) & (cleaned["rating"] <= 5)]
    cleaned = cleaned[(cleaned["text"] != "") & (cleaned["parent_asin"] != "")]
    cleaned["sentiment"] = cleaned["rating"].apply(sentiment_from_rating)
    cleaned["review_id"] = [
        stable_id("review", f"{row.user_id}-{row.parent_asin}-{index}-{row.text[:24]}")
        for index, row in cleaned.reset_index(drop=True).iterrows()
    ]
    cleaned = cleaned.drop_duplicates(subset=["review_id"])
    return cleaned[
        [
            "review_id",
            "user_id",
            "parent_asin",
            "rating",
            "title",
            "text",
            "sentiment",
            "review_date",
            "helpful_vote",
            "verified_purchase",
        ]
    ]


def clean_products(products: pd.DataFrame) -> pd.DataFrame:
    cleaned = _ensure_columns(products, PRODUCT_COLUMNS)
    cleaned["title"] = cleaned["title"].fillna("Produit sans titre").astype(str).str.strip()
    cleaned["main_category"] = cleaned["main_category"].fillna("Amazon_Fashion").astype(str)
    cleaned["store"] = cleaned["store"].fillna("Unknown Supplier").astype(str).str.strip()
    cleaned["features"] = cleaned["features"].fillna("").astype(str)
    cleaned["description"] = cleaned["description"].fillna("").astype(str)
    cleaned["categories"] = cleaned["categories"].fillna("").astype(str)
    cleaned["parent_asin"] = cleaned["parent_asin"].fillna("").astype(str).str.strip()
    cleaned["average_rating"] = pd.to_numeric(cleaned["average_rating"], errors="coerce")
    cleaned["rating_number"] = pd.to_numeric(cleaned["rating_number"], errors="coerce").fillna(0).astype(int)
    cleaned["price"] = (
        cleaned["price"].astype(str).str.replace(r"[^0-9.,]", "", regex=True).str.replace(",", ".", regex=False)
    )
    cleaned["price"] = pd.to_numeric(cleaned["price"], errors="coerce")
    cleaned = cleaned[cleaned["parent_asin"] != ""]
    cleaned["supplier_id"] = cleaned["store"].apply(lambda value: stable_id("supplier", value))
    cleaned = cleaned.drop_duplicates(subset=["parent_asin"])
    return cleaned[
        [
            "parent_asin",
            "title",
            "main_category",
            "supplier_id",
            "store",
            "average_rating",
            "rating_number",
            "price",
            "features",
            "description",
            "categories",
        ]
    ]


def build_gold_tables(reviews: pd.DataFrame, products: pd.DataFrame) -> dict[str, pd.DataFrame | dict[str, object]]:
    joined = reviews.merge(
        products[
            [
                "parent_asin",
                "title",
                "main_category",
                "supplier_id",
                "store",
                "price",
                "rating_number",
                "features",
                "description",
                "categories",
            ]
        ],
        on="parent_asin",
        how="left",
        suffixes=("_review", "_product"),
    )
    joined["title_product"] = joined["title_product"].fillna("Produit sans titre")
    joined["product_title"] = joined["title_product"]
    joined["store"] = joined["store"].fillna("Unknown Supplier")
    joined["supplier_id"] = joined["supplier_id"].fillna(joined["store"].apply(lambda value: stable_id("supplier", value)))
    joined["main_category"] = joined["main_category"].fillna("Amazon_Fashion")

    sentiment_counts = (
        joined.pivot_table(index="parent_asin", columns="sentiment", values="review_id", aggfunc="count", fill_value=0)
        .reset_index()
        .rename_axis(None, axis=1)
    )
    for column in ["positif", "neutre", "negatif"]:
        if column not in sentiment_counts.columns:
            sentiment_counts[column] = 0

    base_kpis = (
        joined.groupby("parent_asin")
        .agg(
            product_title=("title_product", "first"),
            main_category=("main_category", "first"),
            supplier_id=("supplier_id", "first"),
            store=("store", "first"),
            nb_reviews=("review_id", "count"),
            avg_rating=("rating", "mean"),
            avg_helpful_vote=("helpful_vote", "mean"),
            verified_rate=("verified_purchase", "mean"),
            rating_number=("rating_number", "first"),
        )
        .reset_index()
    )
    product_kpis = base_kpis.merge(sentiment_counts, on="parent_asin", how="left")
    product_kpis[["positif", "neutre", "negatif"]] = product_kpis[["positif", "neutre", "negatif"]].fillna(0)
    product_kpis["positive_rate"] = product_kpis["positif"] / product_kpis["nb_reviews"]
    product_kpis["neutral_rate"] = product_kpis["neutre"] / product_kpis["nb_reviews"]
    product_kpis["negative_rate"] = product_kpis["negatif"] / product_kpis["nb_reviews"]
    product_kpis["low_rating_rate"] = product_kpis["negative_rate"]
    product_kpis["popularity_score"] = product_kpis.apply(
        lambda row: math.log1p(float(row["nb_reviews"]) + float(row["rating_number"] or 0)) * float(row["avg_rating"]),
        axis=1,
    )
    product_kpis["risk_score"] = (
        product_kpis["negative_rate"] * 0.6
        + product_kpis["low_rating_rate"] * 0.3
        + (1 - product_kpis["verified_rate"]) * 0.1
    )
    product_kpis = product_kpis.sort_values(["risk_score", "nb_reviews"], ascending=[False, False])

    problematic_products = product_kpis[product_kpis["nb_reviews"] >= 3].head(25).copy()

    supplier_kpis = (
        product_kpis.groupby(["supplier_id", "store"])
        .agg(
            nb_products=("parent_asin", "nunique"),
            nb_reviews=("nb_reviews", "sum"),
            avg_supplier_rating=("avg_rating", "mean"),
            supplier_negative_rate=("negative_rate", "mean"),
            verified_rate=("verified_rate", "mean"),
            best_product=("product_title", lambda values: values.iloc[0]),
            worst_product=("product_title", lambda values: values.iloc[-1]),
        )
        .reset_index()
    )
    supplier_kpis["supplier_score"] = (
        supplier_kpis["avg_supplier_rating"] - supplier_kpis["supplier_negative_rate"] + supplier_kpis["verified_rate"]
    )
    supplier_kpis = supplier_kpis.sort_values("supplier_score", ascending=False)

    sentiment_stats = (
        joined.groupby("sentiment")
        .agg(nb_reviews=("review_id", "count"), avg_rating=("rating", "mean"))
        .reset_index()
        .sort_values("nb_reviews", ascending=False)
    )

    global_kpis = {
        "total_reviews": int(len(reviews)),
        "total_products": int(products["parent_asin"].nunique()),
        "total_suppliers": int(products["supplier_id"].nunique()),
        "average_rating_global": round(float(reviews["rating"].mean()), 3),
        "positive_rate_global": round(float((reviews["sentiment"] == "positif").mean()), 3),
        "negative_rate_global": round(float((reviews["sentiment"] == "negatif").mean()), 3),
        "data_source": "amazon_fashion_or_demo",
    }

    products_app = products.merge(
        product_kpis[
            [
                "parent_asin",
                "nb_reviews",
                "avg_rating",
                "positive_rate",
                "negative_rate",
                "popularity_score",
                "risk_score",
            ]
        ],
        on="parent_asin",
        how="left",
    )

    reviews_sample = joined.sort_values("review_date", ascending=False).head(500)[
        [
            "review_id",
            "user_id",
            "parent_asin",
            "product_title",
            "store",
            "rating",
            "text",
            "sentiment",
            "review_date",
            "helpful_vote",
            "verified_purchase",
        ]
    ]

    return {
        "products": products_app,
        "reviews_sample": reviews_sample,
        "product_kpis": product_kpis,
        "problematic_products": problematic_products,
        "supplier_kpis": supplier_kpis,
        "sentiment_stats": sentiment_stats,
        "global_kpis": global_kpis,
    }


def run_etl() -> dict[str, object]:
    ensure_project_dirs()
    raw_reviews, raw_products, source = load_raw_data()
    reviews = clean_reviews(raw_reviews)
    products = clean_products(raw_products)
    quality_report = build_quality_report(reviews, products, source)
    gold = build_gold_tables(reviews, products)
    gold["global_kpis"]["data_source"] = source

    written_paths = {
        "silver_reviews": str(write_table(reviews, SILVER_REVIEWS_PATH)),
        "silver_products": str(write_table(products, SILVER_PRODUCTS_PATH)),
        "products": str(write_table(gold["products"], GOLD_PRODUCTS_PATH)),
        "reviews_sample": str(write_table(gold["reviews_sample"], GOLD_REVIEWS_SAMPLE_PATH)),
        "product_kpis": str(write_table(gold["product_kpis"], GOLD_PRODUCT_KPIS_PATH)),
        "problematic_products": str(write_table(gold["problematic_products"], GOLD_PROBLEMATIC_PRODUCTS_PATH)),
        "supplier_kpis": str(write_table(gold["supplier_kpis"], GOLD_SUPPLIER_KPIS_PATH)),
        "sentiment_stats": str(write_table(gold["sentiment_stats"], GOLD_SENTIMENT_STATS_PATH)),
    }
    write_json(gold["global_kpis"], GOLD_GLOBAL_KPIS_PATH)
    write_json(quality_report, GOLD_DATA_QUALITY_REPORT_PATH)

    return {
        "source": source,
        "reviews": len(reviews),
        "products": len(products),
        "quality_status": quality_report["status"],
        "written_paths": written_paths,
    }


if __name__ == "__main__":
    result = run_etl()
    print(result)
