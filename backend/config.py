from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT_DIR / "data"
BRONZE_DIR = DATA_DIR / "bronze"
SILVER_DIR = DATA_DIR / "silver"
GOLD_DIR = DATA_DIR / "gold"
MODELS_DIR = ROOT_DIR / "models"
METRICS_DIR = MODELS_DIR / "metrics"

RAW_REVIEWS_DIR = BRONZE_DIR / "raw_review_Amazon_Fashion"
RAW_PRODUCTS_DIR = BRONZE_DIR / "raw_meta_Amazon_Fashion"

SILVER_REVIEWS_PATH = SILVER_DIR / "reviews_clean.parquet"
SILVER_PRODUCTS_PATH = SILVER_DIR / "products_clean.parquet"

GOLD_PRODUCTS_PATH = GOLD_DIR / "products.parquet"
GOLD_REVIEWS_SAMPLE_PATH = GOLD_DIR / "reviews_sample.parquet"
GOLD_PRODUCT_KPIS_PATH = GOLD_DIR / "product_kpis.parquet"
GOLD_SUPPLIER_KPIS_PATH = GOLD_DIR / "supplier_kpis.parquet"
GOLD_CATEGORY_KPIS_PATH = GOLD_DIR / "category_kpis.parquet"
GOLD_PROBLEMATIC_PRODUCTS_PATH = GOLD_DIR / "problematic_products.parquet"
GOLD_SENTIMENT_STATS_PATH = GOLD_DIR / "sentiment_stats.parquet"
GOLD_RECOMMENDATIONS_PATH = GOLD_DIR / "recommendations.parquet"
GOLD_GLOBAL_KPIS_PATH = GOLD_DIR / "global_kpis.json"
GOLD_DATA_QUALITY_REPORT_PATH = GOLD_DIR / "data_quality_report.json"

SENTIMENT_MODEL_PATH = MODELS_DIR / "sentiment_model.joblib"
SENTIMENT_METRICS_PATH = METRICS_DIR / "sentiment_metrics.json"
MODEL_COMPARISON_PATH = METRICS_DIR / "model_comparison.json"


def bronze_reviews_dir(category: str) -> Path:
    return BRONZE_DIR / category / "reviews"


def bronze_metadata_dir(category: str) -> Path:
    return BRONZE_DIR / category / "metadata"


def legacy_reviews_dir(category: str) -> Path:
    return BRONZE_DIR / f"raw_review_{category}"


def legacy_metadata_dir(category: str) -> Path:
    return BRONZE_DIR / f"raw_meta_{category}"


def ensure_project_dirs() -> None:
    from backend.etl.config_categories import enabled_categories

    for path in [
        BRONZE_DIR,
        SILVER_DIR,
        GOLD_DIR,
        RAW_REVIEWS_DIR,
        RAW_PRODUCTS_DIR,
        MODELS_DIR,
        METRICS_DIR,
    ]:
        path.mkdir(parents=True, exist_ok=True)

    for category in enabled_categories():
        bronze_reviews_dir(category).mkdir(parents=True, exist_ok=True)
        bronze_metadata_dir(category).mkdir(parents=True, exist_ok=True)
