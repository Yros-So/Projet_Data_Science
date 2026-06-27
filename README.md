# Projet Data Science - Analyse des avis e-commerce

Ce depot contient un MVP complet pour le projet Data Science : analyse des avis clients Amazon_Fashion, detection des produits problematiques, modele de sentiment, recommandations, API FastAPI, interface Next.js, filtres intelligents et guide-bot utilisateur.

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
| Recommandation | Similarite de contenu + popularite |
| API | FastAPI |
| Interface | Next.js, React |
| Base optionnelle | PostgreSQL via Docker |

## Structure

```text
backend/
  etl/etl_spark.py                 Pipeline ETL Bronze/Silver/Gold
  ml/train_sentiment_model.py      Modele de sentiment
  ml/recommendation.py             Recommandations produits
  api/main.py                      API FastAPI
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

Le projet attend les vrais fichiers Amazon Reviews 2023 ici :

```text
data/bronze/raw_review_Amazon_Fashion/
data/bronze/raw_meta_Amazon_Fashion/
```

Formats acceptes par le MVP : Parquet, CSV, JSON ou JSONL.

Si ces dossiers sont vides, le pipeline genere automatiquement un jeu de donnees de demonstration. Cela permet de tester tout le projet localement sans telecharger plusieurs Go de donnees.

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
2. nettoie les avis et produits ;
3. cree les fichiers Silver ;
4. calcule les KPIs Gold ;
5. genere les recommandations ;
6. entraine le modele de sentiment.

Fichiers generes :

```text
data/silver/reviews_clean.parquet
data/silver/products_clean.parquet
data/gold/products.parquet
data/gold/product_kpis.parquet
data/gold/problematic_products.parquet
data/gold/supplier_kpis.parquet
data/gold/recommendations.parquet
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

Endpoints principaux :

```text
GET  /admin/dashboard
GET  /products
GET  /products/popular
GET  /products/problematic
GET  /products/{product_id}
GET  /products/{product_id}/recommendations
GET  /suppliers
GET  /suppliers/{supplier_id}/dashboard
POST /ml/sentiment/predict
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

Pages disponibles :

- Dashboard admin ;
- Catalogue produits ;
- Analyse produit et recommandations ;
- Dashboard fournisseur ;
- Prediction de sentiment ;
- Guide intelligent.

Le catalogue permet maintenant de differencier clairement les produits :

```text
Decision : Achetable / A surveiller / A eviter
Categorie
Score minimum d'achat
Tri : meilleur achat, potentiel futur, moins risque, meilleure note, popularite
```

Le score d'achat combine la note moyenne, les avis positifs, les achats verifies, la popularite et le risque. Le guide-bot utilise les memes scores pour expliquer quel produit acheter, eviter ou surveiller.

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

Charger les tables Gold :

```bash
python backend/database/load_gold_to_postgres.py
```

La version MVP lit directement les fichiers Gold pour rester simple et rapide. PostgreSQL est prevu pour une version applicative plus complete.

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
