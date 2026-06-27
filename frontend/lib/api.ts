export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export type GlobalKpis = {
  total_reviews: number;
  total_products: number;
  total_suppliers: number;
  average_rating_global: number;
  positive_rate_global: number;
  negative_rate_global: number;
  data_source: string;
};

export type Product = {
  parent_asin: string;
  title: string;
  main_category?: string;
  store?: string;
  price?: number;
  avg_rating?: number;
  nb_reviews?: number;
  positive_rate?: number;
  negative_rate?: number;
  risk_score?: number;
  popularity_score?: number;
  buyability_score?: number;
  future_purchase_score?: number;
  purchase_decision?: string;
  purchase_reason?: string;
  description?: string;
  recent_reviews?: Review[];
};

export type ProductKpi = {
  parent_asin: string;
  product_title: string;
  main_category: string;
  store: string;
  nb_reviews: number;
  avg_rating: number;
  positive_rate: number;
  negative_rate: number;
  popularity_score: number;
  risk_score: number;
  buyability_score?: number;
  future_purchase_score?: number;
  purchase_decision?: string;
  purchase_reason?: string;
};

export type Review = {
  review_id: string;
  rating: number;
  text: string;
  sentiment: string;
  verified_purchase: boolean;
};

export type Recommendation = {
  product_id: string;
  product_title: string;
  recommended_product_id: string;
  recommended_title: string;
  recommendation_score: number;
};

export type Supplier = {
  supplier_id: string;
  store: string;
  nb_products: number;
  nb_reviews: number;
  avg_supplier_rating: number;
  supplier_negative_rate: number;
  supplier_score: number;
};

export type AdminDashboard = {
  global_kpis: GlobalKpis;
  sentiment_stats: Array<{ sentiment: string; nb_reviews: number; avg_rating: number }>;
  top_products: ProductKpi[];
  problematic_products: ProductKpi[];
  supplier_ranking: Supplier[];
  categories: Array<{ main_category: string; nb_products: number; avg_rating: number; negative_rate: number }>;
};

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Erreur API ${response.status}: ${path}`);
  }
  return response.json() as Promise<T>;
}

export async function apiPost<T>(path: string, payload: unknown): Promise<T> {
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
