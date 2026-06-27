from __future__ import annotations

import sys
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT_DIR))

from backend.etl.etl_spark import run_etl
from backend.ml.recommendation import build_recommendations
from backend.ml.train_sentiment_model import train_sentiment_model


def main() -> None:
    etl_result = run_etl()
    print("ETL termine:")
    print(
        {
            "source": etl_result["source"],
            "reviews": etl_result["reviews"],
            "products": etl_result["products"],
            "quality_status": etl_result["quality_status"],
        }
    )

    recommendations = build_recommendations()
    print(f"Recommandations generees: {len(recommendations)} lignes")

    metrics = train_sentiment_model()
    print("Modele de sentiment entraine:")
    print(
        {
            "best_model": metrics["best_model"],
            "accuracy": metrics["accuracy"],
            "classes": metrics["classes"],
        }
    )


if __name__ == "__main__":
    main()
