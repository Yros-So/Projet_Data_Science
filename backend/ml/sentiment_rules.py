from __future__ import annotations

import unicodedata


MAX_CONFIDENCE = 0.99

NEGATIVE_PHRASES = (
    "mauvais",
    "mauvaise",
    "mauvaise qualite",
    "qualite faible",
    "qualite mediocre",
    "pas bon",
    "pas bonne",
    "pas recommande",
    "ne recommande pas",
    "nul",
    "nulle",
    "casse",
    "defectueux",
    "defectueuse",
    "abime",
    "decu",
    "decevant",
    "trop petit",
    "trop petite",
    "ne fonctionne pas",
    "fonctionne pas",
    "poor",
    "bad",
    "broken",
    "defective",
    "disappointed",
    "not good",
    "not recommend",
    "terrible",
    "awful",
    "waste",
    "low quality",
    "does not work",
    "doesnt work",
)

POSITIVE_PHRASES = (
    "excellent",
    "tres bon",
    "tres bonne",
    "bon produit",
    "bonne qualite",
    "satisfait",
    "satisfaite",
    "je recommande",
    "recommande",
    "parfait",
    "parfaite",
    "super",
    "great",
    "good quality",
    "very good",
    "perfect",
    "love",
)

NEUTRAL_PHRASES = (
    "correct",
    "moyen",
    "moyenne",
    "sans plus",
    "ok",
    "acceptable",
    "average",
    "neutral",
)


def normalize_text(value: str | None) -> str:
    normalized = unicodedata.normalize("NFKD", (value or "").strip().lower())
    return "".join(character for character in normalized if not unicodedata.combining(character))


def cap_confidence(score: float | None) -> float | None:
    if score is None:
        return None
    return max(0.0, min(float(score), MAX_CONFIDENCE))


def _phrase_hits(text: str, phrases: tuple[str, ...]) -> int:
    return sum(1 for phrase in phrases if phrase in text)


def lexical_sentiment(text: str) -> tuple[str, float] | None:
    normalized = normalize_text(text)
    if not normalized:
        return None

    negative_hits = _phrase_hits(normalized, NEGATIVE_PHRASES)
    positive_hits = _phrase_hits(normalized, POSITIVE_PHRASES)
    neutral_hits = _phrase_hits(normalized, NEUTRAL_PHRASES)

    if negative_hits > positive_hits:
        return "negatif", 0.86
    if positive_hits > negative_hits:
        return "positif", 0.84
    if negative_hits and positive_hits:
        return "negatif", 0.72
    if neutral_hits:
        return "neutre", 0.66
    return None


def apply_sentiment_rules(text: str, model_sentiment: str, confidence: float | None) -> dict[str, object]:
    capped_confidence = cap_confidence(confidence)
    rule = lexical_sentiment(text)
    if rule is None:
        return {"text": text, "sentiment": model_sentiment, "confidence": capped_confidence}

    rule_sentiment, rule_confidence = rule
    if rule_sentiment != model_sentiment:
        return {"text": text, "sentiment": rule_sentiment, "confidence": cap_confidence(rule_confidence)}

    if capped_confidence is None:
        return {"text": text, "sentiment": model_sentiment, "confidence": cap_confidence(rule_confidence)}

    return {
        "text": text,
        "sentiment": model_sentiment,
        "confidence": cap_confidence(max(capped_confidence, rule_confidence)),
    }
