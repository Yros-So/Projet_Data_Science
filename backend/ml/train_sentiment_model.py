from __future__ import annotations

import json
import os
from pathlib import Path

from backend.config import (
    MODEL_COMPARISON_PATH,
    SENTIMENT_METRICS_PATH,
    SENTIMENT_MODEL_PATH,
    SILVER_REVIEWS_PATH,
    ensure_project_dirs,
)
from backend.ml.sentiment_rules import apply_sentiment_rules
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
        from sklearn.dummy import DummyClassifier
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.linear_model import LogisticRegression
        from sklearn.metrics import (
            accuracy_score,
            classification_report,
            confusion_matrix,
            f1_score,
            precision_score,
            recall_score,
        )
        from sklearn.model_selection import train_test_split
        from sklearn.naive_bayes import MultinomialNB
        from sklearn.pipeline import Pipeline
    except ImportError as exc:
        raise RuntimeError(
            "Dependances ML manquantes. Installez-les avec: pip install -r requirements.txt"
        ) from exc

    reviews = _load_training_data()
    max_training_reviews = int(os.getenv("ML_MAX_TRAINING_REVIEWS", "200000"))
    if max_training_reviews > 0 and len(reviews) > max_training_reviews:
        reviews = reviews.sample(n=max_training_reviews, random_state=42)
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

    def make_vectorizer() -> TfidfVectorizer:
        return TfidfVectorizer(
            lowercase=True,
            ngram_range=(1, 2),
            max_features=5000,
            min_df=1,
            strip_accents="unicode",
        )

    candidates = {
        "baseline_majority": Pipeline(
            steps=[
                ("tfidf", make_vectorizer()),
                ("classifier", DummyClassifier(strategy="most_frequent")),
            ]
        ),
        "naive_bayes": Pipeline(
            steps=[
                ("tfidf", make_vectorizer()),
                ("classifier", MultinomialNB()),
            ]
        ),
        "logistic_regression": Pipeline(
            steps=[
                ("tfidf", make_vectorizer()),
                ("classifier", LogisticRegression(max_iter=1000, class_weight="balanced")),
            ]
        ),
    }

    comparison = []
    fitted_models = {}
    for model_name, pipeline in candidates.items():
        pipeline.fit(x_train, y_train)
        fitted_models[model_name] = pipeline
        predictions = pipeline.predict(x_test)
        comparison.append(
            {
                "model": model_name,
                "accuracy": float(accuracy_score(y_test, predictions)),
                "precision_macro": float(precision_score(y_test, predictions, average="macro", zero_division=0)),
                "recall_macro": float(recall_score(y_test, predictions, average="macro", zero_division=0)),
                "f1_macro": float(f1_score(y_test, predictions, average="macro", zero_division=0)),
            }
        )

    best_result = sorted(comparison, key=lambda item: (item["f1_macro"], item["accuracy"]), reverse=True)[0]
    best_model_name = best_result["model"]
    best_model = fitted_models[best_model_name]
    predictions = best_model.predict(x_test)

    report = classification_report(y_test, predictions, output_dict=True, zero_division=0)
    labels = sorted(y.unique().tolist())
    metrics = {
        "nb_reviews_training": int(len(reviews)),
        "classes": labels,
        "best_model": best_model_name,
        "accuracy": float(report.get("accuracy", 0.0)),
        "confusion_matrix": {
            "labels": labels,
            "values": confusion_matrix(y_test, predictions, labels=labels).tolist(),
        },
        "model_comparison": comparison,
        "classification_report": report,
    }

    model_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(best_model, model_path)
    SENTIMENT_METRICS_PATH.parent.mkdir(parents=True, exist_ok=True)
    SENTIMENT_METRICS_PATH.write_text(json.dumps(metrics, indent=2, ensure_ascii=False), encoding="utf-8")
    MODEL_COMPARISON_PATH.write_text(json.dumps(comparison, indent=2, ensure_ascii=False), encoding="utf-8")
    return metrics


def load_sentiment_model():
    import joblib

    if not SENTIMENT_MODEL_PATH.exists():
        train_sentiment_model()
    return joblib.load(SENTIMENT_MODEL_PATH)


def predict_sentiment(text: str) -> dict[str, object]:
    model = load_sentiment_model()
    prediction = str(model.predict([text])[0])
    score = None
    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba([text])[0]
        classes = list(model.classes_)
        score = float(probabilities[classes.index(prediction)])
    return apply_sentiment_rules(text, prediction, score)


if __name__ == "__main__":
    print(train_sentiment_model())
