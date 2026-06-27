from __future__ import annotations

import sys
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT_DIR))

from fastapi.testclient import TestClient

from backend.api.main import app


def main() -> None:
    client = TestClient(app)

    assert client.get("/health").status_code == 200
    assert client.get("/admin/dashboard").status_code == 200

    products_response = client.get("/products?limit=5")
    assert products_response.status_code == 200
    products = products_response.json()
    assert products, "Aucun produit retourne"

    product_id = products[0]["parent_asin"]
    assert client.get(f"/products/{product_id}").status_code == 200
    assert client.get(f"/products/{product_id}/recommendations").status_code == 200

    sentiment_response = client.post(
        "/ml/sentiment/predict",
        json={"text": "Produit de bonne qualite, confortable et elegant."},
    )
    assert sentiment_response.status_code == 200
    assert sentiment_response.json()["sentiment"] in {"positif", "neutre", "negatif"}

    print("Smoke test OK")


if __name__ == "__main__":
    main()

