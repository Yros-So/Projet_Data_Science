from __future__ import annotations

import argparse
import json
import math
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

import pandas as pd
import requests
from huggingface_hub import hf_hub_url


DATASET_NAME = "McAuley-Lab/Amazon-Reviews-2023"
DEFAULT_CATEGORIES = ("Amazon_Fashion", "Beauty_and_Personal_Care", "Appliances", "Electronics")
DEFAULT_REVIEWS_PER_CATEGORY = 1_500_000
DEFAULT_CHUNK_SIZE = 100_000
REQUEST_TIMEOUT_SECONDS = 180
MAX_STREAM_ATTEMPTS = 3

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
    "domain",
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
    "domain",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Download large Amazon Reviews 2023 samples into the Bronze layer. "
            "The default target is manager-ready: 1,500,000 reviews per selected category."
        )
    )
    parser.add_argument(
        "--categories",
        nargs="+",
        default=list(DEFAULT_CATEGORIES),
        help="Amazon Reviews 2023 categories to download.",
    )
    parser.add_argument(
        "--target-reviews",
        type=int,
        default=None,
        help="Optional total review target across all categories. By default the target is per category.",
    )
    parser.add_argument(
        "--reviews-per-category",
        type=int,
        default=None,
        help="Review count target for every selected category. Default: 1,500,000.",
    )
    parser.add_argument(
        "--category-targets",
        nargs="*",
        default=None,
        metavar="CATEGORY=COUNT",
        help=(
            "Optional per-category targets, for example "
            "Amazon_Fashion=2000000 Beauty_and_Personal_Care=8000000."
        ),
    )
    parser.add_argument(
        "--chunk-size",
        type=int,
        default=DEFAULT_CHUNK_SIZE,
        help="Rows per Parquet part written to Bronze.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("data") / "bronze",
        help="Bronze directory root.",
    )
    parser.add_argument(
        "--metadata-scan-limit",
        type=int,
        default=0,
        help="Maximum metadata rows to scan per category. 0 means scan until all reviewed products are found.",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Replace previously downloaded part-*.parquet files in the target category folders.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the download plan without contacting Hugging Face.",
    )
    return parser.parse_args()


def load_hf_split(config_name: str, token: str | None):
    raise RuntimeError(
        "datasets.load_dataset is not used anymore for Amazon Reviews 2023 because "
        "datasets>=5 rejects the repository dataset script. Use the JSONL streaming "
        "helpers in this file instead."
    )


def remote_review_path(category: str) -> str:
    return f"raw/review_categories/{category}.jsonl"


def remote_metadata_path(category: str) -> str:
    return f"raw/meta_categories/meta_{category}.jsonl"


def auth_headers(token: str | None) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"} if token else {}


def stream_jsonl(path: str, token: str | None) -> Iterable[dict[str, Any]]:
    url = hf_hub_url(DATASET_NAME, path, repo_type="dataset")
    last_error: Exception | None = None

    for attempt in range(1, MAX_STREAM_ATTEMPTS + 1):
        try:
            with requests.get(
                url,
                headers=auth_headers(token),
                stream=True,
                timeout=REQUEST_TIMEOUT_SECONDS,
            ) as response:
                response.raise_for_status()
                for line_number, line in enumerate(response.iter_lines(), start=1):
                    if not line:
                        continue
                    try:
                        yield json.loads(line)
                    except json.JSONDecodeError as exc:
                        raise ValueError(f"Invalid JSON in {path} at line {line_number}") from exc
                return
        except requests.RequestException as exc:
            last_error = exc
            if attempt >= MAX_STREAM_ATTEMPTS:
                break
            wait_seconds = min(30, 2**attempt)
            print(f"[stream] retry {attempt}/{MAX_STREAM_ATTEMPTS} for {path} after: {exc}")
            time.sleep(wait_seconds)

    raise RuntimeError(f"Could not stream {path} from {DATASET_NAME}") from last_error


def json_safe(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, (list, dict)):
        return json.dumps(value, ensure_ascii=False)
    return value


def text_safe(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, float) and pd.isna(value):
        return None
    return str(value)


def normalize_review(record: dict[str, Any], category: str) -> dict[str, Any]:
    parent_asin = str(record.get("parent_asin") or record.get("asin") or "").strip()
    normalized = {
        "rating": record.get("rating"),
        "title": record.get("title"),
        "text": record.get("text"),
        "asin": record.get("asin"),
        "parent_asin": parent_asin,
        "user_id": record.get("user_id"),
        "timestamp": record.get("timestamp"),
        "helpful_vote": record.get("helpful_vote"),
        "verified_purchase": record.get("verified_purchase"),
        "domain": category,
    }
    return normalized


def normalize_metadata(record: dict[str, Any], category: str) -> dict[str, Any]:
    parent_asin = str(record.get("parent_asin") or record.get("asin") or "").strip()
    normalized = {
        "title": record.get("title"),
        "main_category": record.get("main_category"),
        "average_rating": record.get("average_rating"),
        "rating_number": record.get("rating_number"),
        "features": json_safe(record.get("features")),
        "description": json_safe(record.get("description")),
        "price": text_safe(record.get("price")),
        "store": record.get("store"),
        "categories": json_safe(record.get("categories")),
        "parent_asin": parent_asin,
        "domain": category,
    }
    return normalized


def synthetic_metadata(parent_asin: str, category: str) -> dict[str, Any]:
    return {
        "title": f"Produit {parent_asin}",
        "main_category": category,
        "average_rating": None,
        "rating_number": 0,
        "features": None,
        "description": None,
        "price": None,
        "store": "Unknown Supplier",
        "categories": category,
        "parent_asin": parent_asin,
        "domain": category,
    }


def has_existing_data(path: Path) -> bool:
    return path.exists() and any(item.is_file() and item.name != ".gitkeep" for item in path.iterdir())


def prepare_output_dir(path: Path, overwrite: bool) -> None:
    path.mkdir(parents=True, exist_ok=True)
    if has_existing_data(path) and not overwrite:
        raise FileExistsError(
            f"{path} already contains data files. Use --overwrite to replace previous Bronze parts."
        )
    if overwrite:
        for pattern in ("part-*.parquet", "manifest*.json"):
            for item in path.glob(pattern):
                item.unlink()


def write_parquet_part(records: list[dict], output_dir: Path, part_index: int, columns: list[str]) -> Path:
    path = output_dir / f"part-{part_index:05d}.parquet"
    frame = pd.DataFrame.from_records(records)
    for column in columns:
        if column not in frame.columns:
            frame[column] = None
    frame = frame[columns]
    frame.to_parquet(path, index=False)
    return path


def batched_write(
    records: Iterable[dict],
    output_dir: Path,
    chunk_size: int,
    columns: list[str],
    limit: int | None = None,
    progress_label: str | None = None,
) -> tuple[int, list[Path], set[str]]:
    rows = 0
    part_index = 0
    buffer: list[dict] = []
    parent_asins: set[str] = set()
    written: list[Path] = []

    for record in records:
        buffer.append(record)
        rows += 1
        parent_asin = str(record.get("parent_asin") or record.get("asin") or "").strip()
        if parent_asin:
            parent_asins.add(parent_asin)

        if len(buffer) >= chunk_size:
            written.append(write_parquet_part(buffer, output_dir, part_index, columns))
            part_index += 1
            buffer = []
            if progress_label:
                print(f"[{progress_label}] wrote {rows:,} rows")

        if limit is not None and rows >= limit:
            break

    if buffer:
        written.append(write_parquet_part(buffer, output_dir, part_index, columns))

    return rows, written, parent_asins


def review_records(category: str, token: str | None) -> Iterable[dict[str, Any]]:
    for record in stream_jsonl(remote_review_path(category), token):
        normalized = normalize_review(record, category)
        if normalized["parent_asin"]:
            yield normalized


def download_reviews(
    category: str,
    reviews_dir: Path,
    reviews_target: int,
    chunk_size: int,
    token: str | None,
) -> tuple[int, set[str], list[str]]:
    rows, written, parent_asins = batched_write(
        review_records(category, token),
        reviews_dir,
        chunk_size,
        columns=REVIEW_COLUMNS,
        limit=reviews_target,
        progress_label=f"{category}:reviews",
    )
    return rows, parent_asins, [str(path) for path in written]


def metadata_records(category: str, parent_asins: set[str], token: str | None, scan_limit: int) -> Iterable[dict]:
    found: set[str] = set()

    for scanned, record in enumerate(stream_jsonl(remote_metadata_path(category), token), start=1):
        parent_asin = str(record.get("parent_asin") or record.get("asin") or "").strip()
        if parent_asin in parent_asins and parent_asin not in found:
            found.add(parent_asin)
            yield normalize_metadata(record, category)

        if len(found) >= len(parent_asins):
            break
        if scan_limit and scanned >= scan_limit:
            break
        if scanned % 500_000 == 0:
            print(f"[{category}:metadata] scanned {scanned:,} rows, matched {len(found):,}/{len(parent_asins):,}")

    missing = sorted(parent_asins - found)
    if missing:
        print(f"[{category}:metadata] synthesizing {len(missing):,} minimal product rows")
        for parent_asin in missing:
            yield synthetic_metadata(parent_asin, category)


def write_manifest(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def parse_category_targets(raw_targets: list[str] | None) -> dict[str, int]:
    targets: dict[str, int] = {}
    for raw in raw_targets or []:
        if "=" not in raw:
            raise ValueError(f"Invalid --category-targets entry '{raw}'. Expected CATEGORY=COUNT.")
        category, value = raw.split("=", 1)
        category = category.strip()
        if not category:
            raise ValueError(f"Invalid --category-targets entry '{raw}'. Category is empty.")
        try:
            count = int(value.replace("_", ""))
        except ValueError as exc:
            raise ValueError(f"Invalid review count in --category-targets entry '{raw}'.") from exc
        if count < 1:
            raise ValueError(f"Invalid review count in --category-targets entry '{raw}'. Count must be positive.")
        targets[category] = count
    return targets


def main() -> None:
    args = parse_args()
    categories = list(dict.fromkeys(args.categories))
    if not categories:
        raise ValueError("At least one category is required.")
    if args.target_reviews is not None and args.target_reviews < 1:
        raise ValueError("--target-reviews must be positive.")
    if args.reviews_per_category is not None and args.reviews_per_category < 1:
        raise ValueError("--reviews-per-category must be positive.")
    if args.chunk_size < 1:
        raise ValueError("--chunk-size must be positive.")

    category_targets = parse_category_targets(args.category_targets)
    unknown_targets = sorted(set(category_targets) - set(categories))
    if unknown_targets:
        raise ValueError(f"--category-targets contains categories not selected by --categories: {unknown_targets}")

    if category_targets:
        missing_targets = [category for category in categories if category not in category_targets]
        if missing_targets:
            raise ValueError(f"--category-targets must define every selected category. Missing: {missing_targets}")
        reviews_by_category = category_targets
        reviews_per_category: int | None = None
    elif args.reviews_per_category is not None:
        reviews_per_category = args.reviews_per_category
        reviews_by_category = {category: reviews_per_category for category in categories}
    elif args.target_reviews is not None:
        reviews_per_category = math.ceil(args.target_reviews / len(categories))
        reviews_by_category = {category: reviews_per_category for category in categories}
    else:
        reviews_per_category = DEFAULT_REVIEWS_PER_CATEGORY
        reviews_by_category = {category: reviews_per_category for category in categories}
    total_planned = sum(reviews_by_category.values())

    plan = {
        "dataset": DATASET_NAME,
        "categories": categories,
        "target_reviews": args.target_reviews,
        "reviews_per_category": reviews_per_category,
        "reviews_by_category": reviews_by_category,
        "planned_total_reviews": total_planned,
        "manager_requirement": "minimum 1500000 reviews per selected category",
        "output_dir": str(args.output_dir),
        "chunk_size": args.chunk_size,
    }
    print(json.dumps(plan, ensure_ascii=False, indent=2))

    if args.dry_run:
        return

    token = os.getenv("HF_TOKEN") or None
    started_at = datetime.now(timezone.utc).isoformat()
    category_manifests = []
    total_reviews = 0
    total_metadata = 0

    for category in categories:
        category_dir = args.output_dir / category
        reviews_dir = category_dir / "reviews"
        metadata_dir = category_dir / "metadata"
        prepare_output_dir(reviews_dir, args.overwrite)
        prepare_output_dir(metadata_dir, args.overwrite)

        category_review_target = reviews_by_category[category]
        print(f"[{category}] downloading {category_review_target:,} reviews")
        review_rows, parent_asins, review_files = download_reviews(
            category=category,
            reviews_dir=reviews_dir,
            reviews_target=category_review_target,
            chunk_size=args.chunk_size,
            token=token,
        )

        print(f"[{category}] downloading metadata for {len(parent_asins):,} reviewed products")
        metadata_rows, metadata_files, _ = batched_write(
            metadata_records(category, parent_asins, token, args.metadata_scan_limit),
            metadata_dir,
            args.chunk_size,
            columns=PRODUCT_COLUMNS,
            limit=None,
            progress_label=f"{category}:metadata",
        )

        manifest = {
            "category": category,
            "reviews": review_rows,
            "unique_reviewed_products": len(parent_asins),
            "metadata_rows": metadata_rows,
            "review_files": review_files,
            "metadata_files": [str(path) for path in metadata_files],
        }
        write_manifest(category_dir / "manifest_big_data.json", manifest)
        category_manifests.append(manifest)
        total_reviews += review_rows
        total_metadata += metadata_rows
        print(f"[{category}] done: {review_rows:,} reviews, {metadata_rows:,} metadata rows")

    final_manifest = {
        "dataset": DATASET_NAME,
        "started_at": started_at,
        "finished_at": datetime.now(timezone.utc).isoformat(),
        "target_reviews": args.target_reviews,
        "reviews_per_category": reviews_per_category,
        "reviews_by_category": reviews_by_category,
        "actual_reviews": total_reviews,
        "actual_metadata_rows": total_metadata,
        "categories": category_manifests,
    }
    write_manifest(args.output_dir / "manifest_big_data.json", final_manifest)
    print(json.dumps(final_manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
