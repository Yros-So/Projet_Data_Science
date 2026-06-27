# Plan de presentation

## 1. Probleme metier

Comment exploiter les avis clients et les metadonnees produits pour analyser la satisfaction, detecter les produits problematiques et recommander des produits pertinents ?

## 2. Dataset

- Amazon Reviews 2023.
- Categorie retenue : Amazon_Fashion.
- Donnees utilisees : avis, notes, texte, utilisateurs, produits, vendeurs, categories, prix.

## 3. Pipeline

1. Lecture Bronze.
2. Nettoyage Silver.
3. Creation du sentiment.
4. Jointure reviews/products.
5. Calcul des KPIs Gold.
6. Entrainement du modele.
7. Generation des recommandations.

## 4. Resultats a montrer

- Dashboard global.
- Produits populaires.
- Produits problematiques.
- Filtres intelligents : achetable, a surveiller, a eviter.
- Guide-bot qui explique la logique du systeme.
- Dashboard fournisseur.
- Prediction de sentiment.
- Recommandations produit.

## 5. Limites

- Le dataset complet est trop volumineux pour une machine locale.
- Le MVP utilise un fallback demo si les vrais fichiers ne sont pas installes.
- Le modele TF-IDF + Logistic Regression est simple mais explicable.
- PostgreSQL est optionnel dans ce MVP ; les fichiers Gold alimentent directement l'API.
