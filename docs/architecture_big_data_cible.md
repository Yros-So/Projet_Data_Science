# Architecture cible Big Data

Ce document explique franchement la situation actuelle et l'architecture a suivre pour exploiter toute l'etendue du dataset Amazon Reviews 2023.

## 1. Etat actuel du projet

Ce qui est deja fait dans le depot :

```text
Pipeline ETL local
        |
        v
Donnees Silver / Gold
        |
        v
Modele de sentiment simple
        |
        v
Scores produit :
    - risk_score
    - buyability_score
    - future_purchase_score
    - purchase_decision
        |
        v
API FastAPI
        |
        v
Frontend Next.js :
    - dashboard admin
    - catalogue
    - filtres intelligents
    - guide-bot
```

Le projet fonctionne deja en local. Il permet de demontrer la logique metier complete :

- comprendre les avis clients ;
- detecter les produits problematiques ;
- classer les produits en `Achetable`, `A surveiller`, `A eviter` ;
- recommander des produits ;
- guider l'utilisateur avec un bot explicatif.

## 2. Limite actuelle a ne pas cacher

Aujourd'hui, le pipeline ne traite pas encore tout Amazon Reviews 2023.

Si les vrais fichiers ne sont pas presents dans `data/bronze`, le projet genere un dataset demo. Ce choix a ete fait pour que l'application puisse tourner rapidement en local, meme sans telecharger plusieurs Go de donnees.

Chemins attendus pour les vrais fichiers :

```text
data/bronze/raw_review_Amazon_Fashion/
data/bronze/raw_meta_Amazon_Fashion/
```

Le script actuel accepte ces fichiers, mais il reste surtout adapte a un MVP local. Pour traiter toute l'etendue du dataset, il faut passer a une architecture Spark vraiment distribuee ou au minimum a un traitement Spark local partitionne.

## 3. Pourquoi ne pas charger tout le dataset directement

Le dataset Amazon Reviews 2023 complet contient plusieurs centaines de millions d'avis. Meme la categorie Amazon_Fashion peut contenir plusieurs millions d'avis et des centaines de milliers de produits.

Charger tout cela directement avec pandas ou dans une API web poserait plusieurs problemes :

- saturation RAM ;
- temps de lecture trop long ;
- jointures trop lourdes ;
- application frontend lente ;
- modele ML difficile a entrainer en une seule fois ;
- risque de bloquer la machine locale.

La bonne architecture est donc :

```text
Ne jamais faire lire tout le dataset au frontend.
Ne jamais lancer les calculs lourds dans FastAPI.
Preparer les donnees en batch avec Spark.
Stocker les resultats propres et agreges.
Servir uniquement les donnees Gold a l'application.
```

## 4. Architecture cible complete

```text
Amazon Reviews 2023
Hugging Face / fichiers Parquet
        |
        v
Bronze
Donnees brutes partitionnees
category=Amazon_Fashion/year=YYYY
        |
        v
Spark ETL
Schema validation
Nettoyage texte
Deduplication
Creation sentiment
Jointure reviews/products
        |
        v
Silver
reviews_clean partitionne par an/mois
products_clean partitionne par categorie
        |
        v
Gold
product_kpis
supplier_kpis
category_kpis
recommendations
product_scores
training_samples
        |
        +----------------------+
        |                      |
        v                      v
PostgreSQL                 Model Training
tables finales             sentiment / reco / future score
indexes                    model registry
        |                      |
        +----------+-----------+
                   |
                   v
FastAPI
endpoints metier
        |
        v
Next.js
client / fournisseur / admin / guide-bot
```

## 5. Organisation cible des dossiers

```text
data/
  bronze/
    raw_review_Amazon_Fashion/
      year=2020/
      year=2021/
      year=2022/
      year=2023/
    raw_meta_Amazon_Fashion/

  silver/
    reviews_clean/
      year=2020/
      year=2021/
      year=2022/
      year=2023/
    products_clean/

  gold/
    product_kpis/
    supplier_kpis/
    category_kpis/
    product_scores/
    recommendations/
    training_samples/

models/
  sentiment_model.joblib
  recommendation_model.joblib
  metrics/

backend/
  etl/
    etl_spark.py
    etl_spark_distributed.py
    quality_checks.py
  ml/
    train_sentiment_model.py
    train_future_purchase_model.py
    recommendation.py
  api/
    main.py
```

## 6. Donnees a calculer pour rendre le systeme plus intelligent

Pour ameliorer les predictions, il faut enrichir les features.

### Features produit

```text
nb_reviews
avg_rating
positive_rate
negative_rate
verified_rate
avg_helpful_vote
review_recency_score
rating_trend_30d
rating_trend_90d
popularity_trend
price_position
category_rank
supplier_score
```

### Features texte

```text
sentiment_predicted
negative_keywords_count
positive_keywords_count
complaint_topics
quality_mentions
size_mentions
delivery_mentions
```

### Features fournisseur

```text
nb_products
avg_supplier_rating
supplier_negative_rate
supplier_return_risk
best_product_score
worst_product_score
```

### Features temporelles

```text
reviews_last_7_days
reviews_last_30_days
reviews_last_90_days
rating_change_last_30_days
negative_rate_change_last_30_days
```

Ces variables rendent le score `future_purchase_score` plus pertinent, car il ne regarde plus seulement l'etat actuel du produit, mais aussi sa tendance.

## 7. Modeles cibles

### Sentiment

Version actuelle :

```text
TF-IDF + Naive Bayes / Logistic Regression
```

Version cible :

```text
Baseline TF-IDF
Logistic Regression
Linear SVM
DistilBERT ou MiniLM fine-tune
```

### Recommandation

Version actuelle :

```text
similarite contenu + popularite
```

Version cible :

```text
popularite
similarite contenu
collaborative filtering avec user_id / parent_asin
hybride : contenu + comportement + score qualite
```

### Prediction produit futur achetable

Version actuelle :

```text
score metier base sur note, positif, popularite, risque
```

Version cible :

```text
classification ou regression :
predict target_future_buyable

Exemples de cible :
- produit garde une note >= 4 dans les 90 prochains jours
- produit augmente son volume d'avis positifs
- produit reste sous un seuil de risque
```

Modeles possibles :

```text
Logistic Regression
Random Forest
XGBoost / LightGBM
Gradient Boosting
```

## 8. Flux de donnees cible

```text
1. Recuperer Amazon_Fashion depuis Hugging Face.
2. Sauvegarder les fichiers bruts en Bronze.
3. Lancer Spark ETL.
4. Nettoyer et partitionner les avis.
5. Nettoyer les produits.
6. Joindre reviews/products.
7. Calculer les KPIs par produit, fournisseur, categorie.
8. Calculer les tendances temporelles.
9. Generer les features ML.
10. Entrainer les modeles.
11. Sauvegarder les modeles et metrics.
12. Charger les tables Gold dans PostgreSQL.
13. FastAPI expose les resultats.
14. Next.js affiche les scores, filtres, recommandations et guide-bot.
```

## 9. Roadmap pour passer du MVP au vrai Big Data

### Phase 1 - Ce qui existe deja

```text
MVP local
ETL fonctionnel
donnees demo si Bronze vide
scores produit
FastAPI
Next.js
guide-bot
tests
```

### Phase 2 - Ajouter un vrai echantillon Amazon_Fashion

```text
Telecharger un echantillon reel Amazon_Fashion
Le placer dans data/bronze
Relancer python scripts/run_pipeline.py
Comparer les resultats demo vs donnees reelles
```

### Phase 3 - Passer au traitement Spark complet

```text
Installer Java + PySpark
Lire les fichiers Parquet avec spark.read.parquet
Ecrire Silver et Gold en Parquet partitionne
Eviter tout toPandas sur les grosses tables
```

### Phase 4 - Ajouter PostgreSQL comme stockage applicatif principal

```text
docker compose up -d postgres
charger product_kpis, supplier_kpis, recommendations
ajouter index
modifier FastAPI pour lire PostgreSQL au lieu des fichiers
```

### Phase 5 - Ameliorer les predictions

```text
Creer features temporelles
Creer target future_buyable
Comparer plusieurs modeles
Mesurer F1, ROC-AUC, PR-AUC
Versionner les modeles
```

### Phase 6 - Industrialiser

```text
Orchestration Prefect ou Airflow
logs d'execution
monitoring qualite
monitoring drift modeles
CI/CD tests
deploiement API + frontend
```

## 10. Point important pour la soutenance

Il faut presenter le projet sans cacher la limite actuelle :

```text
La version actuelle est un MVP complet.
Elle prouve la chaine metier et technique.
Elle ne traite pas encore tout Amazon Reviews 2023.
L'architecture cible montre comment passer au dataset complet avec Spark, Parquet, PostgreSQL et modeles plus robustes.
```

Cette transparence est positive. Elle montre que le projet est deja fonctionnel et que son evolution Big Data est comprise.
