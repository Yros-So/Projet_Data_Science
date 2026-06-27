CREATE TABLE IF NOT EXISTS products (
    global_product_id TEXT PRIMARY KEY,
    domain TEXT NOT NULL,
    parent_asin TEXT NOT NULL,
    title TEXT NOT NULL,
    main_category TEXT,
    category_id TEXT,
    supplier_id TEXT,
    store TEXT,
    average_rating DOUBLE PRECISION,
    rating_number INTEGER,
    price DOUBLE PRECISION,
    features TEXT,
    description TEXT,
    categories TEXT,
    nb_reviews INTEGER,
    avg_rating DOUBLE PRECISION,
    positive_rate DOUBLE PRECISION,
    neutral_rate DOUBLE PRECISION,
    negative_rate DOUBLE PRECISION,
    dominant_sentiment TEXT,
    min_review_year INTEGER,
    max_review_year INTEGER,
    popularity_score DOUBLE PRECISION,
    risk_score DOUBLE PRECISION,
    confidence_score DOUBLE PRECISION,
    buyability_score DOUBLE PRECISION,
    future_purchase_score DOUBLE PRECISION,
    purchase_decision TEXT,
    purchase_reason TEXT
);

CREATE TABLE IF NOT EXISTS reviews_sample (
    review_id TEXT PRIMARY KEY,
    user_id TEXT,
    global_product_id TEXT,
    parent_asin TEXT,
    domain TEXT,
    product_title TEXT,
    store TEXT,
    rating DOUBLE PRECISION,
    text TEXT,
    sentiment TEXT,
    review_date TIMESTAMP,
    helpful_vote INTEGER,
    verified_purchase BOOLEAN
);

CREATE TABLE IF NOT EXISTS product_kpis (
    global_product_id TEXT PRIMARY KEY,
    parent_asin TEXT,
    domain TEXT NOT NULL,
    product_title TEXT,
    main_category TEXT,
    category_id TEXT,
    supplier_id TEXT,
    store TEXT,
    nb_reviews INTEGER,
    avg_rating DOUBLE PRECISION,
    avg_helpful_vote DOUBLE PRECISION,
    verified_rate DOUBLE PRECISION,
    rating_number INTEGER,
    min_review_year INTEGER,
    max_review_year INTEGER,
    negatif INTEGER,
    neutre INTEGER,
    positif INTEGER,
    positive_rate DOUBLE PRECISION,
    neutral_rate DOUBLE PRECISION,
    negative_rate DOUBLE PRECISION,
    dominant_sentiment TEXT,
    low_rating_rate DOUBLE PRECISION,
    popularity_score DOUBLE PRECISION,
    risk_score DOUBLE PRECISION,
    popularity_norm DOUBLE PRECISION,
    confidence_score DOUBLE PRECISION,
    buyability_score DOUBLE PRECISION,
    future_purchase_score DOUBLE PRECISION,
    purchase_decision TEXT,
    purchase_reason TEXT
);

CREATE TABLE IF NOT EXISTS supplier_kpis (
    supplier_id TEXT,
    store TEXT,
    domain TEXT,
    nb_products INTEGER,
    nb_reviews INTEGER,
    avg_supplier_rating DOUBLE PRECISION,
    supplier_negative_rate DOUBLE PRECISION,
    verified_rate DOUBLE PRECISION,
    nb_problematic_products INTEGER,
    best_product TEXT,
    worst_product TEXT,
    supplier_score DOUBLE PRECISION,
    PRIMARY KEY (supplier_id, domain)
);

CREATE TABLE IF NOT EXISTS category_kpis (
    category_id TEXT,
    domain TEXT,
    main_category TEXT,
    nb_products INTEGER,
    nb_reviews INTEGER,
    avg_rating DOUBLE PRECISION,
    positive_rate DOUBLE PRECISION,
    neutral_rate DOUBLE PRECISION,
    negative_rate DOUBLE PRECISION,
    risk_score DOUBLE PRECISION,
    buyability_score DOUBLE PRECISION,
    future_purchase_score DOUBLE PRECISION,
    category_score DOUBLE PRECISION,
    PRIMARY KEY (category_id, domain)
);

CREATE TABLE IF NOT EXISTS problematic_products (
    global_product_id TEXT PRIMARY KEY,
    domain TEXT NOT NULL,
    parent_asin TEXT,
    product_title TEXT,
    main_category TEXT,
    category_id TEXT,
    supplier_id TEXT,
    store TEXT,
    nb_reviews INTEGER,
    avg_rating DOUBLE PRECISION,
    avg_helpful_vote DOUBLE PRECISION,
    verified_rate DOUBLE PRECISION,
    rating_number INTEGER,
    min_review_year INTEGER,
    max_review_year INTEGER,
    negatif INTEGER,
    neutre INTEGER,
    positif INTEGER,
    positive_rate DOUBLE PRECISION,
    neutral_rate DOUBLE PRECISION,
    negative_rate DOUBLE PRECISION,
    dominant_sentiment TEXT,
    low_rating_rate DOUBLE PRECISION,
    popularity_score DOUBLE PRECISION,
    risk_score DOUBLE PRECISION,
    popularity_norm DOUBLE PRECISION,
    confidence_score DOUBLE PRECISION,
    buyability_score DOUBLE PRECISION,
    future_purchase_score DOUBLE PRECISION,
    purchase_decision TEXT,
    purchase_reason TEXT
);

CREATE TABLE IF NOT EXISTS sentiment_stats (
    sentiment TEXT PRIMARY KEY,
    nb_reviews INTEGER,
    avg_rating DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS recommendations (
    product_id TEXT,
    domain TEXT,
    product_title TEXT,
    recommended_product_id TEXT,
    recommended_domain TEXT,
    recommended_title TEXT,
    recommendation_score DOUBLE PRECISION,
    recommendation_type TEXT,
    PRIMARY KEY (product_id, recommended_product_id)
);

CREATE TABLE IF NOT EXISTS global_dashboard (
    dashboard_id TEXT PRIMARY KEY,
    total_reviews INTEGER,
    total_products INTEGER,
    total_suppliers INTEGER,
    total_categories INTEGER,
    domains TEXT,
    average_rating_global DOUBLE PRECISION,
    positive_rate_global DOUBLE PRECISION,
    negative_rate_global DOUBLE PRECISION,
    data_source TEXT,
    loaded_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS data_quality_report (
    report_id TEXT PRIMARY KEY,
    status TEXT,
    source TEXT,
    payload TEXT,
    loaded_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_domain ON products (domain);
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products (supplier_id);
CREATE INDEX IF NOT EXISTS idx_reviews_sample_product ON reviews_sample (global_product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_sample_sentiment ON reviews_sample (sentiment);
CREATE INDEX IF NOT EXISTS idx_product_kpis_risk ON product_kpis (risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_product_kpis_popularity ON product_kpis (popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_product_kpis_buyability ON product_kpis (buyability_score DESC);
CREATE INDEX IF NOT EXISTS idx_product_kpis_future ON product_kpis (future_purchase_score DESC);
CREATE INDEX IF NOT EXISTS idx_category_kpis_score ON category_kpis (category_score DESC);
CREATE INDEX IF NOT EXISTS idx_problematic_products_risk ON problematic_products (risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_kpis_score ON supplier_kpis (supplier_score DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_product ON recommendations (product_id);
