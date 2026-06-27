from __future__ import annotations

import unicodedata


def normalize(value: str | None) -> str:
    if value is None:
        return ""
    normalized = unicodedata.normalize("NFKD", value.strip().lower())
    return "".join(character for character in normalized if not unicodedata.combining(character))


def has_filter(value: str | None) -> bool:
    return normalize(value) not in {"", "tous", "all"}


def filter_exact(dataframe, column: str, value: str | None):
    if not has_filter(value) or column not in dataframe.columns:
        return dataframe
    return dataframe[dataframe[column].astype(str).map(normalize) == normalize(value)]


def filter_category(dataframe, category: str | None):
    if not has_filter(category):
        return dataframe

    category_norm = normalize(category)
    masks = []
    if "category_id" in dataframe.columns:
        masks.append(dataframe["category_id"].astype(str).map(normalize) == category_norm)
    if "main_category" in dataframe.columns:
        masks.append(dataframe["main_category"].astype(str).map(normalize) == category_norm)
    if not masks:
        return dataframe

    mask = masks[0]
    for next_mask in masks[1:]:
        mask = mask | next_mask
    return dataframe[mask]


def filter_risk(dataframe, risk: str | None):
    if not has_filter(risk) or "risk_score" not in dataframe.columns:
        return dataframe

    risk_norm = normalize(risk)
    if risk_norm in {"faible", "low"}:
        return dataframe[dataframe["risk_score"] < 0.2]
    if risk_norm in {"moyen", "medium"}:
        return dataframe[(dataframe["risk_score"] >= 0.2) & (dataframe["risk_score"] < 0.4)]
    if risk_norm in {"eleve", "high"}:
        return dataframe[dataframe["risk_score"] >= 0.4]
    return dataframe


def filter_year(dataframe, year: int | None):
    if year is None or "min_review_year" not in dataframe.columns or "max_review_year" not in dataframe.columns:
        return dataframe
    return dataframe[(dataframe["min_review_year"] <= year) & (dataframe["max_review_year"] >= year)]


def sort_frame(dataframe, sort_by: str, sort_order: str, sort_columns: dict[str, str], default_column: str):
    sort_key = sort_columns.get(normalize(sort_by), default_column)
    if sort_key not in dataframe.columns:
        return dataframe
    ascending = normalize(sort_order) in {"asc", "ascending", "croissant"}
    return dataframe.sort_values(sort_key, ascending=ascending)
