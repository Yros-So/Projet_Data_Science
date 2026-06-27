# Projet Data Science - Analyse des avis e-commerce

Ce depot contient un MVP complet pour le projet Data Science : analyse multi-categories des avis clients Amazon Reviews 2023, detection des produits problematiques, modele de sentiment, recommandations, API FastAPI, interface Next.js, filtres intelligents, selection de dataset et guide-bot utilisateur.

Le projet suit la logique des fichiers `Projet Data_Science.md` et `Résumé_Data_Science.md` :

```text
Bronze -> Silver -> Gold -> Machine Learning -> API -> Frontend
```

## Objectif

Transformer les avis clients en informations utiles pour trois acteurs :

- client : mieux choisir un produit et recevoir des recommandations ;
- fournisseur : identifier ses produits a ameliorer ;
- administrateur : surveiller la qualite globale du catalogue.

## Stack technique

| Partie | Technologie |
| --- | --- |
| Traitement data | Python, pandas, PySpark optionnel |
| Stockage analytique | Parquet avec fallback CSV |
| Machine Learning | Scikit-learn, TF-IDF, Logistic Regression |
| Recommandation | Similarite de contenu + confiance + popularite |
| API | FastAPI |
| Interface | Next.js, React |
| Base optionnelle | PostgreSQL via Docker |

## Structure

```text
backend/
  etl/config_categories.py        Categories activees progressivement
  etl/etl_spark.py                 Pipeline ETL Bronze/Silver/Gold
  ml/train_sentiment_model.py      Modele de sentiment
  ml/recommendation.py             Recommandations produits
  api/main.py                      API FastAPI
  api/routes_admin.py              Supervision plateforme
  api/routes_products.py           Catalogue et detail produit
  api/routes_suppliers.py          Espace fournisseur
  api/routes_categories.py         Categories et comparaison
  api/routes_recommendations.py    Recommandations separees
  api/routes_sentiment.py          Prediction de sentiment
  database/                        Schema et chargement PostgreSQL optionnel

frontend/
  app/                             Pages Next.js
  lib/                             Client API
  package.json                     Scripts frontend

scripts/
  run_pipeline.py                  Lance ETL + recommandations + modele ML
  smoke_test.py                    Test rapide des endpoints API

data/
  bronze/                          Donnees brutes
  silver/                          Donnees nettoyees generees
  gold/                            Donnees finales generees

docs/
  architecture.md
  presentation.md
```

## Donnees

Le projet lit les categories activees dans `backend/etl/config_categories.py`.
Par defaut :

```text
Amazon_Fashion
All_Beauty
Appliances
```

Le projet attend les vrais fichiers Amazon Reviews 2023 dans la structure progressive :

```text
data/bronze/Amazon_Fashion/reviews/
data/bronze/Amazon_Fashion/metadata/
data/bronze/All_Beauty/reviews/
data/bronze/All_Beauty/metadata/
data/bronze/Appliances/reviews/
data/bronze/Appliances/metadata/
```

Les anciens chemins `data/bronze/raw_review_Amazon_Fashion/` et `data/bronze/raw_meta_Amazon_Fashion/` restent compatibles pour ne pas casser l'etape deja faite.

Formats acceptes par le MVP : Parquet, CSV, JSON ou JSONL.

Si ces dossiers sont vides, le pipeline genere automatiquement un jeu de donnees de demonstration multi-categories. Cela permet de tester tout le projet localement sans telecharger plusieurs Go de donnees.

## Installation locale

Depuis la racine du projet :

```bash
python -m venv .venv
.venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Si `pyspark` ou Java posent probleme, le MVP reste executable avec le fallback pandas. PySpark est garde comme dependance optionnelle pour la version Big Data complete.

## Etape 1 - Generer les donnees Gold et le modele

```bash
python scripts/run_pipeline.py
```

Ce script :

1. lit les donnees Bronze ou genere les donnees demo ;
2. ajoute `domain`, `global_product_id`, `supplier_id` et `category_id` ;
3. nettoie les avis et produits ;
4. cree les fichiers Silver unifies ;
5. calcule les KPIs Gold produits, fournisseurs et categories ;
6. genere les recommandations ;
7. entraine le modele de sentiment.

Fichiers generes :

```text
data/silver/reviews_clean/data.parquet
data/silver/products_clean/data.parquet
data/gold/products/data.parquet
data/gold/product_kpis/data.parquet
data/gold/supplier_kpis/data.parquet
data/gold/category_kpis/data.parquet
data/gold/global_dashboard/global_kpis.json
data/gold/global_dashboard/data_quality_report.json
data/gold/problematic_products/data.parquet
data/gold/recommendations/data.parquet
models/sentiment_model.joblib
models/metrics/sentiment_metrics.json
```

## Etape 2 - Lancer l'API

```bash
uvicorn backend.api.main:app --reload
```

API locale :

- documentation Swagger : <http://127.0.0.1:8000/docs>
- health check : <http://127.0.0.1:8000/health>

Source des donnees API :

```text
API_DATA_SOURCE=auto      # PostgreSQL si disponible, sinon fichiers Gold
API_DATA_SOURCE=files     # force la lecture des fichiers data/gold
API_DATA_SOURCE=postgres  # force la lecture PostgreSQL
```

Endpoints principaux :

```text
GET  /admin/dashboard
GET  /admin/problematic-products
GET  /admin/categories-risk
GET  /admin/suppliers-risk
GET  /products
GET  /products/{global_product_id}
GET  /products/{global_product_id}/recommendations
GET  /recommendations/{global_product_id}
GET  /filters/options
GET  /categories
GET  /categories/performance
GET  /categories/{category_id}/products
GET  /suppliers
GET  /suppliers/{supplier_id}/dashboard
GET  /suppliers/{supplier_id}/products
GET  /suppliers/{supplier_id}/problematic-products
GET  /suppliers/{supplier_id}/negative-reviews
POST /sentiment/predict
POST /pipeline/run
```

Exemple de filtres catalogue :

```text
GET /products?domain=Amazon_Fashion&supplier=Urban%20Mode&sentiment=positif&risk=faible&year=2023&sort_by=confiance
```

## Etape 3 - Lancer le frontend Next.js

Dans un deuxieme terminal :

```bash
cd frontend
npm install
npm run dev
```

Interface locale :

```text
http://127.0.0.1:3000
```

Le frontend Next.js consomme directement FastAPI :

```text
/health              -> statut API et source active files/postgres
/filters/options     -> listes selectionnables
/products?...        -> catalogue filtre cote serveur
/admin/dashboard?... -> supervision filtree
/suppliers?...       -> espace fournisseur
/categories?...      -> categories et risques
```

Espaces disponibles :

- Administrateur : dashboard global, categories a surveiller, fournisseurs a risque, produits problematiques ;
- Client : catalogue, detail produit, recommandations, analyse de sentiment ;
- Fournisseur : dashboard fournisseur, mes produits, avis negatifs, actions recommandees ;
- Data & ML : pipeline Bronze/Silver/Gold, audit live, modele sentiment, recommandations ;
- Guide : architecture et logique des relations de donnees.

La sidebar permet de choisir le dataset actif :

```text
Tous les datasets
Amazon_Fashion
All_Beauty
Appliances
```

Le catalogue permet de differencier clairement les produits :

```text
Confiance elevee / Confiance moyenne / Produit a surveiller
Decision : Achetable / A surveiller / A eviter
Filtres branches API : dataset, categorie, fournisseur, sentiment, risque, periode
Tri : meilleur achat, potentiel futur, plus sur, meilleure note, popularite
```

Le client ne voit pas les scores techniques bruts. Les KPIs techniques restent reserves a l'administrateur, au fournisseur et a l'espace Data & ML.

La relation suivie par le systeme est :

```text
Avis client
  -> analyse de sentiment
  -> score produit
  -> score fournisseur / categorie
  -> dashboards client, fournisseur, administrateur
```

## Etape 4 - Test rapide

Avec l'API disponible ou directement via `TestClient` :

```bash
python scripts/smoke_test.py
```

Le test verifie :

- `/health` ;
- `/admin/dashboard` ;
- liste produits ;
- detail produit ;
- recommandations ;
- prediction de sentiment.

## PostgreSQL optionnel

Demarrer PostgreSQL :

```bash
docker compose up -d postgres
```

Le PostgreSQL du projet est expose sur le port local `55432` pour eviter les conflits avec une installation PostgreSQL deja presente sur `5432`.

Charger les tables Gold :

```bash
python backend/database/load_gold_to_postgres.py
```

Tables chargees dans PostgreSQL :

```text
products
reviews_sample
product_kpis
supplier_kpis
category_kpis
problematic_products
sentiment_stats
recommendations
global_dashboard
data_quality_report
```

La version MVP lit directement les fichiers Gold pour rester simple et rapide. PostgreSQL est disponible pour valider la couche applicative et les index des tables finales.

## GitHub

Le depot distant configure est :

```text
https://github.com/Yros-So/Projet_Data_Science.git
```

Si un correcteur obtient `Not Found`, le depot est probablement prive. Voir `docs/github_access.md` pour la procedure de mise en public.

Workflow :

```bash
git status
git add .
git commit -m "Implement ecommerce data science MVP"
git push Projet_Data_Science main
```

## Demonstration conseillee

1. Presenter la problematique e-commerce.
2. Montrer l'architecture Bronze/Silver/Gold.
3. Lancer `python scripts/run_pipeline.py`.
4. Ouvrir `/docs` pour montrer l'API.
5. Ouvrir l'interface Next.js pour montrer les dashboards.
6. Tester une prediction de sentiment.
7. Montrer les recommandations produit.
8. Expliquer les limites et ameliorations possibles.

## Conformite et evaluation

Documents utiles pour la soutenance :

- `docs/conformite_cahier_des_charges.md` : correspondance avec les criteres du projet ;
- `docs/architecture.md` : schema technique ;
- `docs/architecture_big_data_cible.md` : architecture cible pour traiter toute l'etendue Amazon Reviews 2023 ;
- `docs/presentation.md` : plan oral ;
- `docs/github_access.md` : verification de l'acces public GitHub.

Commandes de verification :

```bash
python scripts/run_pipeline.py
pytest
python scripts/smoke_test.py
```
