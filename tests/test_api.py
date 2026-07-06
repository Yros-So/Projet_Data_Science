from __future__ import annotations

import os
import sys
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT_DIR))
os.environ.setdefault("API_DATA_SOURCE", "files")

from fastapi.testclient import TestClient

from backend.api.main import app


def test_api_core_endpoints():
    client = TestClient(app)

    assert client.get("/health").status_code == 200
    assert "data_source" in client.get("/health").json()

    dashboard = client.get("/admin/dashboard")
    assert dashboard.status_code == 200
    assert "global_kpis" in dashboard.json()
    assert "data_quality_report" in dashboard.json()

    products = client.get("/products?limit=3")
    assert products.status_code == 200
    product_payload = products.json()
    assert len(product_payload) > 0
    assert "global_product_id" in product_payload[0]

    filtered_products = client.get("/products?domain=Amazon_Fashion&sentiment=positif&year=2023&risk=faible&limit=5")
    assert filtered_products.status_code == 200

    filter_options = client.get("/filters/options")
    assert filter_options.status_code == 200
    assert "domains" in filter_options.json()

    categories = client.get("/categories/performance")
    assert categories.status_code == 200
    assert len(categories.json()) > 0

    product_id = product_payload[0]["global_product_id"]
    assert client.get(f"/recommendations/{product_id}").status_code == 200

    suppliers = client.get("/suppliers?limit=1")
    assert suppliers.status_code == 200
    supplier_id = suppliers.json()[0]["supplier_id"]
    assert client.get(f"/suppliers/{supplier_id}/negative-reviews").status_code == 200

    prediction = client.post("/sentiment/predict", json={"text": "Produit correct et confortable."})
    assert prediction.status_code == 200
    assert prediction.json()["sentiment"] in {"positif", "neutre", "negatif"}
