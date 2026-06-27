
# Projet Data Science — Analyse des avis clients et recommandation e-commerce

## 1. But du projet

Le but de ce projet est de mettre en place une chaîne complète de traitement et d’analyse de données massives dans un contexte e-commerce.

Le projet consiste à exploiter le dataset **Amazon Reviews 2023**, et plus précisément la catégorie **Amazon_Fashion**, afin d’analyser les avis clients, mesurer la satisfaction des utilisateurs, détecter les produits problématiques et proposer des recommandations de produits.

L’objectif final est de créer une solution capable d’aider un site e-commerce à mieux comprendre ses clients et à améliorer l’expérience utilisateur grâce à la Data Science.

---

## 2. Raison du choix du projet

Ce sujet a été choisi car il est directement lié au développement d’un site web e-commerce.

Dans un site marchand, les avis clients sont une source d’information très importante. Ils permettent de comprendre si les utilisateurs sont satisfaits, quels produits posent problème, quels articles sont les plus appréciés et quels produits peuvent être recommandés à d’autres clients.

Le dataset Amazon Reviews 2023 est adapté à ce projet car il contient un grand volume de données réelles liées au e-commerce : notes, textes d’avis, utilisateurs, produits, métadonnées, prix, catégories et informations sur les achats vérifiés.

Ce choix permet donc de travailler sur un cas concret, utile et proche d’une application réelle.

---

## 3. Objectifs du projet

Les objectifs principaux du projet sont les suivants :

- Analyser les avis clients d’un site e-commerce.
- Étudier la distribution des notes et des sentiments clients.
- Détecter les produits les plus appréciés et les produits problématiques.
- Prédire automatiquement le sentiment d’un avis client : positif, neutre ou négatif.
- Recommander des produits similaires ou populaires.
- Construire un pipeline ETL pour nettoyer et transformer les données.
- Utiliser PySpark pour traiter efficacement un grand volume de données.
- Créer une interface web de démonstration avec Next.js / React.
- Produire un rendu final clair : README, code GitHub, notebook, pipeline et démonstration.

---

## 4. Problématique métier

La problématique retenue est la suivante :

> Comment exploiter les avis clients et les métadonnées produits d’un site e-commerce afin d’analyser la satisfaction des utilisateurs, détecter les produits problématiques et recommander des produits pertinents ?

Cette problématique répond à plusieurs besoins métiers :

- aider les administrateurs à identifier les produits mal notés ;
- comprendre les raisons de l’insatisfaction client ;
- repérer les produits populaires ;
- améliorer la recommandation de produits ;
- enrichir un site e-commerce avec des fonctionnalités intelligentes.

---

## 5. Dataset utilisé

Le dataset utilisé est :

**Amazon Reviews 2023 — McAuley Lab**

Ce dataset contient des avis clients Amazon, des notes, du texte, des identifiants utilisateurs, des identifiants produits et des métadonnées produits.

Le dataset complet est très volumineux. Il contient environ :

- 571,54 millions d’avis ;
- 54,51 millions d’utilisateurs ;
- 48,19 millions de produits ;
- 33 catégories de produits ;
- des interactions allant de 1996 à 2023.

Pour rendre le projet réalisable sur une machine locale, nous avons choisi de travailler uniquement sur la catégorie :

**Amazon_Fashion**

Cette catégorie contient environ :

- 2 millions d’utilisateurs ;
- 825 900 produits ;
- 2,5 millions d’avis ;
- des textes d’avis et des métadonnées produits.

Même limitée à une seule catégorie, cette base reste suffisamment volumineuse pour répondre à une problématique Big Data.

---

## 6. Données utilisées

Deux types de données sont utilisés dans le projet.

### 6.1 Avis clients

Les avis clients contiennent les champs suivants :

- `rating` : note donnée au produit ;
- `title` : titre de l’avis ;
- `text` : contenu de l’avis ;
- `asin` : identifiant du produit ;
- `parent_asin` : identifiant parent du produit ;
- `user_id` : identifiant de l’utilisateur ;
- `timestamp` : date de l’avis ;
- `helpful_vote` : nombre de votes utiles ;
- `verified_purchase` : indique si l’achat est vérifié.

Ces données permettent de faire l’analyse de satisfaction, l’analyse de sentiment et l’étude des comportements clients.

### 6.2 Métadonnées produits

Les métadonnées produits contiennent :

- `title` : nom du produit ;
- `main_category` : catégorie principale ;
- `average_rating` : note moyenne du produit ;
- `rating_number` : nombre de notes ;
- `features` : caractéristiques du produit ;
- `description` : description du produit ;
- `price` : prix ;
- `store` : vendeur ou marque ;
- `categories` : catégories détaillées ;
- `parent_asin` : identifiant parent du produit.

Ces données sont utilisées pour enrichir les analyses et construire un système de recommandation.

---

## 7. Contraintes du projet

Le projet présente plusieurs contraintes importantes.

### 7.1 Volume des données

Le dataset complet est trop volumineux pour être téléchargé entièrement sur une machine locale. Il faut donc éviter de charger toutes les données en mémoire.

Solution retenue :

- ne pas télécharger tout le dataset ;
- sélectionner uniquement la catégorie `Amazon_Fashion` ;
- travailler avec les fichiers Parquet ;
- utiliser PySpark pour traiter les données ;
- créer des fichiers intermédiaires optimisés.

### 7.2 Limites de la machine locale

Une machine personnelle peut avoir des limites en RAM, stockage et puissance de calcul.

Solution retenue :

- traiter les données par étapes ;
- utiliser un échantillon pour le Machine Learning ;
- stocker les données nettoyées au format Parquet ;
- séparer les données brutes, nettoyées et finales.

### 7.3 Qualité des données

Certaines données peuvent être manquantes, mal formatées ou inutilisables.

Exemples :

- avis vides ;
- prix manquants ;
- descriptions absentes ;
- doublons ;
- produits sans métadonnées ;
- classes de sentiments déséquilibrées.

Solution retenue :

- nettoyage des textes ;
- suppression des valeurs inutilisables ;
- gestion des valeurs manquantes ;
- création d’une variable `sentiment` à partir de la note ;
- contrôle des types de données.

### 7.4 Performance

L’interface finale doit être fluide. Il ne faut donc pas lancer Spark à chaque interaction utilisateur.

Solution retenue :

- utiliser Spark uniquement pour l’ETL ;
- sauvegarder les résultats finaux dans des fichiers Parquet ;
- faire lire au frontend Next.js uniquement les données préparées.

---

## 8. Architecture technique

L’architecture technique du projet est organisée en plusieurs couches.

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
Données nettoyées Parquet
        |
        v
Analyse exploratoire + Machine Learning
        |
        v
Backend applicatif
        |
        v
Interface Next.js
````

---

## 9. Architecture des données

Le projet suit une architecture de type **Bronze / Silver / Gold**.

### 9.1 Bronze — Données brutes

Cette couche contient les fichiers originaux du dataset.

```text
data/bronze/
    raw_review_Amazon_Fashion/
    raw_meta_Amazon_Fashion/
```

### 9.2 Silver — Données nettoyées

Cette couche contient les données nettoyées et transformées avec PySpark.

```text
data/silver/
    reviews_clean/
    products_clean/
```

Transformations réalisées :

* suppression des avis vides ;
* nettoyage des textes ;
* conversion des timestamps ;
* création de la colonne `sentiment` ;
* nettoyage des prix ;
* suppression des doublons ;
* sélection des colonnes utiles.

### 9.3 Gold — Données prêtes pour l’analyse

Cette couche contient les données finales utilisées par le dashboard et les modèles.

```text
data/gold/
    product_kpis/
    problematic_products/
    sentiment_stats/
    recommendations/
```

Exemples de résultats stockés :

* produits les plus commentés ;
* produits les mieux notés ;
* produits avec beaucoup d’avis négatifs ;
* statistiques de sentiment ;
* recommandations de produits.

---

## 10. Place de PySpark dans le projet

PySpark est utilisé dans la partie Data Engineering du projet.

Son rôle est de :

* lire les fichiers Parquet volumineux ;
* nettoyer les avis clients ;
* nettoyer les métadonnées produits ;
* créer des variables utiles pour l’analyse ;
* effectuer les jointures entre avis et produits ;
* calculer les indicateurs par produit ;
* générer les fichiers finaux utilisés par l’application.

PySpark n’est pas utilisé directement dans l’interface Next.js. Il sert à préparer les données en amont.

Cela permet de séparer le traitement massif des données et l’affichage interactif.

---

## 11. Backend

Le backend du projet contient la logique de traitement et de Machine Learning.

Il peut être organisé de cette manière :

```text
backend/
    etl_spark.py
    train_sentiment_model.py
    recommendation.py
    database_loader.py
```

### 11.1 `etl_spark.py`

Ce fichier contient le pipeline ETL avec PySpark.

Il permet de :

* charger les données brutes ;
* nettoyer les avis ;
* nettoyer les produits ;
* créer les tables Silver ;
* créer les tables Gold.

### 11.2 `train_sentiment_model.py`

Ce fichier entraîne le modèle d’analyse de sentiment.

Objectif :

* prédire si un avis est positif, neutre ou négatif.

Modèles possibles :

* TF-IDF + Logistic Regression ;
* Naive Bayes ;
* Random Forest ;
* modèle avancé de type BERT ou DistilBERT.

### 11.3 `recommendation.py`

Ce fichier contient la logique de recommandation.

Approches possibles :

* recommander les produits les mieux notés ;
* recommander les produits les plus populaires ;
* recommander des produits similaires avec TF-IDF et similarité cosinus.

### 11.4 `database_loader.py`

Ce fichier peut être utilisé pour charger les données finales dans une base de données.

Bases possibles :

* MongoDB pour les produits et les documents semi-structurés ;
* PostgreSQL pour les avis et les interactions utilisateur-produit.

---

## 12. Frontend

Le frontend est réalisé avec Next.js / React.

Il permet de créer une interface simple pour présenter les résultats du projet.

L’interface peut contenir plusieurs pages.

### 12.1 Dashboard général

Affiche :

* nombre total d’avis ;
* nombre total de produits ;
* note moyenne ;
* distribution des notes ;
* distribution des sentiments ;
* évolution des avis dans le temps.

### 12.2 Analyse des produits

Affiche :

* top produits les plus commentés ;
* top produits les mieux notés ;
* produits problématiques ;
* produits avec beaucoup d’avis négatifs.

### 12.3 Analyse de sentiment

Permet à l’utilisateur de saisir un avis client.

Exemple :

```text
Produit de mauvaise qualité, taille trop petite.
```

Le modèle retourne :

```text
Sentiment prédit : négatif
```

### 12.4 Recommandation de produits

Permet de choisir un produit et d’obtenir des recommandations.

Exemple :

```text
Produit sélectionné : sac femme
Produits recommandés : produits similaires ou mieux notés
```

---

## 13. Machine Learning

Le projet utilise plusieurs approches de Machine Learning.

### 13.1 Apprentissage supervisé

Objectif :

* prédire le sentiment d’un avis.

La variable cible est créée à partir de la note :

| Note   | Sentiment |
| ------ | --------- |
| 1 ou 2 | Négatif   |
| 3      | Neutre    |
| 4 ou 5 | Positif   |

Métriques utilisées :

* Accuracy ;
* Precision ;
* Recall ;
* F1-score ;
* matrice de confusion.

### 13.2 Apprentissage non supervisé

Objectif :

* regrouper les produits similaires.

Méthodes possibles :

* TF-IDF ;
* KMeans ;
* similarité cosinus ;
* réduction de dimension.

### 13.3 Recommandation

Objectif :

* proposer des produits pertinents à l’utilisateur.

Approches possibles :

* recommandation par popularité ;
* recommandation par note moyenne ;
* recommandation basée sur le contenu ;
* recommandation hybride.

---

## 14. Rendu final attendu

Le rendu final du projet comprend :

* un rapport technique sous forme de `README.md` ;
* un dépôt Git contenant tout le code ;
* les scripts ETL avec PySpark ;
* les notebooks d’analyse exploratoire ;
* les modèles Machine Learning entraînés ;
* une interface Next.js fonctionnelle ;
* une démonstration finale du projet.

La démonstration doit montrer :

1. le dataset utilisé ;
2. le pipeline de traitement ;
3. les résultats de l’analyse exploratoire ;
4. le modèle de prédiction de sentiment ;
5. les recommandations de produits ;
6. l’interface utilisateur finale.

---

## 15. Résultat final du projet

À la fin du projet, nous aurons une application de démonstration capable de :

* visualiser les données e-commerce ;
* analyser les avis clients ;
* prédire le sentiment d’un nouvel avis ;
* identifier les produits problématiques ;
* afficher les produits les plus populaires ;
* recommander des produits pertinents.

Ce projet permet donc de relier le Big Data, le Machine Learning et le développement web autour d’un cas concret de site e-commerce.

```
```
La suite ci-dessous complète ton `README.md` avec une partie plus opérationnelle : structure du dépôt, technologies, étapes d’exécution, planning et limites. Elle reste alignée avec la fiche projet : ETL, stockage, EDA, Machine Learning, interface, optimisation et livrables. 

````md
---

## 16. Architecture backend / frontend

Le projet est séparé en deux grandes parties :

```text
1. Backend Data / Machine Learning
2. Frontend de démonstration
````

Le backend s’occupe du traitement massif des données, du nettoyage, de la préparation des indicateurs, de l’entraînement du modèle et de la génération des recommandations.

Le frontend permet de visualiser les résultats, d’interagir avec le modèle et de présenter le projet de manière claire pendant la démonstration finale.

---

## 17. Architecture technique détaillée

```text
                          +-----------------------------+
                          | Amazon Reviews 2023         |
                          | Hugging Face / Parquet      |
                          +-------------+---------------+
                                        |
                                        v
                          +-----------------------------+
                          | Couche Bronze               |
                          | Données brutes              |
                          | reviews + metadata          |
                          +-------------+---------------+
                                        |
                                        v
                          +-----------------------------+
                          | PySpark ETL                 |
                          | Nettoyage / transformation  |
                          | jointures / agrégations     |
                          +-------------+---------------+
                                        |
                                        v
                          +-----------------------------+
                          | Couche Silver               |
                          | Données nettoyées           |
                          | Parquet optimisé            |
                          +-------------+---------------+
                                        |
                                        v
                          +-----------------------------+
                          | Couche Gold                 |
                          | Données finales             |
                          | KPIs / stats / modèles      |
                          +-------------+---------------+
                                        |
                    +-------------------+-------------------+
                    |                                       |
                    v                                       v
       +-----------------------------+        +-----------------------------+
       | Machine Learning            |        | Base de données optionnelle |
       | Sentiment / reco / cluster  |        | MongoDB ou PostgreSQL       |
       +-------------+---------------+        +-------------+---------------+
                     |                                      |
                     v                                      v
             +-----------------------------------------------+
             | Interface Next.js                           |
             | Dashboard / prédiction / recommandation       |
             +-----------------------------------------------+
```

---

## 18. Technologies utilisées

| Partie              | Technologie                | Rôle                                   |
| ------------------- | -------------------------- | -------------------------------------- |
| Langage principal   | Python                     | Développement du projet                |
| Traitement Big Data | PySpark                    | ETL, nettoyage, jointures, agrégations |
| Stockage fichiers   | Parquet                    | Stockage compressé et optimisé         |
| Analyse             | Pandas, DuckDB, Matplotlib | EDA et visualisations                  |
| Machine Learning    | Scikit-learn               | Modèle de sentiment et recommandation  |
| Base de données     | MongoDB ou PostgreSQL      | Stockage applicatif optionnel          |
| Interface           | Next.js / React            | Dashboard et démonstration             |
| Versioning          | Git / GitHub               | Gestion du code source                 |

---

## 19. Organisation du dépôt Git

```text
project-ecommerce-data-science/
│
├── README.md
│
├── requirements.txt
│
├── data/
│   ├── bronze/
│   │   ├── raw_review_Amazon_Fashion/
│   │   └── raw_meta_Amazon_Fashion/
│   │
│   ├── silver/
│   │   ├── reviews_clean/
│   │   └── products_clean/
│   │
│   └── gold/
│       ├── product_kpis/
│       ├── problematic_products/
│       ├── sentiment_stats/
│       └── recommendations/
│
├── backend/
│   ├── etl_spark.py
│   ├── train_sentiment_model.py
│   ├── recommendation.py
│   └── database_loader.py
│
├── notebooks/
│   ├── 01_data_loading.ipynb
│   ├── 02_eda.ipynb
│   ├── 03_sentiment_model.ipynb
│   └── 04_recommendation.ipynb
│
├── models/
│   ├── sentiment_model.joblib
│   └── vectorizer.joblib
│
├── frontend/
│   └── app.py
│
└── docs/
    ├── architecture.png
    └── presentation.pdf
```

---

## 20. Pipeline de traitement

Le pipeline complet suit les étapes suivantes :

```text
1. Extraction des données
2. Nettoyage des avis clients
3. Nettoyage des métadonnées produits
4. Création de la variable sentiment
5. Jointure entre avis et produits
6. Création des indicateurs produits
7. Détection des produits problématiques
8. Préparation des données pour le Machine Learning
9. Entraînement du modèle de sentiment
10. Génération des recommandations
11. Affichage dans Next.js
```

---

## 21. Étapes d’exécution du projet

### 21.1 Installation des dépendances

```bash
pip install -r requirements.txt
```

Exemple de contenu du fichier `requirements.txt` :

```text
pyspark
pandas
pyarrow
duckdb
scikit-learn
next
react
react-dom
matplotlib
joblib
tqdm
huggingface_hub
```

### 21.2 Lancement du pipeline ETL

```bash
python backend/etl_spark.py
```

Ce script permet de générer les données nettoyées dans :

```text
data/silver/
data/gold/
```

### 21.3 Entraînement du modèle de sentiment

```bash
python backend/train_sentiment_model.py
```

Ce script entraîne un modèle capable de prédire le sentiment d’un avis client.

Le modèle est sauvegardé dans :

```text
models/sentiment_model.joblib
```

### 21.4 Génération des recommandations

```bash
python backend/recommendation.py
```

Ce script génère une liste de produits recommandés à partir des notes, des descriptions et des similarités entre produits.

### 21.5 Lancement de l’interface

```bash
cd frontend
npm install
npm run dev
```

---

## 22. Fonctionnalités de l’interface

L’interface Next.js contient plusieurs pages.

### 22.1 Page Dashboard

Cette page affiche une vue globale du dataset :

* nombre total d’avis ;
* nombre total de produits ;
* note moyenne ;
* distribution des notes ;
* distribution des sentiments ;
* évolution des avis dans le temps.

### 22.2 Page Produits

Cette page permet d’analyser les produits :

* produits les plus commentés ;
* produits les mieux notés ;
* produits avec le plus d’avis négatifs ;
* produits problématiques à surveiller.

### 22.3 Page Analyse de sentiment

Cette page permet de tester le modèle.

L’utilisateur saisit un avis client, puis l’application retourne :

* sentiment positif, neutre ou négatif ;
* probabilité de prédiction ;
* interprétation du résultat.

Exemple :

```text
Avis saisi :
"The product is very poor quality and not comfortable."

Résultat :
Sentiment prédit : négatif
```

### 22.4 Page Recommandation

Cette page permet de sélectionner un produit et d’obtenir une liste de produits recommandés.

Les recommandations peuvent être basées sur :

* la popularité ;
* la note moyenne ;
* le nombre d’avis ;
* la similarité textuelle entre produits ;
* la catégorie du produit.

---

## 23. Indicateurs calculés

Les indicateurs principaux du projet sont :

| Indicateur             | Description                               |
| ---------------------- | ----------------------------------------- |
| `nb_reviews`           | Nombre total d’avis par produit           |
| `avg_rating`           | Note moyenne par produit                  |
| `nb_positive_reviews`  | Nombre d’avis positifs                    |
| `nb_neutral_reviews`   | Nombre d’avis neutres                     |
| `nb_negative_reviews`  | Nombre d’avis négatifs                    |
| `negative_rate`        | Pourcentage d’avis négatifs               |
| `verified_rate`        | Pourcentage d’achats vérifiés             |
| `avg_helpful_vote`     | Moyenne des votes utiles                  |
| `popularity_score`     | Score de popularité du produit            |
| `recommendation_score` | Score utilisé pour recommander un produit |

---

## 24. Modèle de sentiment

Le modèle de sentiment utilise le texte des avis clients.

Les notes sont transformées en trois classes :

| Note Amazon | Classe  |
| ----------- | ------- |
| 1 ou 2      | Négatif |
| 3           | Neutre  |
| 4 ou 5      | Positif |

Le texte utilisé pour l’entraînement est composé de :

```text
title + text
```

Le modèle de base choisi est :

```text
TF-IDF + Logistic Regression
```

Ce choix est justifié car il est simple, rapide, interprétable et adapté à une première tâche de classification de texte.

---

## 25. Modèles comparés

Plusieurs modèles peuvent être comparés :

| Modèle              | Type           | Rôle                                    |
| ------------------- | -------------- | --------------------------------------- |
| Naive Bayes         | Supervisé      | Classification rapide de texte          |
| Logistic Regression | Supervisé      | Modèle de référence                     |
| Random Forest       | Supervisé      | Comparaison avec un modèle non linéaire |
| KMeans              | Non supervisé  | Clustering de produits                  |
| Similarité cosinus  | Recommandation | Produits similaires                     |
| TF-IDF              | NLP            | Représentation textuelle                |

Le modèle final est choisi selon les métriques suivantes :

* Accuracy ;
* Precision ;
* Recall ;
* F1-score ;
* matrice de confusion ;
* temps d’entraînement ;
* temps d’inférence.

---

## 26. Contraintes techniques

Le projet doit prendre en compte plusieurs contraintes.

### 26.1 Taille du dataset

Le dataset complet est trop volumineux pour être traité entièrement en local.

Pour cette raison, nous utilisons uniquement la catégorie `Amazon_Fashion`.

### 26.2 Mémoire RAM

Le chargement complet des données dans Pandas peut provoquer des problèmes de mémoire.

Pour éviter cela, nous utilisons PySpark pour les traitements volumineux.

### 26.3 Temps de traitement

Les jointures et agrégations peuvent être longues.

Pour améliorer les performances, les données sont stockées en Parquet et séparées en plusieurs couches : Bronze, Silver et Gold.

### 26.4 Interface utilisateur

Le frontend Next.js ne doit pas lancer les traitements lourds directement.

L’interface lit uniquement les fichiers déjà préparés dans la couche Gold.

---

## 27. Limites du projet

Le projet présente quelques limites :

* le dataset Amazon ne représente pas exactement les données du futur site e-commerce ;
* certaines métadonnées produits peuvent être manquantes ;
* le modèle de sentiment se base sur les notes pour créer les classes ;
* les avis positifs peuvent être plus nombreux que les avis négatifs ;
* les recommandations restent simples dans une première version ;
* le projet est exécuté sur une machine locale et non sur un vrai cluster distribué.

---

## 28. Améliorations possibles

Plusieurs améliorations peuvent être ajoutées dans une version future :

* utiliser une catégorie plus grande comme `Electronics` ou `Clothing_Shoes_and_Jewelry` ;
* intégrer un modèle Transformer comme BERT ou DistilBERT ;
* utiliser un vrai système de recommandation collaboratif ;
* connecter le modèle au vrai site e-commerce ;
* ajouter une API backend avec FastAPI ;
* stocker les résultats dans MongoDB ;
* déployer l’application avec Docker ;
* automatiser le pipeline avec Airflow ;
* utiliser un cloud storage comme AWS S3 ou Google Cloud Storage.

---

## 29. Planning prévisionnel

| Étape     | Description                                                                      |
| --------- | -------------------------------------------------------------------------------- |
| Semaine 1 | Choix du sujet, compréhension du dataset, préparation de l’environnement         |
| Semaine 2 | Chargement des données, mise en place de l’architecture Bronze / Silver / Gold   |
| Semaine 3 | Pipeline ETL avec PySpark                                                        |
| Semaine 4 | Analyse exploratoire des données                                                 |
| Semaine 5 | Entraînement du modèle de sentiment                                              |
| Semaine 6 | Mise en place de la recommandation                                               |
| Semaine 7 | Création de l’interface Next.js                                                |
| Semaine 8 | Finalisation du README, nettoyage du dépôt Git et préparation de la présentation |

---

## 30. Rendu final

Le rendu final du projet sera composé de :

```text
1. Un dépôt Git propre et structuré
2. Un README technique complet
3. Des scripts Python pour l’ETL
4. Des notebooks pour l’analyse exploratoire
5. Un modèle de Machine Learning entraîné
6. Une interface Next.js fonctionnelle
7. Une présentation orale avec démonstration
```

Pendant la démonstration, l’application permettra de :

* visualiser les statistiques des avis ;
* afficher les produits populaires ;
* détecter les produits problématiques ;
* tester le modèle de sentiment ;
* recommander des produits.

---

## 31. Conclusion

Ce projet permet de construire une solution Data Science complète autour d’un cas concret de site e-commerce.

En utilisant le dataset Amazon Reviews 2023, nous pouvons analyser les avis clients, comprendre la satisfaction des utilisateurs, détecter les produits problématiques et proposer des recommandations.

L’utilisation de PySpark permet de traiter efficacement un volume important de données, tandis que Next.js permet de présenter les résultats sous forme d’une interface web moderne et interactive.

Ce projet relie donc plusieurs compétences importantes :

* Big Data ;
* Data Engineering ;
* Analyse exploratoire ;
* Machine Learning ;
* Recommandation ;
* Développement d’interface ;
* Démonstration métier.

L’objectif final est de produire une application capable d’aider un site e-commerce à mieux exploiter ses données clients et produits.

```
```
Oui, exactement. Il faut éviter d’avoir juste une suite de technologies. Ton projet doit raconter une **logique métier cohérente** : les données des avis servent à améliorer l’expérience du **client**, mais aussi à aider le **fournisseur/vendeur** à comprendre ses produits. Cette logique répond bien à la fiche projet : problématique métier, Big Data, ETL, analyse, Machine Learning, interface et résultats exploitables. 

Tu peux continuer ton `README.md` avec cette partie :

````md
---

## 47. Logique métier globale du système

Le projet ne se limite pas à entraîner un modèle de Machine Learning.  
L’objectif est de construire un système cohérent autour d’un site e-commerce, dans lequel chaque donnée a une utilité pour un acteur précis.

Le système vise trois acteurs principaux :

```text
1. Le client / utilisateur
2. Le fournisseur / vendeur
3. L’administrateur de la plateforme
````

La logique générale est la suivante :

```text
Avis clients + Notes + Produits
        |
        v
Analyse de satisfaction
        |
        v
Détection des produits problématiques
        |
        v
Recommandation de produits pertinents
        |
        v
Amélioration de l'expérience client
        |
        v
Aide à la décision pour les fournisseurs
```

Ainsi, les avis clients ne sont pas seulement stockés ou affichés.
Ils deviennent une source de décision pour améliorer les produits, recommander les bons articles et détecter les problèmes qualité.

---

## 48. Logique orientée utilisateur

Pour le client, le système doit permettre de mieux choisir un produit.

Les besoins du client sont les suivants :

* trouver rapidement des produits pertinents ;
* éviter les produits mal notés ;
* comprendre la qualité réelle d’un produit ;
* voir les produits similaires ou mieux évalués ;
* avoir confiance avant d’acheter.

Le système apporte donc plusieurs fonctionnalités côté utilisateur :

```text
Consultation produit
        |
        v
Affichage note moyenne + nombre d'avis
        |
        v
Résumé du sentiment global
        |
        v
Détection des points négatifs fréquents
        |
        v
Recommandation de produits similaires ou mieux notés
```

Exemple :

```text
Un utilisateur consulte un sac.
Le système affiche :
- note moyenne du produit ;
- taux d'avis positifs ;
- taux d'avis négatifs ;
- produits similaires ;
- produits mieux notés ;
- alerte si le produit a beaucoup d'avis négatifs.
```

Résultat attendu pour l’utilisateur :

```text
Meilleure aide à la décision
Moins de risque de mauvais achat
Découverte de produits pertinents
Expérience e-commerce plus personnalisée
```

---

## 49. Logique orientée fournisseur

Pour le fournisseur, le système doit permettre de comprendre la performance de ses produits.

Dans le dataset Amazon Reviews 2023, le champ `store` peut être utilisé comme représentation du vendeur ou fournisseur.

Si le champ `store` est absent, le fournisseur peut être classé comme :

```text
Unknown Supplier
```

Les besoins du fournisseur sont les suivants :

* savoir quels produits sont les mieux notés ;
* identifier les produits avec beaucoup d’avis négatifs ;
* comprendre les problèmes récurrents ;
* comparer ses produits avec la moyenne de la catégorie ;
* améliorer la qualité des produits ;
* suivre la satisfaction client.

Le système fournit donc un tableau de bord fournisseur.

Exemple :

```text
Un fournisseur consulte son dashboard.
Le système affiche :
- nombre total de produits ;
- note moyenne globale ;
- taux d'avis négatifs ;
- produits les plus problématiques ;
- produits les plus appréciés ;
- commentaires négatifs récents ;
- recommandations d'amélioration.
```

Résultat attendu pour le fournisseur :

```text
Meilleure compréhension des retours clients
Détection rapide des problèmes qualité
Priorisation des produits à améliorer
Amélioration de la satisfaction client
```

---

## 50. Logique orientée administrateur

L’administrateur de la plateforme a une vision globale.

Son rôle est de surveiller la qualité générale du catalogue e-commerce.

Le système doit lui permettre de :

* voir les statistiques globales du site ;
* identifier les catégories problématiques ;
* repérer les fournisseurs avec un fort taux d’avis négatifs ;
* surveiller les produits les plus signalés ;
* suivre l’évolution globale de la satisfaction client.

Exemple :

```text
L'administrateur voit que certains produits d'une catégorie ont un taux élevé d'avis négatifs.
Il peut alors :
- contrôler ces produits ;
- contacter le fournisseur ;
- améliorer le classement des produits ;
- masquer ou surveiller les articles problématiques.
```

---

## 51. Relation entre les données du système

Le système repose sur des relations claires entre les entités.

```text
Utilisateur
    |
    | rédige
    v
Avis
    |
    | concerne
    v
Produit
    |
    | appartient à
    v
Catégorie

Produit
    |
    | vendu par
    v
Fournisseur

Avis
    |
    | produit
    v
Sentiment

Produit
    |
    | génère
    v
Recommandations
```

Schéma simplifié :

```text
users
  user_id

reviews
  review_id
  user_id
  parent_asin
  rating
  text
  sentiment
  timestamp
  verified_purchase
  helpful_vote

products
  parent_asin
  title
  category_id
  supplier_id
  price
  average_rating
  rating_number

suppliers
  supplier_id
  store_name

categories
  category_id
  category_name

recommendations
  product_id
  recommended_product_id
  score
```

La clé principale de liaison entre les avis et les produits est :

```text
parent_asin
```

Cette clé permet de joindre les avis clients avec les métadonnées produits.

---

## 52. Modèle relationnel logique

Comme le projet cherche à garder une relation cohérente entre clients, produits, fournisseurs et avis, une base relationnelle comme PostgreSQL est pertinente pour la partie applicative.

Les fichiers Parquet restent utilisés pour le stockage analytique Big Data, mais PostgreSQL peut être utilisé pour exposer les données finales à l’API.

Architecture logique :

```text
Parquet Bronze / Silver / Gold
        |
        v
Tables PostgreSQL finales
        |
        v
API FastAPI
        |
        v
Frontend Next.js
```

Tables principales :

```text
dim_users
dim_products
dim_suppliers
dim_categories
fact_reviews
fact_recommendations
fact_sentiment_predictions
product_kpis
supplier_kpis
```

### `dim_users`

Contient les utilisateurs.

```text
user_id
```

### `dim_products`

Contient les produits.

```text
parent_asin
title
supplier_id
category_id
price
average_rating
rating_number
```

### `dim_suppliers`

Contient les fournisseurs ou vendeurs.

```text
supplier_id
store_name
```

### `dim_categories`

Contient les catégories.

```text
category_id
category_name
```

### `fact_reviews`

Contient les avis clients.

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

### `product_kpis`

Contient les indicateurs par produit.

```text
parent_asin
nb_reviews
avg_rating
positive_rate
neutral_rate
negative_rate
quality_score
risk_score
```

### `supplier_kpis`

Contient les indicateurs par fournisseur.

```text
supplier_id
nb_products
nb_reviews
avg_rating
negative_rate
best_product
worst_product
supplier_score
```

---

## 53. Pourquoi PostgreSQL dans cette logique

Même si les données Amazon sont semi-structurées, la logique finale du projet est relationnelle.

Nous avons des relations fortes entre :

```text
utilisateurs
avis
produits
fournisseurs
catégories
recommandations
```

PostgreSQL est donc adapté pour la partie API et application, car il permet :

* de faire des jointures propres ;
* de relier les produits aux fournisseurs ;
* de relier les avis aux produits ;
* de calculer des indicateurs métier ;
* d’exposer facilement les résultats au frontend ;
* d’ajouter des index pour améliorer les performances.

Les données brutes restent en Parquet, car Parquet est plus adapté au traitement massif avec PySpark.

Le choix final est donc hybride :

```text
Parquet = stockage Big Data et traitement analytique
PostgreSQL = données finales relationnelles pour l'application
```

MongoDB peut rester optionnel pour stocker certains détails produits sous forme JSON, mais le cœur relationnel du système sera plus cohérent avec PostgreSQL.

---

## 54. Logique complète du flux de données

Le flux complet du projet est le suivant :

```text
1. Les données Amazon Reviews 2023 sont récupérées.
2. Les avis et métadonnées produits sont stockés dans la couche Bronze.
3. PySpark nettoie les données.
4. Les avis vides, doublons et valeurs incorrectes sont supprimés.
5. Une colonne sentiment est créée à partir des notes.
6. Les produits sont reliés aux fournisseurs avec le champ store.
7. Les avis sont reliés aux produits avec parent_asin.
8. Les indicateurs produits sont calculés.
9. Les indicateurs fournisseurs sont calculés.
10. Les modèles de Machine Learning sont entraînés.
11. Les résultats sont sauvegardés dans la couche Gold.
12. Les tables finales sont chargées dans PostgreSQL.
13. FastAPI expose les résultats.
14. Next.js affiche les résultats aux utilisateurs, fournisseurs et administrateurs.
```

Schéma :

```text
Amazon Reviews 2023
        |
        v
Bronze : données brutes
        |
        v
PySpark ETL
        |
        v
Silver : données nettoyées
        |
        v
Gold : données métier
        |
        v
PostgreSQL
        |
        v
FastAPI
        |
        v
Next.js
```

---

## 55. Logique du Machine Learning

Le Machine Learning est intégré dans le système avec une logique métier claire.

### 55.1 Analyse de sentiment

Objectif :

```text
Comprendre automatiquement si un avis est positif, neutre ou négatif.
```

Transformation :

```text
rating 1 ou 2 -> négatif
rating 3      -> neutre
rating 4 ou 5 -> positif
```

Utilisation métier :

```text
Client :
    voir si un produit est globalement apprécié.

Fournisseur :
    comprendre les avis négatifs sur ses produits.

Administrateur :
    surveiller les produits avec beaucoup d'insatisfaction.
```

---

### 55.2 Détection des produits problématiques

Objectif :

```text
Identifier les produits qui ont un taux élevé d'avis négatifs.
```

Exemple de score :

```text
risk_score = negative_rate * 0.6 
           + low_rating_rate * 0.3 
           + complaint_rate * 0.1
```

Utilisation métier :

```text
Client :
    éviter les produits risqués.

Fournisseur :
    repérer les produits à améliorer.

Administrateur :
    surveiller la qualité du catalogue.
```

---

### 55.3 Recommandation de produits

Objectif :

```text
Proposer des produits pertinents au client.
```

La recommandation peut utiliser :

```text
note moyenne
nombre d'avis
taux d'avis positifs
catégorie
similarité du titre et de la description
popularité du produit
```

Exemple de score :

```text
recommendation_score = avg_rating * 0.4
                     + positive_rate * 0.3
                     + popularity_score * 0.2
                     + similarity_score * 0.1
```

Utilisation métier :

```text
Client :
    recevoir des produits adaptés.

Fournisseur :
    gagner en visibilité si ses produits sont bien notés.

Plateforme :
    améliorer l'expérience d'achat.
```

---

## 56. Résultats attendus pour chaque acteur

### 56.1 Résultats pour le client

Le client doit obtenir :

```text
- des produits recommandés ;
- des produits similaires ;
- une indication claire sur la satisfaction globale ;
- des alertes sur les produits mal notés ;
- une meilleure confiance avant achat.
```

Exemple d’affichage côté client :

```text
Produit : Sac femme noir

Note moyenne : 4.6 / 5
Avis positifs : 82 %
Avis négatifs : 9 %
Niveau de confiance : élevé

Produits recommandés :
1. Sac femme cuir marron
2. Sac bandoulière noir
3. Sac à main élégant
```

---

### 56.2 Résultats pour le fournisseur

Le fournisseur doit obtenir :

```text
- ses produits les plus appréciés ;
- ses produits les plus problématiques ;
- son taux global d'avis négatifs ;
- la note moyenne de ses produits ;
- les avis récents négatifs ;
- des priorités d'amélioration.
```

Exemple d’affichage côté fournisseur :

```text
Fournisseur : Fashion Store X

Nombre de produits : 124
Note moyenne : 4.1 / 5
Taux d'avis négatifs : 13 %
Produit le plus performant : Sac femme noir
Produit à améliorer : Sandales été femme

Action recommandée :
Analyser les avis négatifs liés à la taille et à la qualité du matériau.
```

---

### 56.3 Résultats pour l’administrateur

L’administrateur doit obtenir :

```text
- vue globale du catalogue ;
- catégories les plus performantes ;
- catégories les plus problématiques ;
- fournisseurs avec fort taux d'insatisfaction ;
- évolution générale des avis ;
- détection des anomalies.
```

Exemple :

```text
Catégorie la plus performante : Accessories
Catégorie à surveiller : Shoes
Fournisseur à surveiller : Store Y
Produit critique : Product Z
```

---

## 57. Pages frontend cohérentes avec la logique métier

Le frontend Next.js doit être organisé selon les acteurs.

```text
/
    Page d'accueil

/client
    Espace utilisateur

/client/products
    Catalogue produits enrichi

/client/product/[id]
    Détail produit avec analyse des avis

/client/recommendations
    Recommandations personnalisées ou similaires

/supplier
    Espace fournisseur

/supplier/dashboard
    Tableau de bord fournisseur

/supplier/products
    Performance des produits du fournisseur

/supplier/alerts
    Produits problématiques et avis négatifs

/admin
    Espace administrateur

/admin/dashboard
    Vue globale du système

/admin/suppliers
    Analyse des fournisseurs

/admin/products
    Surveillance des produits
```

Cette organisation permet d’avoir une interface cohérente avec les besoins métier.

---

## 58. Endpoints API cohérents avec le frontend

Le backend FastAPI expose des endpoints séparés selon les acteurs.

### Client

```http
GET /client/products
GET /client/products/{product_id}
GET /client/recommendations/{product_id}
POST /client/sentiment/predict
```

### Fournisseur

```http
GET /supplier/{supplier_id}/dashboard
GET /supplier/{supplier_id}/products
GET /supplier/{supplier_id}/problematic-products
GET /supplier/{supplier_id}/reviews/negative
```

### Administrateur

```http
GET /admin/dashboard
GET /admin/products/problematic
GET /admin/suppliers/ranking
GET /admin/categories/performance
```

### Machine Learning

```http
POST /ml/sentiment/predict
GET /ml/recommendations/{product_id}
```

Cette séparation rend le backend clair, maintenable et évolutif.

---

## 59. Exemple de parcours utilisateur complet

### Cas 1 : client

```text
1. Le client arrive sur le site.
2. Il consulte un produit.
3. Le frontend appelle l'API produit.
4. L'API retourne les informations du produit.
5. Le frontend affiche la note, les avis et le niveau de confiance.
6. Le client demande des recommandations.
7. L'API retourne des produits similaires ou mieux notés.
8. Le client peut choisir un produit plus adapté.
```

Résultat :

```text
Le client trouve plus rapidement un produit fiable.
```

---

### Cas 2 : fournisseur

```text
1. Le fournisseur se connecte à son dashboard.
2. Le frontend appelle l'API fournisseur.
3. L'API retourne ses indicateurs produits.
4. Le fournisseur voit les produits performants.
5. Il voit aussi les produits problématiques.
6. Il analyse les avis négatifs.
7. Il identifie les points à améliorer.
```

Résultat :

```text
Le fournisseur peut améliorer ses produits à partir des retours clients.
```

---

### Cas 3 : administrateur

```text
1. L'administrateur consulte le dashboard global.
2. Le frontend appelle l'API admin.
3. L'API retourne les statistiques générales.
4. L'administrateur identifie les catégories ou fournisseurs problématiques.
5. Il peut prioriser les contrôles qualité.
```

Résultat :

```text
La plateforme améliore la qualité globale du catalogue.
```

---

## 60. Boucle d’amélioration du système

Le système fonctionne comme une boucle d’amélioration continue.

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

Cette boucle montre que le projet a une vraie logique métier et pas seulement une logique technique.

---

## 61. Résultat final cohérent

Le résultat final attendu est une application web e-commerce intelligente.

Elle doit permettre :

```text
Côté client :
    choisir de meilleurs produits ;
    recevoir des recommandations ;
    comprendre la qualité d'un produit.

Côté fournisseur :
    suivre la performance de ses produits ;
    détecter les problèmes ;
    améliorer son offre.

Côté administrateur :
    surveiller la qualité globale ;
    détecter les anomalies ;
    suivre les performances du catalogue.
```

Le projet final relie donc :

```text
Big Data
Data Engineering
Machine Learning
Backend API
Frontend Web
Décision métier
```

L’ensemble forme une solution cohérente, utile et réutilisable dans un vrai site e-commerce.

```

Le point clé à retenir pour ta soutenance : **ton système transforme les avis clients en décisions utiles**. Pour le client, il recommande mieux. Pour le fournisseur, il aide à améliorer les produits. Pour l’administrateur, il surveille la qualité globale.
```
