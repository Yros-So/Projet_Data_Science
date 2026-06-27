from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pandas as pd


def _csv_fallback_path(path: Path) -> Path:
    return path.with_suffix(".csv")


def write_table(df: pd.DataFrame, path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.suffix == ".parquet":
        try:
            df.to_parquet(path, index=False)
            return path
        except Exception:
            fallback = _csv_fallback_path(path)
            df.to_csv(fallback, index=False)
            return fallback
    df.to_csv(path, index=False)
    return path


def read_table(path: Path) -> pd.DataFrame:
    if path.exists():
        if path.suffix == ".parquet":
            return pd.read_parquet(path)
        return pd.read_csv(path)

    fallback = _csv_fallback_path(path)
    if fallback.exists():
        return pd.read_csv(fallback)

    raise FileNotFoundError(f"Table introuvable: {path}")


def write_json(payload: dict[str, Any], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def to_json_records(df: pd.DataFrame) -> list[dict[str, Any]]:
    clean = df.where(pd.notnull(df), None).copy()
    for column in clean.columns:
        if pd.api.types.is_datetime64_any_dtype(clean[column]):
            clean[column] = clean[column].astype(str)
    return clean.to_dict(orient="records")

