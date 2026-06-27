from __future__ import annotations

import json
from pathlib import Path

from backend.config import SENTIMENT_METRICS_PATH, SENTIMENT_MODEL_PATH, SILVER_REVIEWS_PATH, ensure_project_dirs
from backend.etl.etl_spark import run_etl
from backend.storage import read_table


def _load_training_data():
    try:
        reviews = read_table(SILVER_REVIEWS_PATH)
    except FileNotFoundError:
        run_etl()
        reviews = read_table(SILVER_REVIEWS_PATH)

    reviews = reviews.dropna(subset=["text", "sentiment"])
    reviews = reviews[reviews["text"].astype(str).str.strip() != ""]
    return reviews


def train_sentiment_model(model_path: Path = SENTIMENT_MODEL_PATH) -> dict[str, object]:
    ensure_project_dirs()

    try:
        import joblib
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.linear_model import LogisticRegression
        from sklearn.metrics import classification_report
        from sklearn.model_selection import train_test_split
        from sklearn.pipeline import Pipeline
    except ImportError as exc:
        raise RuntimeError(
            "Dependances ML manquantes. Installez-les avec: pip install -r requirements.txt"
        ) from exc

    reviews = _load_training_data()
    x = reviews["text"].astype(str)
    y = reviews["sentiment"].astype(str)

    class_counts = y.value_counts()
    can_stratify = len(class_counts) > 1 and class_counts.min() >= 2
    test_size = 0.25 if len(reviews) >= 40 else 0.35

    x_train, x_test, y_train, y_test = train_test_split(
        x,
        y,
        test_size=test_size,
        random_state=42,
        stratify=y if can_stratify else None,
    )

    pipeline = Pipeline(
        steps=[
            (
                "tfidf",
                TfidfVectorizer(
                    lowercase=True,
                    ngram_range=(1, 2),
                    max_features=5000,
                    min_df=1,
                    strip_accents="unicode",
                ),
            ),
            ("classifier", LogisticRegression(max_iter=1000, class_weight="balanced")),
        ]
    )
    pipeline.fit(x_train, y_train)
    predictions = pipeline.predict(x_test)

    report = classification_report(y_test, predictions, output_dict=True, zero_division=0)
    metrics = {
        "nb_reviews_training": int(len(reviews)),
        "classes": sorted(y.unique().tolist()),
        "accuracy": float(report.get("accuracy", 0.0)),
        "classification_report": report,
    }

    model_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, model_path)
    SENTIMENT_METRICS_PATH.parent.mkdir(parents=True, exist_ok=True)
    SENTIMENT_METRICS_PATH.write_text(json.dumps(metrics, indent=2, ensure_ascii=False), encoding="utf-8")
    return metrics


def load_sentiment_model():
    import joblib

    if not SENTIMENT_MODEL_PATH.exists():
        train_sentiment_model()
    return joblib.load(SENTIMENT_MODEL_PATH)


def predict_sentiment(text: str) -> dict[str, object]:
    model = load_sentiment_model()
    prediction = model.predict([text])[0]
    score = None
    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba([text])[0]
        classes = list(model.classes_)
        score = float(probabilities[classes.index(prediction)])
    return {"text": text, "sentiment": prediction, "confidence": score}


if __name__ == "__main__":
    print(train_sentiment_model())

