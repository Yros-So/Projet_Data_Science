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
Streamlit
```

## Couches de donnees

- `data/bronze` : fichiers bruts. Placer ici les dossiers `raw_review_Amazon_Fashion` et `raw_meta_Amazon_Fashion`.
- `data/silver` : donnees nettoyees.
- `data/gold` : donnees pretes pour l'API et le dashboard.

Si les donnees reelles ne sont pas presentes, le pipeline genere un jeu de donnees de demonstration pour permettre une execution locale rapide.

## Acteurs metier

- Client : consulte les produits, les avis et les recommandations.
- Fournisseur : suit ses produits, son score et les produits a ameliorer.
- Administrateur : surveille les KPIs globaux, les categories, les fournisseurs et les produits a risque.

