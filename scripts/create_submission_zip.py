from __future__ import annotations

import argparse
import zipfile
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT_DIR / "dist" / "Projet_Data_Science_IBRA_clean.zip"

EXCLUDED_DIRS = {
    ".git",
    ".mypy_cache",
    ".next",
    ".pytest_cache",
    ".ruff_cache",
    ".venv",
    "__pycache__",
    "logs",
    "node_modules",
    "out",
    "postgres_local",
}

EXCLUDED_TOP_LEVEL_DATA_DIRS = {
    Path("data") / "bronze",
    Path("data") / "silver",
    Path("data") / "gold",
    Path("data") / "postgres_local",
    Path("models"),
    Path("dist"),
}

EXCLUDED_SUFFIXES = {".pyc", ".pyo", ".log", ".zip"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create a clean submission ZIP for the Data Science project.")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="Output ZIP path.")
    return parser.parse_args()


def should_exclude(path: Path) -> bool:
    relative = path.relative_to(ROOT_DIR)
    parts = set(relative.parts)
    if parts & EXCLUDED_DIRS:
        return True
    if path.is_file() and path.suffix.lower() in EXCLUDED_SUFFIXES:
        return True
    if relative.name.startswith(".env") and relative.name != ".env.example":
        return True
    for excluded in EXCLUDED_TOP_LEVEL_DATA_DIRS:
        if relative == excluded or excluded in relative.parents:
            return True
    return False


def main() -> None:
    args = parse_args()
    output = args.output.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path in sorted(ROOT_DIR.rglob("*")):
            if path == output or should_exclude(path):
                continue
            if path.is_file():
                archive.write(path, path.relative_to(ROOT_DIR).as_posix())

    print(f"ZIP propre cree: {output}")


if __name__ == "__main__":
    main()
