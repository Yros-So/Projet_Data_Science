from __future__ import annotations

import sys
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT_DIR))

from fastapi.testclient import TestClient

from backend.api.main import app


def test_api_core_endpoints():
    client = TestClient(app)

    assert client.get("/health").status_code == 200

    dashboard = client.get("/admin/dashboard")
    assert dashboard.status_code == 200
    assert "global_kpis" in dashboard.json()

    products = client.get("/products?limit=3")
    assert products.status_code == 200
    assert len(products.json()) > 0

    prediction = client.post("/ml/sentiment/predict", json={"text": "Produit correct et confortable."})
    assert prediction.status_code == 200
    assert prediction.json()["sentiment"] in {"positif", "neutre", "negatif"}

