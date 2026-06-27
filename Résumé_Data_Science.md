Voici un **résumé clair et utile pour démarrer le projet**, avec une logique cohérente entre **dataset, backend, frontend, utilisateurs, fournisseurs et résultats attendus**.

Tu peux le copier dans ton `README.md`.

````md
# Projet Data Science — Système intelligent d’analyse e-commerce

## 1. Idée générale du projet

Le projet consiste à créer un système intelligent pour un site e-commerce à partir du dataset **Amazon Reviews 2023**, en utilisant principalement la catégorie **Amazon_Fashion**.

L’objectif est d’exploiter les avis clients, les notes et les informations produits afin de :

- analyser la satisfaction des utilisateurs ;
- détecter les produits problématiques ;
- prédire le sentiment d’un avis ;
- recommander des produits pertinents ;
- aider les fournisseurs à améliorer leurs produits ;
- fournir une interface web moderne exploitable dans un vrai projet e-commerce.

Ce projet répond aux exigences de la fiche projet : dataset Big Data, stockage, pipeline ETL, analyse exploratoire, Machine Learning, évaluation, interface de démonstration et rapport technique. :contentReference[oaicite:0]{index=0}

---

## 2. But du projet

Le but principal est de transformer les données d’avis clients en informations utiles pour un site e-commerce.

Le système doit permettre :

- au client de choisir de meilleurs produits ;
- au fournisseur de comprendre les retours clients ;
- à l’administrateur de surveiller la qualité du catalogue ;
- à la plateforme d’améliorer les recommandations et l’expérience utilisateur.

En résumé :

> Le projet transforme les avis clients en décisions utiles pour les utilisateurs, les fournisseurs et la plateforme e-commerce.

---

## 3. Pourquoi ce projet est intéressant

Ce sujet est pertinent car il est directement lié au développement d’un site web e-commerce.

Dans un site marchand, les avis clients sont très importants. Ils permettent de comprendre :

- quels produits sont appréciés ;
- quels produits posent problème ;
- pourquoi les clients sont insatisfaits ;
- quels produits peuvent être recommandés ;
- quels fournisseurs doivent améliorer leurs articles.

Le dataset Amazon Reviews 2023 est intéressant car il contient des données proches d’un vrai site e-commerce :

- avis clients ;
- notes ;
- textes d’avis ;
- utilisateurs ;
- produits ;
- catégories ;
- prix ;
- vendeurs ou fournisseurs ;
- métadonnées produits.

---

## 4. Dataset choisi

Le dataset utilisé est :

```text
Amazon Reviews 2023 — McAuley Lab
````

Le dataset complet contient environ :

```text
571,54 millions d’avis
54,51 millions d’utilisateurs
48,19 millions de produits
33 catégories
```

Comme le dataset complet est trop volumineux pour une machine locale, nous choisissons une seule catégorie :

```text
Amazon_Fashion
```

Cette catégorie contient environ :

```text
2 millions d’utilisateurs
825 900 produits
2,5 millions d’avis
```

Ce volume est suffisant pour justifier une approche Big Data, tout en restant exploitable dans un projet étudiant.

---

## 5. Données utilisées

Le projet utilise deux parties du dataset.

### Avis clients

```text
raw_review_Amazon_Fashion
```

Champs importants :

```text
rating
title
text
asin
parent_asin
user_id
timestamp
helpful_vote
verified_purchase
```

Utilisation :

* analyse des notes ;
* analyse de sentiment ;
* détection des avis négatifs ;
* étude des comportements clients ;
* détection des produits problématiques.

### Métadonnées produits

```text
raw_meta_Amazon_Fashion
```

Champs importants :

```text
title
main_category
average_rating
rating_number
features
description
price
store
categories
parent_asin
```

Utilisation :

* enrichissement des produits ;
* liaison produit/fournisseur ;
* recommandation ;
* analyse par catégorie ;
* analyse de performance fournisseur.

La clé principale entre les avis et les produits est :

```text
parent_asin
```

---

## 6. Problématique métier

La problématique du projet est :

> Comment exploiter les avis clients et les métadonnées produits d’un site e-commerce afin d’analyser la satisfaction des utilisateurs, détecter les produits problématiques et recommander des produits pertinents ?

Cette problématique est intéressante car elle répond à trois besoins.

### Côté utilisateur

Le client veut :

* trouver rapidement un bon produit ;
* éviter les produits mal notés ;
* recevoir des recommandations pertinentes ;
* comprendre la qualité réelle d’un produit.

### Côté fournisseur

Le fournisseur veut :

* connaître la performance de ses produits ;
* identifier les produits avec beaucoup d’avis négatifs ;
* comprendre les problèmes récurrents ;
* améliorer ses produits.

### Côté administrateur

L’administrateur veut :

* surveiller la qualité globale du catalogue ;
* détecter les fournisseurs problématiques ;
* identifier les catégories à risque ;
* suivre l’évolution de la satisfaction client.

---

## 7. Objectifs du projet

Les objectifs principaux sont :

```text
1. Construire un pipeline ETL Big Data avec PySpark.
2. Nettoyer les avis clients et les métadonnées produits.
3. Créer une variable sentiment : positif, neutre, négatif.
4. Faire une analyse exploratoire des données.
5. Identifier les produits populaires et problématiques.
6. Entraîner un modèle de classification de sentiment.
7. Construire un système simple de recommandation.
8. Créer une API backend avec FastAPI.
9. Créer un frontend moderne avec Next.js ou React.
10. Fournir une démonstration finale claire et cohérente.
```

---

## 8. Architecture technique retenue

L’architecture globale du projet est la suivante :

```text
Amazon Reviews 2023
        |
        v
Données brutes Amazon_Fashion
        |
        v
PySpark ETL
        |
        v
Fichiers Parquet nettoyés
        |
        v
Données analytiques Gold
        |
        v
PostgreSQL
        |
        v
FastAPI
        |
        v
Next.js / React
```

Cette architecture est proche d’une vraie application web e-commerce et reste cohérente avec un backend FastAPI.

---

## 9. Rôle de chaque technologie

| Technologie      | Rôle                                                              |
| ---------------- | ----------------------------------------------------------------- |
| Python           | Langage principal du projet                                       |
| PySpark          | Nettoyage, transformation, jointures et agrégations Big Data      |
| Parquet          | Stockage optimisé des données volumineuses                        |
| PostgreSQL       | Stockage relationnel des résultats exploitables par l’application |
| Scikit-learn     | Modèle de sentiment et recommandation simple                      |
| FastAPI          | API backend entre les données et le frontend                      |
| Next.js ou React | Interface web moderne pour client, fournisseur et admin           |
| GitHub           | Versioning et rendu du projet                                     |

---

## 10. Pourquoi utiliser PySpark

PySpark est utilisé pour la partie Data Engineering.

Il permet de traiter efficacement plusieurs millions de lignes sans tout charger en mémoire avec Pandas.

PySpark sert à :

```text
charger les fichiers Parquet
nettoyer les avis
nettoyer les produits
créer la colonne sentiment
faire les jointures reviews/products
calculer les indicateurs produits
calculer les indicateurs fournisseurs
générer les fichiers finaux pour l’application
```

PySpark ne sera pas utilisé directement dans le frontend.

Il prépare les données en amont, puis l’application lit seulement les résultats déjà calculés.

---

## 11. Organisation des données

Le projet suit une architecture en trois couches.

### Bronze

Données brutes.

```text
data/bronze/
    raw_review_Amazon_Fashion/
    raw_meta_Amazon_Fashion/
```

### Silver

Données nettoyées.

```text
data/silver/
    reviews_clean/
    products_clean/
```

Transformations :

```text
suppression des avis vides
nettoyage des textes
conversion des dates
création du sentiment
nettoyage du prix
suppression des doublons
sélection des colonnes utiles
```

### Gold

Données finales utilisées par l’application.

```text
data/gold/
    product_kpis/
    supplier_kpis/
    problematic_products/
    sentiment_stats/
    recommendations/
```

---

## 12. Backend

Le backend peut être construit avec **FastAPI**.

Il sert à exposer les données et les modèles au frontend.

Structure possible :

```text
backend/
    etl_spark.py
    train_sentiment_model.py
    recommendation.py
    database_loader.py
    api/
        main.py
        routes_products.py
        routes_suppliers.py
        routes_admin.py
        routes_ml.py
```

Endpoints possibles :

```text
GET /products
GET /products/{product_id}
GET /products/{product_id}/recommendations
POST /sentiment/predict

GET /suppliers/{supplier_id}/dashboard
GET /suppliers/{supplier_id}/problematic-products

GET /admin/dashboard
GET /admin/problematic-products
GET /admin/suppliers-ranking
```

---

## 13. Frontend

Le frontend peut être développé avec :

```text
Next.js
```

ou :

```text
React.js
```

Next.js est recommandé si tu veux une architecture plus propre, moderne et évolutive.

Structure possible :

```text
frontend/
    app/
        page.tsx
        products/
        products/[id]/
        recommendations/
        supplier/
        supplier/dashboard/
        admin/
        admin/dashboard/
```

Pages importantes :

```text
Page accueil
Catalogue produits
Page détail produit
Page recommandations
Dashboard fournisseur
Dashboard administrateur
Page analyse de sentiment
```

---

## 14. Résultats attendus côté utilisateur

Le client doit pouvoir :

```text
voir les produits les mieux notés
voir les produits similaires
voir le niveau de satisfaction global
éviter les produits avec beaucoup d’avis négatifs
recevoir des recommandations pertinentes
```

Exemple :

```text
Produit : Sac femme noir

Note moyenne : 4.6 / 5
Avis positifs : 82 %
Avis négatifs : 9 %
Niveau de confiance : élevé

Produits recommandés :
- Sac bandoulière noir
- Sac femme cuir marron
- Sac élégant tendance
```

---

## 15. Résultats attendus côté fournisseur

Le fournisseur doit pouvoir :

```text
voir la note moyenne de ses produits
voir ses produits les plus appréciés
voir ses produits problématiques
voir les avis négatifs récents
comprendre les points à améliorer
```

Exemple :

```text
Fournisseur : Fashion Store X

Nombre de produits : 124
Note moyenne : 4.1 / 5
Taux d’avis négatifs : 13 %

Produit le plus performant :
Sac femme noir

Produit à améliorer :
Sandales été femme

Action recommandée :
Analyser les avis liés à la taille et à la qualité du matériau.
```

---

## 16. Résultats attendus côté administrateur

L’administrateur doit pouvoir :

```text
voir les statistiques globales du catalogue
surveiller les produits problématiques
identifier les fournisseurs à risque
analyser les catégories les moins performantes
suivre l’évolution de la satisfaction client
```

---

## 17. Machine Learning prévu

Le projet peut intégrer trois parties Machine Learning.

### Analyse de sentiment

Objectif :

```text
prédire si un avis est positif, neutre ou négatif
```

Transformation :

```text
rating 1 ou 2 -> négatif
rating 3      -> neutre
rating 4 ou 5 -> positif
```

Modèle recommandé pour commencer :

```text
TF-IDF + Logistic Regression
```

### Détection des produits problématiques

Objectif :

```text
identifier les produits avec un fort taux d’avis négatifs
```

Score possible :

```text
risk_score = negative_rate + faible note moyenne + nombre important d’avis
```

### Recommandation produit

Objectif :

```text
proposer des produits pertinents à l’utilisateur
```

Méthodes possibles :

```text
recommandation par popularité
recommandation par note moyenne
recommandation par similarité de texte
recommandation par catégorie
```

---

## 18. Contraintes principales

Le projet doit prendre en compte plusieurs contraintes.

### Volume des données

Le dataset complet est trop volumineux pour être téléchargé entièrement.

Solution :

```text
utiliser uniquement Amazon_Fashion
traiter les données avec PySpark
sauvegarder en Parquet
```

### Mémoire machine

Pandas seul peut être insuffisant.

Solution :

```text
utiliser Spark pour les gros traitements
utiliser Pandas seulement sur les données finales
```

### Qualité des données

Certaines données peuvent être manquantes ou incorrectes.

Solution :

```text
nettoyer les textes
gérer les valeurs nulles
supprimer les doublons
convertir les types
contrôler les notes
```

### Performance frontend

Le frontend doit être fluide.

Solution :

```text
ne pas lancer Spark dans le frontend
préparer les données avant
exposer les résultats via FastAPI
lire les données depuis PostgreSQL
```

---

## 19. Rendu final attendu

Le rendu final doit contenir :

```text
1. Un README technique complet.
2. Un dépôt Git structuré.
3. Un pipeline ETL avec PySpark.
4. Des notebooks d’analyse exploratoire.
5. Un modèle de sentiment entraîné.
6. Un système de recommandation simple.
7. Une API backend FastAPI.
8. Un frontend Next.js ou React.
9. Une démonstration finale de 15 minutes.
```

---

## 20. MVP pour démarrer rapidement

Pour ne pas se perdre, la première version du projet doit rester simple.

### Version 1 du projet

```text
Dataset :
Amazon_Fashion

Backend Data :
PySpark + Parquet

Base :
PostgreSQL

ML :
Analyse de sentiment avec TF-IDF + Logistic Regression

Recommandation :
Produits similaires + produits les mieux notés

API :
FastAPI

Frontend :
Next.js
```

Fonctionnalités MVP :

```text
1. Dashboard global.
2. Liste des produits populaires.
3. Liste des produits problématiques.
4. Page détail produit.
5. Prédiction du sentiment d’un avis.
6. Recommandation de produits similaires.
7. Dashboard fournisseur simple.
```

---

## 21. Première tâche à faire

La première étape concrète est :

```text
1. Télécharger ou lire uniquement les fichiers Parquet Amazon_Fashion.
2. Créer les dossiers bronze, silver et gold.
3. Écrire le script PySpark ETL.
4. Nettoyer les avis.
5. Nettoyer les produits.
6. Joindre reviews et products avec parent_asin.
7. Générer les premiers KPIs produits.
```

Premiers KPIs à calculer :

```text
nombre d’avis par produit
note moyenne par produit
nombre d’avis positifs
nombre d’avis négatifs
taux d’avis négatifs
score de risque produit
score de popularité produit
```

---

## 22. Logique finale du système

La logique du système doit rester simple et cohérente.

```text
Les clients donnent des avis
        |
        v
Le système analyse les avis
        |
        v
Les produits problématiques sont détectés
        |
        v
Les fournisseurs améliorent leurs produits
        |
        v
Les clients reçoivent de meilleures recommandations
        |
        v
La satisfaction globale augmente
```

Ce projet ne se limite donc pas à faire un modèle.

Il construit une vraie chaîne complète :

```text
Big Data
        +
Data Engineering
        +
Machine Learning
        +
Backend API
        +
Frontend Web
        +
Décision métier
```

```

En résumé, pour démarrer efficacement : prends **Amazon_Fashion**, fais d’abord le **pipeline PySpark**, génère des fichiers **Gold**, charge les résultats dans **PostgreSQL**, expose-les avec **FastAPI**, puis construis un frontend **Next.js** orienté **client / fournisseur / admin**.
```
Evite les repetitions : 
Voici la **suite utile pour démarrer concrètement le projet**, toujours au format `README.md`.
Cette partie transforme l’idée en **plan d’action clair** : quoi faire en premier, dans quel ordre, avec quelles tables, quelles APIs et quelles pages frontend.

````md
---

## 23. Stratégie de démarrage du projet

Pour éviter de se perdre, le projet doit être développé progressivement.

Il ne faut pas commencer directement par le frontend.  
La priorité est d’abord de construire une base de données propre et exploitable.

Ordre recommandé :

```text
1. Comprendre les données Amazon_Fashion
2. Créer l’architecture des dossiers
3. Mettre en place le pipeline PySpark
4. Nettoyer les avis et les produits
5. Générer les données Gold
6. Créer les premiers KPIs métier
7. Entraîner un modèle de sentiment simple
8. Créer la base PostgreSQL
9. Développer l’API FastAPI
10. Développer le frontend Next.js
````

Cette organisation respecte la logique attendue dans le projet : dataset Big Data, stockage, ETL, analyse, Machine Learning, évaluation et interface de démonstration. 

---

## 24. Version MVP du projet

La première version du projet doit être simple, fonctionnelle et démontrable.

Le MVP correspond à la version minimale mais complète du système.

### Objectif du MVP

Créer une application capable de :

```text
- charger les données Amazon_Fashion ;
- nettoyer les avis et les produits avec PySpark ;
- calculer les indicateurs produits ;
- détecter les produits problématiques ;
- prédire le sentiment d’un avis ;
- recommander des produits simples ;
- afficher les résultats dans une interface web moderne.
```

### Fonctionnalités MVP

```text
1. Dashboard global
2. Liste des produits populaires
3. Liste des produits problématiques
4. Page détail produit
5. Prédiction de sentiment
6. Recommandation de produits similaires
7. Dashboard fournisseur
```

---

## 25. Découpage logique du système

Le système doit être pensé comme une chaîne complète.

```text
Données brutes
    |
    v
Traitement Big Data
    |
    v
Données propres
    |
    v
Indicateurs métier
    |
    v
Modèles Machine Learning
    |
    v
API backend
    |
    v
Frontend utilisateur / fournisseur / admin
```

Chaque partie dépend de la précédente.

Le frontend ne doit pas recalculer les données.
Il affiche uniquement les résultats préparés par le backend.

---

## 26. Acteurs du système

Le projet doit répondre aux besoins de trois acteurs.

### 26.1 Client

Le client utilise la plateforme pour consulter des produits.

Il veut :

```text
- voir les produits fiables ;
- éviter les produits mal notés ;
- comprendre la satisfaction globale ;
- recevoir des recommandations pertinentes.
```

### 26.2 Fournisseur

Le fournisseur utilise la plateforme pour suivre ses produits.

Il veut :

```text
- connaître ses meilleurs produits ;
- détecter ses produits problématiques ;
- comprendre les avis négatifs ;
- améliorer la qualité de ses produits.
```

### 26.3 Administrateur

L’administrateur surveille la plateforme.

Il veut :

```text
- voir la qualité globale du catalogue ;
- identifier les fournisseurs à risque ;
- suivre les catégories problématiques ;
- contrôler les produits avec beaucoup d’avis négatifs.
```

---

## 27. Données nécessaires pour le MVP

Pour démarrer, il n’est pas nécessaire d’utiliser toutes les colonnes.

### Avis clients

Colonnes utiles :

```text
rating
title
text
parent_asin
user_id
timestamp
helpful_vote
verified_purchase
```

### Produits

Colonnes utiles :

```text
parent_asin
title
main_category
average_rating
rating_number
price
store
categories
features
description
```

### Clé de jointure

La clé principale est :

```text
parent_asin
```

Elle permet de relier :

```text
avis client -> produit -> fournisseur
```

---

## 28. Indicateurs à calculer en premier

Les premiers indicateurs doivent être simples et utiles.

### Indicateurs produit

```text
nb_reviews
avg_rating
nb_positive_reviews
nb_neutral_reviews
nb_negative_reviews
positive_rate
negative_rate
verified_rate
avg_helpful_vote
popularity_score
risk_score
```

### Indicateurs fournisseur

```text
nb_products
nb_reviews
avg_supplier_rating
supplier_negative_rate
best_product
worst_product
supplier_score
```

### Indicateurs globaux

```text
total_reviews
total_products
average_rating_global
positive_rate_global
negative_rate_global
top_categories
top_suppliers
```

---

## 29. Scores métier proposés

Pour rendre le projet plus cohérent, on peut créer des scores métier.

### 29.1 Score de popularité

Ce score permet d’identifier les produits populaires.

```text
popularity_score = nb_reviews + rating_number
```

Version améliorée :

```text
popularity_score = log(1 + nb_reviews) * avg_rating
```

### 29.2 Score de risque produit

Ce score permet de détecter les produits problématiques.

```text
risk_score = negative_rate * 0.6
           + low_rating_rate * 0.3
           + complaint_rate * 0.1
```

Interprétation :

```text
Plus le risk_score est élevé, plus le produit est problématique.
```

### 29.3 Score fournisseur

Ce score permet d’évaluer la qualité globale d’un fournisseur.

```text
supplier_score = avg_supplier_rating
               - supplier_negative_rate
               + verified_rate
```

Interprétation :

```text
Plus le supplier_score est élevé, plus le fournisseur est fiable.
```

---

## 30. Tables finales à créer

Les tables finales peuvent être stockées dans PostgreSQL.

### Table `products`

```text
product_id
parent_asin
title
main_category
supplier_id
price
average_rating
rating_number
```

### Table `suppliers`

```text
supplier_id
store_name
nb_products
supplier_score
```

### Table `reviews`

```text
review_id
user_id
parent_asin
rating
title
text
sentiment
timestamp
helpful_vote
verified_purchase
```

### Table `product_kpis`

```text
parent_asin
nb_reviews
avg_rating
positive_rate
neutral_rate
negative_rate
popularity_score
risk_score
```

### Table `supplier_kpis`

```text
supplier_id
nb_products
nb_reviews
avg_supplier_rating
supplier_negative_rate
supplier_score
```

### Table `recommendations`

```text
product_id
recommended_product_id
recommendation_score
recommendation_type
```

---

## 31. API backend à développer

Le backend sera développé avec FastAPI.

Il servira de lien entre PostgreSQL, les modèles Machine Learning et le frontend.

### Endpoints produits

```text
GET /products
GET /products/{product_id}
GET /products/{product_id}/kpis
GET /products/{product_id}/recommendations
GET /products/problematic
GET /products/popular
```

### Endpoints fournisseurs

```text
GET /suppliers
GET /suppliers/{supplier_id}
GET /suppliers/{supplier_id}/dashboard
GET /suppliers/{supplier_id}/products
GET /suppliers/{supplier_id}/problematic-products
```

### Endpoints administrateur

```text
GET /admin/dashboard
GET /admin/categories/performance
GET /admin/suppliers/ranking
GET /admin/products/problematic
```

### Endpoints Machine Learning

```text
POST /ml/sentiment/predict
GET /ml/recommendations/{product_id}
```

---

## 32. Frontend recommandé

Pour un projet plus moderne et réutilisable, le frontend peut être développé avec :

```text
Next.js
```

Next.js est plus adapté qu’une interface simple de démonstration si l’objectif est de réutiliser le projet dans un vrai site e-commerce.

### Pages principales

```text
/
    Accueil

/products
    Catalogue produits

/products/[id]
    Détail produit

/recommendations
    Recommandations

/supplier/dashboard
    Dashboard fournisseur

/admin/dashboard
    Dashboard administrateur

/sentiment
    Test de prédiction de sentiment
```

---

## 33. Logique frontend par acteur

### Côté client

Pages utiles :

```text
/products
/products/[id]
/recommendations
/sentiment
```

Fonctionnalités :

```text
- consulter les produits ;
- voir la note moyenne ;
- voir le taux d’avis positifs ;
- voir les produits similaires ;
- tester un avis.
```

### Côté fournisseur

Pages utiles :

```text
/supplier/dashboard
/supplier/products
/supplier/problematic-products
```

Fonctionnalités :

```text
- voir les performances de ses produits ;
- identifier les produits à améliorer ;
- consulter les avis négatifs ;
- suivre son score fournisseur.
```

### Côté administrateur

Pages utiles :

```text
/admin/dashboard
/admin/suppliers
/admin/products
/admin/categories
```

Fonctionnalités :

```text
- surveiller la qualité globale ;
- voir les fournisseurs à risque ;
- voir les produits problématiques ;
- suivre les tendances globales.
```

---

## 34. Structure recommandée du dépôt

```text
ecommerce-data-science/
│
├── README.md
├── requirements.txt
├── docker-compose.yml
│
├── data/
│   ├── bronze/
│   ├── silver/
│   └── gold/
│
├── backend/
│   ├── etl/
│   │   └── etl_spark.py
│   │
│   ├── ml/
│   │   ├── train_sentiment_model.py
│   │   └── recommendation.py
│   │
│   ├── api/
│   │   ├── main.py
│   │   ├── routes_products.py
│   │   ├── routes_suppliers.py
│   │   ├── routes_admin.py
│   │   └── routes_ml.py
│   │
│   └── database/
│       ├── models.py
│       ├── connection.py
│       └── load_gold_to_postgres.py
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── package.json
│
├── notebooks/
│   ├── 01_data_loading.ipynb
│   ├── 02_eda.ipynb
│   ├── 03_sentiment_model.ipynb
│   └── 04_recommendation.ipynb
│
├── models/
│   └── sentiment_model.joblib
│
└── docs/
    ├── architecture.md
    └── presentation.md
```

---

## 35. Ordre de développement conseillé

### Étape 1 — Préparation

```text
Créer le dépôt Git
Créer les dossiers du projet
Installer les dépendances
Télécharger ou lire les fichiers Amazon_Fashion
```

### Étape 2 — ETL PySpark

```text
Lire les fichiers Parquet bruts
Nettoyer les avis
Nettoyer les produits
Créer la colonne sentiment
Joindre reviews et products
Sauvegarder les données Silver
```

### Étape 3 — Données Gold

```text
Calculer les KPIs produits
Calculer les KPIs fournisseurs
Calculer les statistiques globales
Détecter les produits problématiques
Créer les fichiers Gold
```

### Étape 4 — Machine Learning

```text
Préparer les textes d’avis
Créer X et y
Entraîner TF-IDF + Logistic Regression
Évaluer le modèle
Sauvegarder le modèle
```

### Étape 5 — Recommandation

```text
Créer une première recommandation par popularité
Ajouter une recommandation par note moyenne
Ajouter une recommandation par similarité de texte
Sauvegarder les recommandations
```

### Étape 6 — Base de données

```text
Créer la base PostgreSQL
Créer les tables
Charger les données Gold
Ajouter les index utiles
```

### Étape 7 — API

```text
Créer l’API FastAPI
Créer les routes produits
Créer les routes fournisseurs
Créer les routes admin
Créer les routes ML
Tester les endpoints
```

### Étape 8 — Frontend

```text
Créer l’application Next.js
Créer la page catalogue
Créer la page détail produit
Créer le dashboard fournisseur
Créer le dashboard admin
Connecter le frontend à FastAPI
```

### Étape 9 — Finalisation

```text
Nettoyer le dépôt Git
Finaliser le README
Préparer la présentation
Préparer une démonstration fluide
```

---

## 36. Ce qu’il faut absolument montrer à la soutenance

La démonstration doit être claire et logique.

Ordre de présentation conseillé :

```text
1. Présentation du problème e-commerce
2. Présentation du dataset Amazon Reviews 2023
3. Pourquoi Amazon_Fashion
4. Architecture technique
5. Pipeline PySpark
6. Résultats EDA
7. Modèle de sentiment
8. Recommandation de produits
9. API backend
10. Interface Next.js
11. Résultats pour client, fournisseur et admin
12. Limites et améliorations
```

---

## 37. Résumé de la logique finale

La logique finale du projet est la suivante :

```text
Les clients donnent des avis.
Les avis sont analysés avec PySpark et Machine Learning.
Les produits problématiques sont détectés.
Les fournisseurs reçoivent des indicateurs pour améliorer leurs produits.
Les clients reçoivent de meilleures recommandations.
L’administrateur surveille la qualité globale du catalogue.
```

Le projet apporte donc de la valeur à tous les acteurs :

```text
Client :
    meilleure expérience d’achat.

Fournisseur :
    meilleure compréhension des retours clients.

Administrateur :
    meilleure surveillance du catalogue.

Plateforme :
    meilleure qualité globale et recommandations plus pertinentes.
```

---

## 38. Ce qu’il faut faire en premier maintenant

La prochaine action concrète est :

```text
Créer le squelette du projet
Mettre les dossiers data/bronze, data/silver, data/gold
Préparer le script PySpark etl_spark.py
Lire les données Amazon_Fashion
Créer les premiers fichiers Gold
```

Premier résultat attendu :

```text
data/gold/product_kpis/
data/gold/problematic_products/
data/gold/supplier_kpis/
```

Quand ces fichiers existent, le reste du projet devient beaucoup plus simple :

```text
PostgreSQL peut les charger.
FastAPI peut les exposer.
Next.js peut les afficher.
```

```

Le plus important pour le démarrage : **ne commence pas par l’interface**. Commence par créer les fichiers `Gold`, car ce sont eux qui vont alimenter tout le reste du système.
```
