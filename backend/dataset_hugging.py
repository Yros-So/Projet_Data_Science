from __future__ import annotations

from datasets import load_dataset


DATASET_NAME = "McAuley-Lab/Amazon-Reviews-2023"
CATEGORY = "Amazon_Fashion"


def preview_amazon_fashion(limit: int = 3) -> None:
    reviews = load_dataset(
        DATASET_NAME,
        f"raw_review_{CATEGORY}",
        split="full",
        streaming=True,
        trust_remote_code=True,
    )

    for review in reviews.take(limit):
        print(review)


if __name__ == "__main__":
    preview_amazon_fashion()
