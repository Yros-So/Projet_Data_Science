export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";
const STATIC_API_ENABLED = process.env.NEXT_PUBLIC_STATIC_API === "true";
const STATIC_API_ROOT = "/static-api";
const MAX_PREDICTION_CONFIDENCE = 0.99;

export type GlobalKpis = {
  total_reviews: number;
  total_products: number;
  total_suppliers: number;
  total_categories: number;
  domains: string[];
  average_rating_global: number;
  positive_rate_global: number;
  negative_rate_global: number;
  data_source: string;
  detail_reviews_processed?: number;
};

export type Product = {
  global_product_id: string;
  domain: string;
  parent_asin: string;
  title: string;
  main_category?: string;
  category_id?: string;
  supplier_id?: string;
  store?: string;
  price?: number;
  avg_rating?: number;
  nb_reviews?: number;
  positive_rate?: number;
  negative_rate?: number;
  neutral_rate?: number;
  dominant_sentiment?: string;
  min_review_year?: number;
  max_review_year?: number;
  risk_score?: number;
  confidence_score?: number;
  popularity_score?: number;
  buyability_score?: number;
  future_purchase_score?: number;
  purchase_decision?: string;
  purchase_reason?: string;
  description?: string;
  recent_reviews?: Review[];
};

export type ProductKpi = {
  global_product_id: string;
  domain: string;
  parent_asin: string;
  product_title: string;
  main_category: string;
  category_id?: string;
  supplier_id?: string;
  store: string;
  nb_reviews: number;
  avg_rating: number;
  positive_rate: number;
  neutral_rate?: number;
  negative_rate: number;
  dominant_sentiment?: string;
  min_review_year?: number;
  max_review_year?: number;
  popularity_score: number;
  risk_score: number;
  confidence_score?: number;
  buyability_score?: number;
  future_purchase_score?: number;
  purchase_decision?: string;
  purchase_reason?: string;
};

export type Review = {
  review_id: string;
  global_product_id?: string;
  product_title?: string;
  domain?: string;
  parent_asin?: string;
  rating: number;
  text: string;
  sentiment: string;
  verified_purchase: boolean;
};

export type Recommendation = {
  product_id: string;
  domain?: string;
  product_title: string;
  recommended_product_id: string;
  recommended_domain?: string;
  recommended_title: string;
  recommendation_score: number;
};

export type SentimentResult = {
  text: string;
  sentiment: string;
  confidence: number | null;
};

export type CategoryKpi = {
  category_id: string;
  domain: string;
  main_category: string;
  nb_products: number;
  nb_reviews: number;
  avg_rating: number;
  positive_rate: number;
  neutral_rate: number;
  negative_rate: number;
  risk_score: number;
  buyability_score: number;
  future_purchase_score: number;
  category_score: number;
};

export type Supplier = {
  supplier_id: string;
  domain?: string;
  store: string;
  nb_products: number;
  nb_reviews: number;
  avg_supplier_rating: number;
  supplier_negative_rate: number;
  nb_problematic_products?: number;
  supplier_score: number;
};

export type ApiHealth = {
  status: string;
  data_source?: {
    configured: string;
    active: string;
    postgres_ready: boolean;
  };
};

export type DataQualityScale = {
  status: string;
  actual_reviews: number;
  detail_reviews_processed?: number;
  reviews_by_dataset?: Record<string, number>;
  datasets_under_target?: Record<string, number>;
  min_reviews_required_per_dataset?: number;
  target_total_reviews?: number;
  target_range_reviews_per_dataset?: string;
  uses_demo_data?: boolean;
  message?: string;
};

export type DataQualityReport = {
  status: string;
  schema_status?: string;
  source?: string;
  scale?: DataQualityScale;
};

export type FilterOptions = {
  domains: string[];
  categories: string[];
  category_ids: string[];
  suppliers: string[];
  supplier_ids: string[];
  sentiments: string[];
  risk_levels: string[];
  years: number[];
  sorts: string[];
};

export type AdminDashboard = {
  global_kpis: GlobalKpis;
  data_quality_report?: DataQualityReport;
  sentiment_stats: Array<{ sentiment: string; nb_reviews: number; avg_rating: number }>;
  top_products: ProductKpi[];
  problematic_products: ProductKpi[];
  supplier_ranking: Supplier[];
  categories: CategoryKpi[];
};

export function apiPath(path: string, params?: Record<string, string | number | null | undefined>): string {
  if (!params) {
    return path;
  }
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "" && value !== "all") {
      search.set(key, String(value));
    }
  });
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

const staticCache = new Map<string, Promise<unknown>>();

function normalize(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function riskLevel(score?: number | null): string {
  const value = score ?? 0;
  if (value < 0.2) {
    return "faible";
  }
  if (value < 0.4) {
    return "moyen";
  }
  return "eleve";
}

function capPredictionConfidence(value: number | null | undefined): number | null {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null;
  }
  return Math.max(0, Math.min(MAX_PREDICTION_CONFIDENCE, value));
}

async function staticJson<T>(file: string): Promise<T> {
  if (!staticCache.has(file)) {
    staticCache.set(
      file,
      fetch(`${STATIC_API_ROOT}/${file}`, { cache: "force-cache" }).then((response) => {
        if (!response.ok) {
          throw new Error(`Static API ${response.status}: ${file}`);
        }
        return response.json();
      })
    );
  }
  return staticCache.get(file) as Promise<T>;
}

function limitFrom(url: URL, fallback = 25): number {
  const parsed = Number(url.searchParams.get("limit") ?? fallback);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function filterProducts(products: Product[], url: URL): Product[] {
  const domain = normalize(url.searchParams.get("domain"));
  const category = normalize(url.searchParams.get("category") ?? url.searchParams.get("category_id"));
  const supplier = normalize(url.searchParams.get("supplier") ?? url.searchParams.get("supplier_id"));
  const sentiment = normalize(url.searchParams.get("sentiment"));
  const risk = normalize(url.searchParams.get("risk"));
  const search = normalize(url.searchParams.get("search"));
  const year = Number(url.searchParams.get("year") ?? 0);

  const filtered = products.filter((product) => {
    const text = normalize(`${product.title} ${product.store} ${product.main_category} ${product.domain}`);
    const productYearMin = product.min_review_year ?? 0;
    const productYearMax = product.max_review_year ?? 9999;
    return (
      (!domain || domain === "all" || normalize(product.domain) === domain) &&
      (!category ||
        category === "all" ||
        normalize(product.main_category) === category ||
        normalize(product.category_id) === category) &&
      (!supplier ||
        supplier === "all" ||
        normalize(product.store) === supplier ||
        normalize(product.supplier_id) === supplier) &&
      (!sentiment || sentiment === "all" || normalize(product.dominant_sentiment) === sentiment) &&
      (!risk || risk === "all" || riskLevel(product.risk_score) === risk) &&
      (!search || text.includes(search)) &&
      (!year || (productYearMin <= year && productYearMax >= year))
    );
  });

  const sortBy = normalize(url.searchParams.get("sort_by") ?? "popularite");
  const sortOrder = normalize(url.searchParams.get("sort_order") ?? "desc");
  const sortColumns: Record<string, keyof Product> = {
    popularite: "popularity_score",
    popularity: "popularity_score",
    note: "avg_rating",
    rating: "avg_rating",
    confiance: "confidence_score",
    confidence: "confidence_score",
    achetable: "buyability_score",
    buyability: "buyability_score",
    futur: "future_purchase_score",
    future: "future_purchase_score",
    risque: "risk_score",
    risk: "risk_score",
    avis_negatifs: "negative_rate",
    negative: "negative_rate"
  };
  const column = sortColumns[sortBy] ?? "popularity_score";
  const direction = sortOrder === "asc" ? 1 : -1;
  return [...filtered].sort((a, b) => (Number(a[column] ?? 0) - Number(b[column] ?? 0)) * direction);
}

function filterSuppliers(suppliers: Supplier[], url: URL): Supplier[] {
  const domain = normalize(url.searchParams.get("domain"));
  const risk = normalize(url.searchParams.get("risk"));
  const sortBy = normalize(url.searchParams.get("sort_by") ?? "score");
  const sortOrder = normalize(url.searchParams.get("sort_order") ?? "desc");
  const sortColumns: Record<string, keyof Supplier> = {
    score: "supplier_score",
    risque: "supplier_negative_rate",
    risk: "supplier_negative_rate",
    avis_negatifs: "supplier_negative_rate",
    negative: "supplier_negative_rate",
    produits_problematiques: "nb_problematic_products",
    note: "avg_supplier_rating",
    rating: "avg_supplier_rating",
    avis: "nb_reviews",
    reviews: "nb_reviews"
  };
  const column = sortColumns[sortBy] ?? "supplier_score";
  const direction = sortOrder === "asc" ? 1 : -1;
  return suppliers
    .filter(
      (supplier) =>
        (!domain || domain === "all" || normalize(supplier.domain) === domain) &&
        (!risk || risk === "all" || riskLevel(supplier.supplier_negative_rate) === risk)
    )
    .sort((a, b) => (Number(a[column] ?? 0) - Number(b[column] ?? 0)) * direction)
    .slice(0, limitFrom(url, 25));
}

function filterCategories(categories: CategoryKpi[], url: URL): CategoryKpi[] {
  const domain = normalize(url.searchParams.get("domain"));
  const risk = normalize(url.searchParams.get("risk"));
  return categories
    .filter(
      (category) =>
        (!domain || domain === "all" || normalize(category.domain) === domain) &&
        (!risk || risk === "all" || riskLevel(category.risk_score) === risk)
    )
    .sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0))
    .slice(0, limitFrom(url, 50));
}

function recommendationFallback(rows: Recommendation[], productId: string, limit: number): Recommendation[] {
  const direct = rows.filter((row) => row.product_id === productId).slice(0, limit);
  if (direct.length) {
    return direct;
  }
  const domain = productId.split("_", 1)[0];
  const domainRows = rows.filter((row) => row.domain === domain).slice(0, limit);
  return domainRows.length ? domainRows : rows.slice(0, limit);
}

function negativeReviewsForSupplier(
  reviews: Review[],
  products: ProductKpi[],
  suppliers: Supplier[],
  supplierId: string,
  limit: number
): Review[] {
  const supplier = suppliers.find((item) => item.supplier_id === supplierId);
  const supplierProducts = products.filter((product) => product.supplier_id === supplierId);
  const productIds = new Set(supplierProducts.map((product) => product.global_product_id));
  const supplierStore = normalize(supplier?.store);
  const supplierDomain = normalize(supplier?.domain);

  return reviews
    .filter((review) => {
      if (normalize(review.sentiment) !== "negatif") {
        return false;
      }
      const productMatch = review.global_product_id ? productIds.has(review.global_product_id) : false;
      const storeMatch = supplierStore && normalize((review as Review & { store?: string }).store) === supplierStore;
      const domainMatch = !supplierDomain || normalize(review.domain) === supplierDomain;
      return productMatch || Boolean(storeMatch && domainMatch);
    })
    .slice(0, limit);
}

async function staticApiGet<T>(path: string): Promise<T> {
  const url = new URL(path, "https://static.local");
  const pathname = url.pathname;

  if (pathname === "/health") {
    return staticJson<T>("health.json");
  }
  if (pathname === "/filters/options") {
    return staticJson<T>("filters.json");
  }
  if (pathname === "/admin/dashboard") {
    return staticJson<T>("dashboard.json");
  }
  if (pathname === "/admin/global-kpis") {
    const dashboard = await staticJson<AdminDashboard>("dashboard.json");
    return dashboard.global_kpis as T;
  }
  if (pathname === "/products") {
    const products = await staticJson<Product[]>("products.json");
    return filterProducts(products, url).slice(0, limitFrom(url, 25)) as T;
  }
  if (pathname === "/suppliers") {
    return filterSuppliers(await staticJson<Supplier[]>("suppliers.json"), url) as T;
  }
  if (pathname === "/categories/performance" || pathname === "/categories") {
    return filterCategories(await staticJson<CategoryKpi[]>("categories.json"), url) as T;
  }
  if (pathname.startsWith("/products/") && pathname.endsWith("/recommendations")) {
    const productId = decodeURIComponent(pathname.replace("/products/", "").replace("/recommendations", ""));
    return recommendationFallback(await staticJson<Recommendation[]>("recommendations.json"), productId, limitFrom(url, 5)) as T;
  }
  if (pathname.startsWith("/recommendations/")) {
    const productId = decodeURIComponent(pathname.replace("/recommendations/", ""));
    return recommendationFallback(await staticJson<Recommendation[]>("recommendations.json"), productId, limitFrom(url, 5)) as T;
  }
  if (pathname.startsWith("/products/")) {
    const productId = decodeURIComponent(pathname.replace("/products/", ""));
    const products = await staticJson<Product[]>("products.json");
    const reviews = await staticJson<Review[]>("reviews_sample.json");
    const product = products.find((item) => item.global_product_id === productId || item.parent_asin === productId);
    if (!product) {
      throw new Error(`Produit statique introuvable: ${productId}`);
    }
    return {
      ...product,
      recent_reviews: reviews.filter((review) => review.global_product_id === product.global_product_id).slice(0, 20)
    } as T;
  }
  if (pathname.startsWith("/suppliers/") && pathname.endsWith("/dashboard")) {
    const supplierId = decodeURIComponent(pathname.replace("/suppliers/", "").replace("/dashboard", ""));
    const suppliers = await staticJson<Supplier[]>("suppliers.json");
    const products = await staticJson<ProductKpi[]>("product_kpis.json");
    const reviews = await staticJson<Review[]>("reviews_sample.json");
    const supplier = suppliers.find((item) => item.supplier_id === supplierId) ?? suppliers[0];
    const supplierProducts = products.filter((product) => product.supplier_id === supplier?.supplier_id);
    return {
      supplier,
      top_products: [...supplierProducts].sort((a, b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0)).slice(0, 5),
      problematic_products: [...supplierProducts].sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0)).slice(0, 5),
      negative_reviews: supplier ? negativeReviewsForSupplier(reviews, products, suppliers, supplier.supplier_id, 10) : []
    } as T;
  }
  if (pathname.startsWith("/suppliers/") && pathname.endsWith("/products")) {
    const supplierId = decodeURIComponent(pathname.replace("/suppliers/", "").replace("/products", ""));
    const products = await staticJson<ProductKpi[]>("product_kpis.json");
    return products
      .filter((product) => product.supplier_id === supplierId)
      .sort((a, b) => (b.popularity_score ?? 0) - (a.popularity_score ?? 0))
      .slice(0, limitFrom(url, 25)) as T;
  }
  if (pathname.startsWith("/suppliers/") && pathname.endsWith("/problematic-products")) {
    const supplierId = decodeURIComponent(pathname.replace("/suppliers/", "").replace("/problematic-products", ""));
    const products = await staticJson<ProductKpi[]>("product_kpis.json");
    return products
      .filter((product) => product.supplier_id === supplierId)
      .sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0))
      .slice(0, limitFrom(url, 10)) as T;
  }
  if (pathname.startsWith("/suppliers/") && pathname.endsWith("/negative-reviews")) {
    const supplierId = decodeURIComponent(pathname.replace("/suppliers/", "").replace("/negative-reviews", ""));
    const [reviews, products, suppliers] = await Promise.all([
      staticJson<Review[]>("reviews_sample.json"),
      staticJson<ProductKpi[]>("product_kpis.json"),
      staticJson<Supplier[]>("suppliers.json")
    ]);
    return negativeReviewsForSupplier(reviews, products, suppliers, supplierId, limitFrom(url, 10)) as T;
  }
  throw new Error(`Route statique non disponible: ${path}`);
}

function predictStaticSentiment(text: string): SentimentResult {
  const normalized = normalize(text);
  const negativeWords = [
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
    "cass",
    "remboursement",
    "rembourser",
    "defectueux",
    "abime",
    "decu",
    "decevant",
    "trop petit",
    "trop petite",
    "trop grand",
    "trop grande",
    "trop large",
    "ne fonctionne pas",
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
    "doesnt work"
  ];
  const positiveWords = [
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
    "love"
  ];
  const neutralWords = ["correct", "moyen", "moyenne", "sans plus", "ok", "acceptable", "average", "neutral"];
  const negativeHits = negativeWords.filter((word) => normalized.includes(word)).length;
  const positiveHits = positiveWords.filter((word) => normalized.includes(word)).length;
  const neutralHits = neutralWords.filter((word) => normalized.includes(word)).length;
  const sentiment =
    negativeHits > positiveHits
      ? "negatif"
      : positiveHits > negativeHits
        ? "positif"
        : negativeHits && positiveHits
          ? "negatif"
          : neutralHits
            ? "neutre"
            : "neutre";
  const confidence = sentiment === "neutre" ? 0.66 : sentiment === "negatif" ? 0.86 : 0.84;
  return { text, sentiment, confidence: capPredictionConfidence(confidence) };
}

export async function apiGet<T>(path: string): Promise<T> {
  if (STATIC_API_ENABLED) {
    return staticApiGet<T>(path);
  }
  const response = await fetch(`${API_BASE_URL}${path}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Erreur API ${response.status}: ${path}`);
  }
  return response.json() as Promise<T>;
}

export async function apiPost<T>(path: string, payload: unknown): Promise<T> {
  if (STATIC_API_ENABLED) {
    if (path === "/sentiment/predict") {
      return predictStaticSentiment((payload as { text?: string }).text ?? "") as T;
    }
    if (path === "/pipeline/run") {
      const dashboard = await staticJson<AdminDashboard>("dashboard.json");
      return {
        source: "Cloudflare static export",
        reviews: dashboard.global_kpis.total_reviews,
        products: dashboard.global_kpis.total_products,
        quality_status: dashboard.data_quality_report?.status ?? "ok",
        scale: dashboard.data_quality_report?.scale,
        recommendations: 10000,
        model: {
          best_model: "logistic_regression",
          accuracy: 0.78866,
          classes: ["negatif", "neutre", "positif"]
        }
      } as T;
    }
    throw new Error(`Action statique non disponible: ${path}`);
  }
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error(`Erreur API ${response.status}: ${path}`);
  }
  return response.json() as Promise<T>;
}
