from __future__ import annotations

import pandas as pd

from backend.config import GOLD_PRODUCT_KPIS_PATH, GOLD_PRODUCTS_PATH, GOLD_RECOMMENDATIONS_PATH
from backend.etl.etl_spark import run_etl
from backend.storage import read_table, write_table


def _load_products_and_kpis() -> tuple[pd.DataFrame, pd.DataFrame]:
    try:
        products = read_table(GOLD_PRODUCTS_PATH)
        product_kpis = read_table(GOLD_PRODUCT_KPIS_PATH)
    except FileNotFoundError:
        run_etl()
        products = read_table(GOLD_PRODUCTS_PATH)
        product_kpis = read_table(GOLD_PRODUCT_KPIS_PATH)
    required_columns = {"global_product_id", "domain", "confidence_score"}
    if not required_columns.issubset(products.columns.union(product_kpis.columns)):
        run_etl()
        products = read_table(GOLD_PRODUCTS_PATH)
        product_kpis = read_table(GOLD_PRODUCT_KPIS_PATH)
    return products, product_kpis


def build_recommendations(top_n: int = 5) -> pd.DataFrame:
    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity
    except ImportError as exc:
        raise RuntimeError(
            "Dependances ML manquantes. Installez-les avec: pip install -r requirements.txt"
        ) from exc

    products, product_kpis = _load_products_and_kpis()
    merged = products.merge(
        product_kpis[
            [
                "global_product_id",
                "product_title",
                "avg_rating",
                "positive_rate",
                "popularity_score",
                "confidence_score",
            ]
        ],
        on="global_product_id",
        how="left",
        suffixes=("", "_kpi"),
    )
    merged["content"] = (
        merged["title"].fillna("")
        + " "
        + merged["main_category"].fillna("")
        + " "
        + merged["features"].fillna("")
        + " "
        + merged["description"].fillna("")
        + " "
        + merged["categories"].fillna("")
    )

    if len(merged) <= 1:
        recommendations = pd.DataFrame(
            columns=[
                "product_id",
                "domain",
                "product_title",
                "recommended_product_id",
                "recommended_domain",
                "recommended_title",
                "recommendation_score",
                "recommendation_type",
            ]
        )
        write_table(recommendations, GOLD_RECOMMENDATIONS_PATH)
        return recommendations

    matrix = TfidfVectorizer(max_features=6000, strip_accents="unicode").fit_transform(merged["content"])
    similarity = cosine_similarity(matrix)

    popularity_max = merged["popularity_score"].max() or 1
    rows = []
    for idx, product in merged.reset_index(drop=True).iterrows():
        candidate_scores = []
        for candidate_idx, candidate in merged.reset_index(drop=True).iterrows():
            if idx == candidate_idx:
                continue
            same_category_bonus = 0.08 if product["main_category"] == candidate["main_category"] else 0.0
            popularity_score = float(candidate.get("popularity_score") or 0) / float(popularity_max)
            confidence_score = float(candidate.get("confidence_score") or 0)
            avg_rating_normalized = float(candidate.get("avg_rating") or 0) / 5
            score = (
                float(similarity[idx, candidate_idx]) * 0.4
                + confidence_score * 0.3
                + popularity_score * 0.2
                + avg_rating_normalized * 0.1
            )
            score += same_category_bonus
            candidate_scores.append((score, candidate))

        for score, candidate in sorted(candidate_scores, key=lambda item: item[0], reverse=True)[:top_n]:
            rows.append(
                {
                    "product_id": product["global_product_id"],
                    "domain": product.get("domain"),
                    "product_title": product["title"],
                    "recommended_product_id": candidate["global_product_id"],
                    "recommended_domain": candidate.get("domain"),
                    "recommended_title": candidate["title"],
                    "recommendation_score": round(score, 4),
                    "recommendation_type": "hybride_contenu_confiance_popularite",
                }
            )

    recommendations = pd.DataFrame(rows)
    write_table(recommendations, GOLD_RECOMMENDATIONS_PATH)
    return recommendations


if __name__ == "__main__":
    print(build_recommendations().head())
