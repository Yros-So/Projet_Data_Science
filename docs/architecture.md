# Architecture du projet

Le projet suit la logique demandee dans les guides :

```text
Amazon Reviews 2023 / donnees demo
        |
        v
Bronze : donnees brutes Amazon_Fashion
        |
        v
ETL Python compatible PySpark
        |
        v
Silver : avis et produits nettoyes
        |
        v
Gold : KPIs, produits problematiques, fournisseurs, recommandations
        |
        v
FastAPI
        |
        v
Next.js / React
```

## Couches de donnees

- `data/bronze` : fichiers bruts. Placer ici les dossiers `raw_review_Amazon_Fashion` et `raw_meta_Amazon_Fashion`.
- `data/silver` : donnees nettoyees.
- `data/gold` : donnees pretes pour l'API et le dashboard.

Si les donnees reelles ne sont pas presentes, le pipeline genere un jeu de donnees de demonstration pour permettre une execution locale rapide.

## Architecture Big Data cible

La version actuelle est un MVP local. L'architecture pour exploiter toute l'etendue du dataset Amazon Reviews 2023 est documentee ici :

```text
docs/architecture_big_data_cible.md
```

Ce document explique :

- ce qui est deja fait ;
- pourquoi le projet ne charge pas tout le dataset directement ;
- comment passer a Spark, Parquet partitionne, PostgreSQL et modeles plus robustes ;
- comment ameliorer la prediction des produits futurs achetables.

## Acteurs metier

- Client : consulte les produits, les avis et les recommandations.
- Fournisseur : suit ses produits, son score et les produits a ameliorer.
- Administrateur : surveille les KPIs globaux, les categories, les fournisseurs et les produits a risque.
