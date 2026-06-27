# Conformite au cahier des charges

Ce document relie le projet aux criteres attendus dans le sujet : dataset massif, stockage, ETL, EDA, Machine Learning, evaluation, interface et reproductibilite.

## Synthese

| Critere | Reponse du projet |
| --- | --- |
| Probleme metier | Analyse de satisfaction e-commerce, detection de produits problematiques et recommandation. |
| Dataset Big Data | Amazon Reviews 2023, categorie Amazon_Fashion. Le dataset complet Amazon Reviews 2023 contient plusieurs centaines de millions d'avis ; Amazon_Fashion reste volumineux et exploitable localement par echantillonnage ou fichiers Parquet. |
| Stockage | Architecture Bronze/Silver/Gold en fichiers Parquet ; PostgreSQL optionnel pour les tables finales. |
| ETL | Pipeline `backend/etl/etl_spark.py` avec nettoyage avis/produits, sentiment, jointure et KPIs. |
| Qualite donnees | Rapport `data/gold/data_quality_report.json` avec colonnes attendues, null rates, notes valides et unicite produits. |
| ML supervise | Analyse de sentiment avec baseline, Naive Bayes et Logistic Regression. |
| Recommandation | Similarite de contenu TF-IDF + popularite + taux positif. |
| Evaluation | Metrics JSON, comparaison de modeles et matrice de confusion dans `models/metrics/`. |
| Interface | Next.js/React avec dashboard admin, catalogue, produit, fournisseur, prediction, filtres intelligents et guide-bot. |
| Reproductibilite | Scripts `scripts/run_pipeline.py`, `scripts/smoke_test.py`, tests `pytest`, `.env.example` et README. |

## Big Data

Le projet cible le dataset Amazon Reviews 2023, pas le petit jeu de donnees de demonstration.

Le mode demonstration existe uniquement pour permettre de lancer le projet sans telecharger plusieurs Go de donnees. En soutenance, il faut expliquer clairement :

```text
Le pipeline est concu pour Amazon_Fashion.
Si les fichiers reels sont absents, il genere un dataset demo pour verifier l'application.
Les donnees massives doivent etre placees dans data/bronze.
```

Chemins attendus :

```text
data/bronze/raw_review_Amazon_Fashion/
data/bronze/raw_meta_Amazon_Fashion/
```

La version actuelle est volontairement un MVP local. Elle prouve la logique complete, mais ne pretend pas encore traiter les centaines de millions d'avis du dataset complet. L'architecture de passage au vrai Big Data est decrite dans :

```text
docs/architecture_big_data_cible.md
```

L'objectif cible est d'utiliser Spark pour les traitements lourds, Parquet partitionne pour le stockage analytique et PostgreSQL pour les tables finales servies par l'API.

## Stockage

Le stockage analytique principal est Parquet :

- lecture efficace ;
- compression ;
- compatible PySpark ;
- adapte aux traitements batch.

PostgreSQL est prevu pour la partie applicative :

- requetes API ;
- jointures propres ;
- index sur les tables finales ;
- separation entre stockage analytique et exposition applicative.

Schema SQL :

```text
backend/database/schema.sql
```

Chargement optionnel :

```bash
docker compose up -d postgres
python backend/database/load_gold_to_postgres.py
```

## Evaluation Machine Learning

Le script d'entrainement compare maintenant plusieurs modeles :

- baseline majoritaire ;
- Naive Bayes ;
- Logistic Regression.

Sorties :

```text
models/metrics/sentiment_metrics.json
models/metrics/model_comparison.json
```

Le meilleur modele est choisi par `f1_macro`, puis sauvegarde dans :

```text
models/sentiment_model.joblib
```

## Decision produit et aide utilisateur

Le systeme produit une decision lisible pour chaque produit :

```text
Achetable
A surveiller
A eviter
```

Cette decision repose sur la note moyenne, le taux d'avis positifs, les achats verifies, la popularite et le score de risque. Le frontend ajoute un filtre et un tri intelligent pour comparer rapidement les produits.

Un guide-bot est aussi integre. Il aide l'utilisateur a comprendre :

```text
Quel produit acheter ?
Quel produit eviter ?
Quel produit peut marcher dans le futur ?
Comment lire les scores ?
Quel fournisseur est fiable ?
```

## Tests

Tests disponibles :

```bash
pytest
python scripts/smoke_test.py
```

Les tests verifient :

- generation des tables Gold ;
- rapport qualite ;
- API health ;
- dashboard admin ;
- liste produits ;
- prediction de sentiment.

## Limites assumees

- Le dataset demo n'est pas le dataset final ; il sert seulement a tester localement.
- PySpark est garde comme dependance optionnelle, mais le fallback pandas evite de bloquer sur Java/PySpark en local.
- PostgreSQL est optionnel dans le MVP ; les fichiers Gold suffisent pour la demonstration rapide.
- Le modele TF-IDF est explicable et rapide, mais un modele avance type BERT pourrait etre ajoute ensuite.
