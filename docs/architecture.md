# Architecture du projet

Le projet suit la logique demandee dans les guides :

```text
Amazon Reviews 2023 / donnees demo multi-categories
        |
        v
Bronze : donnees brutes par categorie
Amazon_Fashion / All_Beauty / Appliances
        |
        v
ETL Python compatible PySpark
domain + global_product_id + supplier_id + category_id
        |
        v
Silver : avis et produits nettoyes
        |
        v
Gold : KPIs produits, fournisseurs, categories, recommandations
        |
        v
FastAPI
routes admin / products / suppliers / categories / recommendations / sentiment
        |
        v
Next.js / React
espaces client / fournisseur / administrateur / Data & ML / guide
```

## Couches de donnees

- `data/bronze` : fichiers bruts. Structure recommandee : `data/bronze/{categorie}/reviews/` et `data/bronze/{categorie}/metadata/`.
- `data/silver` : donnees nettoyees.
- `data/gold` : donnees pretes pour l'API et les espaces applicatifs.

Tables Gold globales :

```text
data/gold/product_kpis/
data/gold/supplier_kpis/
data/gold/category_kpis/
data/gold/global_dashboard/
data/gold/problematic_products/
data/gold/recommendations/
```

Si les donnees reelles ne sont pas presentes, le pipeline genere un jeu de donnees de demonstration multi-categories pour permettre une execution locale rapide.

## Relation logique

```text
user_id -> reviews
parent_asin -> reviews + products
store -> supplier
main_category -> category
sentiment -> product_kpis
recommendation_score -> recommendations
```

La chaine metier est :

```text
Avis client -> sentiment -> score produit -> score fournisseur/categorie -> dashboard adapte a chaque acteur.
```

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

- Client : choisit les bons produits, lit les avis et recoit des recommandations.
- Fournisseur : suit ses produits, comprend les avis negatifs et ameliore son catalogue.
- Administrateur : surveille les KPIs globaux, les categories, les fournisseurs et les produits a risque.
- Data & ML : explique le pipeline Bronze/Silver/Gold, les scores, l'entrainement et l'audit live.
