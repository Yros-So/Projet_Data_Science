CREATE TABLE IF NOT EXISTS products (
    parent_asin TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    main_category TEXT,
    supplier_id TEXT,
    store TEXT,
    average_rating DOUBLE PRECISION,
    rating_number INTEGER,
    price DOUBLE PRECISION,
    features TEXT,
    description TEXT,
    categories TEXT
);

CREATE TABLE IF NOT EXISTS product_kpis (
    parent_asin TEXT PRIMARY KEY,
    product_title TEXT,
    main_category TEXT,
    supplier_id TEXT,
    store TEXT,
    nb_reviews INTEGER,
    avg_rating DOUBLE PRECISION,
    positive_rate DOUBLE PRECISION,
    neutral_rate DOUBLE PRECISION,
    negative_rate DOUBLE PRECISION,
    popularity_score DOUBLE PRECISION,
    risk_score DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS supplier_kpis (
    supplier_id TEXT PRIMARY KEY,
    store TEXT,
    nb_products INTEGER,
    nb_reviews INTEGER,
    avg_supplier_rating DOUBLE PRECISION,
    supplier_negative_rate DOUBLE PRECISION,
    verified_rate DOUBLE PRECISION,
    best_product TEXT,
    worst_product TEXT,
    supplier_score DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS recommendations (
    product_id TEXT,
    product_title TEXT,
    recommended_product_id TEXT,
    recommended_title TEXT,
    recommendation_score DOUBLE PRECISION,
    recommendation_type TEXT,
    PRIMARY KEY (product_id, recommended_product_id)
);

CREATE INDEX IF NOT EXISTS idx_product_kpis_risk ON product_kpis (risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_product_kpis_popularity ON product_kpis (popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_product ON recommendations (product_id);

