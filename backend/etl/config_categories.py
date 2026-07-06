from __future__ import annotations


CATEGORY_CONFIGS = [
    {
        "name": "Amazon_Fashion",
        "enabled": True,
        "priority": 1,
        "expected_scale": "medium",
        "target_reviews": 1500000,
    },
    {
        "name": "Beauty_and_Personal_Care",
        "enabled": True,
        "priority": 2,
        "expected_scale": "large",
        "target_reviews": 1500000,
    },
    {
        "name": "Appliances",
        "enabled": True,
        "priority": 3,
        "expected_scale": "medium",
        "target_reviews": 1500000,
    },
    {
        "name": "Electronics",
        "enabled": True,
        "priority": 4,
        "expected_scale": "large",
        "target_reviews": 1500000,
    },
]

CATEGORIES = CATEGORY_CONFIGS


def enabled_categories() -> list[str]:
    return [item["name"] for item in sorted(CATEGORY_CONFIGS, key=lambda row: row["priority"]) if item["enabled"]]
