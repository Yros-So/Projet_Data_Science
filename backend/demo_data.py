from __future__ import annotations

import random
from datetime import datetime, timedelta

import pandas as pd


PRODUCT_CATALOGS = {
    "Amazon_Fashion": [
        ("AF001", "Sac bandouliere noir elegant", "Fashion", "Urban Mode", 39.9),
        ("AF002", "Sac a main cuir marron", "Fashion", "Urban Mode", 59.9),
        ("AF003", "Baskets blanches confort", "Shoes", "Step&Style", 69.9),
        ("AF004", "Sandales ete femme", "Shoes", "Step&Style", 24.9),
        ("AF005", "Montre minimaliste doree", "Accessories", "Time Boutique", 45.0),
        ("AF006", "Ceinture cuir classique", "Accessories", "Classic Wear", 19.9),
        ("AF007", "Robe fluide imprimee", "Clothing", "Mode Paris", 34.9),
        ("AF008", "Jean slim bleu", "Clothing", "Denim House", 49.9),
        ("AF009", "Lunettes de soleil rondes", "Accessories", "Sunny Store", 18.5),
        ("AF010", "Veste legere mi-saison", "Clothing", "Mode Paris", 74.9),
        ("AF011", "Portefeuille compact noir", "Accessories", "Classic Wear", 22.0),
        ("AF012", "Echarpe douce hiver", "Accessories", "Urban Mode", 16.9),
    ],
    "Beauty_and_Personal_Care": [
        ("BP001", "Serum visage hydratant", "Skin Care", "Glow Lab", 21.9),
        ("BP002", "Creme nuit reparatrice", "Skin Care", "Glow Lab", 27.5),
        ("BP003", "Palette maquillage naturelle", "Makeup", "Beauty Colors", 18.9),
        ("BP004", "Mascara volume noir", "Makeup", "Beauty Colors", 12.5),
        ("BP005", "Shampooing doux cheveux secs", "Hair Care", "Pure Hair", 9.9),
        ("BP006", "Brosse nettoyante visage", "Beauty Tools", "Care Tools", 32.0),
        ("BP007", "Huile corps parfumee", "Body Care", "Nature Spa", 15.9),
        ("BP008", "Kit manucure compact", "Beauty Tools", "Care Tools", 11.9),
    ],
    "Appliances": [
        ("AP001", "Bouilloire electrique rapide", "Kitchen Appliances", "HomeTech", 29.9),
        ("AP002", "Aspirateur compact sans sac", "Home Appliances", "CleanPro", 89.0),
        ("AP003", "Grille-pain inox deux fentes", "Kitchen Appliances", "HomeTech", 24.5),
        ("AP004", "Mini blender smoothie", "Kitchen Appliances", "Mix&Go", 34.9),
        ("AP005", "Purificateur air silencieux", "Home Appliances", "AirCare", 119.0),
        ("AP006", "Robot multifonction cuisine", "Kitchen Appliances", "Mix&Go", 149.0),
        ("AP007", "Fer vapeur leger", "Home Appliances", "CleanPro", 39.9),
        ("AP008", "Balance cuisine digitale", "Kitchen Appliances", "HomeTech", 13.9),
    ],
    "Electronics": [
        ("EL001", "Casque Bluetooth reduction bruit", "Audio", "SoundWave", 89.9),
        ("EL002", "Ecouteurs sans fil sport", "Audio", "SoundWave", 49.9),
        ("EL003", "Chargeur USB-C rapide", "Accessories", "VoltPro", 19.9),
        ("EL004", "Cable HDMI 4K renforce", "Accessories", "VoltPro", 12.9),
        ("EL005", "Webcam full HD", "Computer Accessories", "DeskTech", 39.9),
        ("EL006", "Clavier mecanique compact", "Computer Accessories", "DeskTech", 69.9),
        ("EL007", "Souris sans fil ergonomique", "Computer Accessories", "ClickLab", 24.9),
        ("EL008", "Enceinte portable waterproof", "Audio", "SoundWave", 59.9),
    ],
}

POSITIVE_TEXTS = [
    "Excellent produit, tres bonne qualite et livraison rapide.",
    "Je suis satisfait, l'article est confortable et correspond aux photos.",
    "Bonne finition, style moderne et prix correct.",
    "The product looks great, quality is good and I recommend it.",
]

NEUTRAL_TEXTS = [
    "Produit correct mais la taille est un peu differente.",
    "Article acceptable, rien d'exceptionnel mais utilisable.",
    "La qualite est moyenne, le prix reste raisonnable.",
    "Average product, not bad but not impressive.",
]

NEGATIVE_TEXTS = [
    "Mauvaise qualite, le produit s'abime rapidement.",
    "Taille trop petite et finition decevante.",
    "Je ne recommande pas cet article, experience negative.",
    "Poor quality, uncomfortable and not worth the price.",
]


def _text_for_rating(rating: int) -> str:
    if rating >= 4:
        return random.choice(POSITIVE_TEXTS)
    if rating == 3:
        return random.choice(NEUTRAL_TEXTS)
    return random.choice(NEGATIVE_TEXTS)


def build_demo_data(
    seed: int = 42,
    reviews_per_product: int = 18,
    domain: str = "Amazon_Fashion",
) -> tuple[pd.DataFrame, pd.DataFrame]:
    random.seed(seed + sum(ord(char) for char in domain))
    products_rows = []
    reviews_rows = []
    base_date = datetime(2020, 1, 1)
    products = PRODUCT_CATALOGS.get(domain, PRODUCT_CATALOGS["Amazon_Fashion"])

    for index, (asin, title, category, store, price) in enumerate(products, start=1):
        quality_bias = 0.55 + (index % 5) * 0.08
        if asin in {"AF004", "AF008", "BP004", "AP005"}:
            quality_bias = 0.32

        ratings = []
        for review_index in range(reviews_per_product):
            draw = random.random()
            if draw < quality_bias:
                rating = random.choice([4, 5])
            elif draw < quality_bias + 0.18:
                rating = 3
            else:
                rating = random.choice([1, 2])
            ratings.append(rating)

            timestamp = base_date + timedelta(days=random.randint(0, 1460))
            reviews_rows.append(
                {
                    "rating": rating,
                    "title": "Avis client",
                    "text": _text_for_rating(rating),
                    "asin": asin,
                    "parent_asin": asin,
                    "user_id": f"user_{random.randint(1, 90):03d}",
                    "timestamp": int(timestamp.timestamp() * 1000),
                    "helpful_vote": random.randint(0, 25),
                    "verified_purchase": random.random() > 0.12,
                    "domain": domain,
                }
            )

        avg_rating = round(sum(ratings) / len(ratings), 2)
        products_rows.append(
            {
                "title": title,
                "main_category": category,
                "average_rating": avg_rating,
                "rating_number": len(ratings) + random.randint(20, 350),
                "features": f"{category}, style e-commerce, usage quotidien",
                "description": f"{title} propose par {store}, article {domain} pour demonstration data science.",
                "price": price,
                "store": store,
                "categories": f"{domain}>{category}",
                "parent_asin": asin,
                "domain": domain,
            }
        )

    return pd.DataFrame(reviews_rows), pd.DataFrame(products_rows)
