from __future__ import annotations

import os
from typing import Any

import pandas as pd
import requests
import streamlit as st


API_BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8000")


st.set_page_config(
    page_title="Projet Data Science E-commerce",
    page_icon="DS",
    layout="wide",
)


def api_get(path: str) -> Any:
    response = requests.get(f"{API_BASE_URL}{path}", timeout=20)
    response.raise_for_status()
    return response.json()


def api_post(path: str, payload: dict[str, Any]) -> Any:
    response = requests.post(f"{API_BASE_URL}{path}", json=payload, timeout=30)
    response.raise_for_status()
    return response.json()


def dataframe(data: list[dict[str, Any]] | dict[str, Any]) -> pd.DataFrame:
    if isinstance(data, dict):
        return pd.DataFrame([data])
    return pd.DataFrame(data)


def render_api_error() -> None:
    st.error("API FastAPI indisponible.")
    st.code("uvicorn backend.api.main:app --reload", language="bash")
    st.stop()


def sidebar() -> str:
    st.sidebar.title("Projet Data Science")
    st.sidebar.caption("Analyse d'avis clients et recommandation e-commerce")
    return st.sidebar.radio(
        "Navigation",
        [
            "Dashboard admin",
            "Catalogue produits",
            "Analyse produit",
            "Dashboard fournisseur",
            "Prediction sentiment",
        ],
    )


def page_admin() -> None:
    try:
        payload = api_get("/admin/dashboard")
    except requests.RequestException:
        render_api_error()

    kpis = payload["global_kpis"]
    st.title("Dashboard administrateur")
    cols = st.columns(5)
    cols[0].metric("Avis", f"{kpis['total_reviews']:,}".replace(",", " "))
    cols[1].metric("Produits", f"{kpis['total_products']:,}".replace(",", " "))
    cols[2].metric("Fournisseurs", f"{kpis['total_suppliers']:,}".replace(",", " "))
    cols[3].metric("Note moyenne", round(kpis["average_rating_global"], 2))
    cols[4].metric("Avis negatifs", f"{kpis['negative_rate_global']:.0%}")

    left, right = st.columns(2)
    with left:
        st.subheader("Distribution des sentiments")
        sentiments = dataframe(payload["sentiment_stats"])
        st.bar_chart(sentiments.set_index("sentiment")["nb_reviews"])

    with right:
        st.subheader("Performance par categorie")
        categories = dataframe(payload["categories"])
        st.dataframe(categories, use_container_width=True, hide_index=True)

    st.subheader("Produits populaires")
    st.dataframe(dataframe(payload["top_products"]), use_container_width=True, hide_index=True)

    st.subheader("Produits a surveiller")
    st.dataframe(dataframe(payload["problematic_products"]), use_container_width=True, hide_index=True)


def page_catalogue() -> None:
    st.title("Catalogue produits")
    search = st.text_input("Recherche produit", placeholder="sac, montre, sandales...")
    path = f"/products?limit=50&search={search}" if search else "/products?limit=50"
    try:
        products = dataframe(api_get(path))
    except requests.RequestException:
        render_api_error()

    if products.empty:
        st.info("Aucun produit trouve.")
        return

    visible_columns = [
        "parent_asin",
        "title",
        "main_category",
        "store",
        "price",
        "avg_rating",
        "nb_reviews",
        "positive_rate",
        "negative_rate",
        "risk_score",
    ]
    st.dataframe(products[[column for column in visible_columns if column in products.columns]], use_container_width=True)


def page_product() -> None:
    st.title("Analyse produit")
    try:
        products = dataframe(api_get("/products?limit=100"))
    except requests.RequestException:
        render_api_error()

    options = {f"{row['title']} ({row['parent_asin']})": row["parent_asin"] for _, row in products.iterrows()}
    selected_label = st.selectbox("Produit", list(options.keys()))
    product_id = options[selected_label]
    product = api_get(f"/products/{product_id}")

    cols = st.columns(4)
    cols[0].metric("Note moyenne", round(float(product.get("avg_rating") or 0), 2))
    cols[1].metric("Avis", int(product.get("nb_reviews") or 0))
    cols[2].metric("Avis positifs", f"{float(product.get('positive_rate') or 0):.0%}")
    cols[3].metric("Risque", f"{float(product.get('risk_score') or 0):.2f}")

    st.subheader(product["title"])
    st.write(product.get("description", ""))

    left, right = st.columns(2)
    with left:
        st.subheader("Avis recents")
        reviews = dataframe(product.get("recent_reviews", []))
        if reviews.empty:
            st.info("Aucun avis recent.")
        else:
            st.dataframe(reviews[["rating", "sentiment", "text", "verified_purchase"]], use_container_width=True)

    with right:
        st.subheader("Recommandations")
        try:
            recos = dataframe(api_get(f"/products/{product_id}/recommendations"))
        except requests.RequestException:
            recos = pd.DataFrame()
        if recos.empty:
            st.info("Aucune recommandation disponible.")
        else:
            st.dataframe(
                recos[["recommended_product_id", "recommended_title", "recommendation_score"]],
                use_container_width=True,
                hide_index=True,
            )


def page_supplier() -> None:
    st.title("Dashboard fournisseur")
    try:
        suppliers = dataframe(api_get("/suppliers"))
    except requests.RequestException:
        render_api_error()

    options = {f"{row['store']} ({row['supplier_id']})": row["supplier_id"] for _, row in suppliers.iterrows()}
    selected_label = st.selectbox("Fournisseur", list(options.keys()))
    supplier_id = options[selected_label]
    payload = api_get(f"/suppliers/{supplier_id}/dashboard")
    supplier = payload["supplier"]

    cols = st.columns(5)
    cols[0].metric("Produits", int(supplier["nb_products"]))
    cols[1].metric("Avis", int(supplier["nb_reviews"]))
    cols[2].metric("Note moyenne", round(float(supplier["avg_supplier_rating"]), 2))
    cols[3].metric("Avis negatifs", f"{float(supplier['supplier_negative_rate']):.0%}")
    cols[4].metric("Score fournisseur", round(float(supplier["supplier_score"]), 2))

    left, right = st.columns(2)
    with left:
        st.subheader("Meilleurs produits")
        st.dataframe(dataframe(payload["top_products"]), use_container_width=True, hide_index=True)
    with right:
        st.subheader("Produits problematiques")
        st.dataframe(dataframe(payload["problematic_products"]), use_container_width=True, hide_index=True)


def page_sentiment() -> None:
    st.title("Prediction de sentiment")
    text = st.text_area(
        "Avis client",
        value="Produit de mauvaise qualite, taille trop petite.",
        height=140,
    )
    if st.button("Predire le sentiment", type="primary"):
        try:
            result = api_post("/ml/sentiment/predict", {"text": text})
        except requests.RequestException:
            render_api_error()

        st.metric("Sentiment predit", result["sentiment"])
        if result.get("confidence") is not None:
            st.progress(float(result["confidence"]))
            st.caption(f"Confiance: {float(result['confidence']):.0%}")


page = sidebar()
if page == "Dashboard admin":
    page_admin()
elif page == "Catalogue produits":
    page_catalogue()
elif page == "Analyse produit":
    page_product()
elif page == "Dashboard fournisseur":
    page_supplier()
else:
    page_sentiment()

