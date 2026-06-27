from __future__ import annotations


CATEGORY_CONFIGS = [
    {
        "name": "Amazon_Fashion",
        "enabled": True,
        "priority": 1,
        "expected_scale": "medium",
    },
    {
        "name": "All_Beauty",
        "enabled": True,
        "priority": 2,
        "expected_scale": "small",
    },
    {
        "name": "Appliances",
        "enabled": True,
        "priority": 3,
        "expected_scale": "medium",
    },
    {
        "name": "Electronics",
        "enabled": False,
        "priority": 4,
        "expected_scale": "large",
    },
]

CATEGORIES = CATEGORY_CONFIGS


def enabled_categories() -> list[str]:
    return [item["name"] for item in sorted(CATEGORY_CONFIGS, key=lambda row: row["priority"]) if item["enabled"]]
