"use client";

import {
  AlertTriangle,
  ArrowDownUp,
  BarChart3,
  Bot,
  Brain,
  CheckCircle2,
  Lightbulb,
  MessageCircle,
  PackageSearch,
  RefreshCw,
  Send,
  Search,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Star,
  Store,
  Target,
  TrendingUp
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import {
  ApiHealth,
  AdminDashboard,
  apiGet,
  apiPath,
  apiPost,
  CategoryKpi,
  DataQualityReport,
  FilterOptions,
  Product,
  ProductKpi,
  Recommendation,
  Review,
  Supplier
} from "../lib/api";

type View =
  | "admin"
  | "analytics"
  | "client-catalogue"
  | "client-product"
  | "client-recommendations"
  | "client-sentiment"
  | "supplier-dashboard"
  | "supplier-products"
  | "supplier-negative"
  | "supplier-actions"
  | "data-ml"
  | "guide";

type DecisionFilter = "all" | "Achetable" | "A surveiller" | "A eviter";
type SortMode = "smart" | "future" | "risk" | "rating" | "popular";
type SentimentFilter = "all" | "positif" | "neutre" | "negatif";
type RiskFilter = "all" | "faible" | "moyen" | "eleve";
type PeriodFilter = "all" | "2020" | "2021" | "2022" | "2023";

type SupplierDashboard = {
  supplier: Supplier;
  top_products: ProductKpi[];
  problematic_products: ProductKpi[];
  negative_reviews?: Review[];
};

type SentimentResult = {
  text: string;
  sentiment: string;
  confidence: number | null;
};

type PipelineRunResult = {
  source: string;
  reviews: number;
  products: number;
  quality_status: string;
  scale?: {
    status: string;
    actual_reviews: number;
    reviews_by_dataset?: Record<string, number>;
    datasets_under_target?: Record<string, number>;
    min_reviews_required_per_dataset?: number;
    message?: string;
  };
  recommendations?: number;
  model?: {
    best_model: string;
    accuracy: number;
    classes: string[];
  };
};

type DashboardKpis = {
  total_reviews: number;
  total_products: number;
  total_suppliers: number;
  total_categories: number;
  average_rating_global: number;
  positive_rate_global?: number;
  negative_rate_global: number;
  domains?: string[];
  data_source?: string;
  detail_reviews_processed?: number;
};

type NavItem = {
  id: View;
  label: string;
  icon: ComponentType<{ size?: number }>;
  adminOnly?: boolean;
};

const navGroups: Array<{ title: string; items: NavItem[] }> = [
  {
    title: "Pilotage",
    items: [
      { id: "admin", label: "Vue d'ensemble", icon: BarChart3, adminOnly: true },
      { id: "analytics", label: "Analyse données", icon: TrendingUp, adminOnly: true }
    ]
  },
  {
    title: "Produits et clients",
    items: [
      { id: "client-catalogue", label: "Catalogue", icon: ShoppingBag },
      { id: "client-product", label: "Détail produit", icon: PackageSearch },
      { id: "client-sentiment", label: "Analyse sentiment", icon: Brain }
    ]
  },
  {
    title: "Espace fournisseur",
    items: [
      { id: "supplier-dashboard", label: "Dashboard fournisseur", icon: Store },
      { id: "supplier-negative", label: "Avis négatifs", icon: MessageCircle }
    ]
  },
  {
    title: "Big Data & ML",
    items: [{ id: "data-ml", label: "Pipeline et modèles", icon: Brain }]
  }
];

const defaultDomains = ["Amazon_Fashion", "Beauty_and_Personal_Care", "Appliances", "Electronics"];

function pct(value?: number | null) {
  return `${Math.round((value ?? 0) * 100)}%`;
}

function predictionPct(value?: number | null) {
  if (value === null || value === undefined) {
    return undefined;
  }
  return pct(Math.min(value, 0.99));
}

function number(value?: number | null, digits = 0) {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  }).format(value ?? 0);
}

function money(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);
}

function clampScore(value: number) {
  return Math.max(0, Math.min(1, value));
}

function productKey(product: Product | ProductKpi) {
  return product.global_product_id || product.parent_asin;
}

function productLabel(product: Product | ProductKpi) {
  return "product_title" in product ? product.product_title : product.title;
}

function cleanText(value?: string | null) {
  return (value ?? "")
    .replace(/â/g, "'")
    .replace(/â|â/g, '"')
    .replace(/â|â/g, "-")
    .replace(/Â /g, " ")
    .replace(/Ã©/g, "é")
    .replace(/Ã¨/g, "è")
    .replace(/Ã /g, "à")
    .replace(/Ã§/g, "ç")
    .replace(/Ã´/g, "ô")
    .replace(/Ã»/g, "û")
    .replace(/Ã®/g, "î")
    .replace(/Ã‰/g, "É");
}

function supplierKey(supplier: Supplier) {
  return `${supplier.supplier_id}-${supplier.domain ?? ""}`;
}

function mergeSuppliers(...groups: Supplier[][]) {
  const merged = new Map<string, Supplier>();
  groups.flat().forEach((supplier) => {
    merged.set(supplierKey(supplier), supplier);
  });
  return Array.from(merged.values());
}

function mergeProducts(...groups: Product[][]) {
  const merged = new Map<string, Product>();
  groups.flat().forEach((product) => {
    merged.set(productKey(product), product);
  });
  return Array.from(merged.values());
}

function buyability(product: Product | ProductKpi) {
  if (product.buyability_score !== undefined && product.buyability_score !== null) {
    return product.buyability_score;
  }
  const ratingScore = (product.avg_rating ?? 0) / 5;
  return clampScore(ratingScore * 0.45 + (product.positive_rate ?? 0) * 0.35 + (1 - (product.risk_score ?? 1)) * 0.2);
}

function futurePotential(product: Product | ProductKpi) {
  if (product.future_purchase_score !== undefined && product.future_purchase_score !== null) {
    return product.future_purchase_score;
  }
  return clampScore(buyability(product) * 0.7 + Math.min((product.popularity_score ?? 0) / 25, 1) * 0.3);
}

function decision(product: Product | ProductKpi) {
  if (product.purchase_decision) {
    return product.purchase_decision;
  }
  const score = buyability(product);
  if (score >= 0.75 && (product.risk_score ?? 1) < 0.32) {
    return "Achetable";
  }
  if (score >= 0.55 && (product.risk_score ?? 1) < 0.5) {
    return "A surveiller";
  }
  return "A eviter";
}

function confidenceLabel(product: Product | ProductKpi) {
  const score = product.confidence_score ?? buyability(product);
  if (score >= 0.74) {
    return "Confiance élevée";
  }
  if (score >= 0.55) {
    return "Confiance moyenne";
  }
  return "Produit à surveiller";
}

function confidenceClass(product: Product | ProductKpi) {
  const label = confidenceLabel(product);
  if (label === "Confiance élevée") {
    return "pill good";
  }
  if (label === "Confiance moyenne") {
    return "pill";
  }
  return "pill warn";
}

function riskLevel(product: Product | ProductKpi): RiskFilter {
  const score = product.risk_score ?? 0;
  if (score < 0.22) {
    return "faible";
  }
  if (score < 0.45) {
    return "moyen";
  }
  return "eleve";
}

function decisionClass(value: string) {
  if (value === "Achetable") {
    return "pill good";
  }
  if (value === "A eviter") {
    return "pill danger";
  }
  return "pill warn";
}

function decisionLabel(value: string) {
  if (value === "A surveiller") {
    return "À surveiller";
  }
  if (value === "A eviter") {
    return "À éviter";
  }
  return value;
}

function sentimentClass(value?: string) {
  if (value === "negatif") {
    return "pill warn";
  }
  if (value === "positif") {
    return "pill good";
  }
  return "pill";
}

function explainProduct(product: Product | ProductKpi) {
  if (product.purchase_reason) {
    return product.purchase_reason;
  }
  const value = decision(product);
  if (value === "Achetable") {
    return "Bonne note, avis positifs et confiance suffisante.";
  }
  if (value === "A surveiller") {
    return "Produit interessant, mais il faut lire les avis avant achat.";
  }
  return "Signaux négatifs trop présents pour un achat simple.";
}

function productMatchesPeriod(product: Product | ProductKpi, period: PeriodFilter) {
  if (period === "all") {
    return true;
  }
  const year = Number(period);
  const min = product.min_review_year ?? year;
  const max = product.max_review_year ?? year;
  return min <= year && year <= max;
}

function sortModeToApi(sortMode: SortMode) {
  if (sortMode === "future") {
    return "futur";
  }
  if (sortMode === "risk") {
    return "risque";
  }
  if (sortMode === "rating") {
    return "note";
  }
  if (sortMode === "popular") {
    return "popularite";
  }
  return "achetable";
}

function productQueryParams({
  datasetFilter,
  categoryFilter,
  supplierFilter,
  sentimentFilter,
  riskFilter,
  periodFilter,
  query,
  sortMode,
  limit = 200
}: {
  datasetFilter: string;
  categoryFilter: string;
  supplierFilter: string;
  sentimentFilter: SentimentFilter;
  riskFilter: RiskFilter;
  periodFilter: PeriodFilter;
  query: string;
  sortMode: SortMode;
  limit?: number;
}) {
  return {
    limit,
    search: query.trim() || undefined,
    domain: datasetFilter,
    category: categoryFilter,
    supplier: supplierFilter,
    sentiment: sentimentFilter,
    risk: riskFilter,
    year: periodFilter,
    sort_by: sortModeToApi(sortMode),
    sort_order: sortMode === "risk" ? "asc" : "desc"
  };
}

function Metric({
  icon: Icon,
  label,
  value,
  sub
}: {
  icon: ComponentType<{ size?: number }>;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="panel metric">
      <div className="metric-label">
        <Icon size={16} />
        {label}
      </div>
      <div className="metric-value">{value}</div>
      {sub ? <div className="metric-sub">{sub}</div> : null}
    </div>
  );
}

function BarList({
  rows,
  labelKey,
  valueKey,
  formatter = number
}: {
  rows: Array<Record<string, string | number>>;
  labelKey: string;
  valueKey: string;
  formatter?: (value: number) => string;
}) {
  const max = Math.max(...rows.map((row) => Number(row[valueKey] ?? 0)), 1);
  return (
    <div className="bars">
      {rows.length ? (
        rows.map((row, index) => {
          const value = Number(row[valueKey] ?? 0);
          return (
            <div className="bar-row" key={`${row[labelKey]}-${value}-${index}`}>
              <span>{String(row[labelKey])}</span>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${Math.max(4, (value / max) * 100)}%` }} />
              </div>
              <strong>{formatter(value)}</strong>
            </div>
          );
        })
      ) : (
        <div className="empty">Aucune donnée pour ce filtre.</div>
      )}
    </div>
  );
}

type ChartDatum = {
  label: string;
  value: number;
  color?: string;
};

const chartColors = ["#157f72", "#d28a25", "#496783", "#c75832", "#6f7d2c", "#8a5a83"];

function DonutChart({
  rows,
  centerLabel,
  centerValue
}: {
  rows: ChartDatum[];
  centerLabel: string;
  centerValue: string;
}) {
  const total = rows.reduce((sum, row) => sum + Math.max(row.value, 0), 0);
  let cursor = 0;
  const background =
    total > 0
      ? rows
          .map((row, index) => {
            const start = cursor;
            const span = (Math.max(row.value, 0) / total) * 360;
            cursor += span;
            return `${row.color ?? chartColors[index % chartColors.length]} ${start}deg ${cursor}deg`;
          })
          .join(", ")
      : "#e8eef4 0deg 360deg";

  return (
    <div className="donut-layout">
      <div className="donut" style={{ background: `conic-gradient(${background})` }}>
        <div className="donut-center">
          <strong>{centerValue}</strong>
          <span>{centerLabel}</span>
        </div>
      </div>
      <div className="chart-legend">
        {rows.map((row, index) => (
          <div className="legend-row" key={row.label}>
            <span className="legend-swatch" style={{ background: row.color ?? chartColors[index % chartColors.length] }} />
            <span>{row.label}</span>
            <strong>{total > 0 ? pct(row.value / total) : "0%"}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendChart({ rows }: { rows: ChartDatum[] }) {
  const width = 520;
  const height = 180;
  const padding = 26;
  const max = Math.max(...rows.map((row) => row.value), 1);
  const points = rows.map((row, index) => {
    const x = padding + (index * (width - padding * 2)) / Math.max(rows.length - 1, 1);
    const y = height - padding - (row.value / max) * (height - padding * 2);
    return { ...row, x, y };
  });
  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className="trend-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Tendance des avis par an">
        <line className="axis" x1={padding} x2={width - padding} y1={height - padding} y2={height - padding} />
        <polyline className="trend-line" points={polyline} />
        {points.map((point) => (
          <g key={point.label}>
            <circle className="trend-point" cx={point.x} cy={point.y} r="4" />
            <text className="trend-value" x={point.x} y={Math.max(14, point.y - 10)} textAnchor="middle">
              {number(point.value)}
            </text>
            <text className="trend-label" x={point.x} y={height - 6} textAnchor="middle">
              {point.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function ScoreBars({ rows }: { rows: ChartDatum[] }) {
  return (
    <div className="score-bars">
      {rows.map((row, index) => (
        <div className="score-bar" key={row.label}>
          <div>
            <span>{row.label}</span>
            <strong>{pct(row.value)}</strong>
          </div>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{ background: row.color ?? chartColors[index % chartColors.length], width: `${clampScore(row.value) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function ProductSelect({
  products,
  selectedProductId,
  setSelectedProductId
}: {
  products: Product[];
  selectedProductId: string;
  setSelectedProductId: (id: string) => void;
}) {
  return (
    <div className="field wide-field">
      <PackageSearch size={18} />
      <select value={selectedProductId} onChange={(event) => setSelectedProductId(event.target.value)}>
        {products.map((product) => (
          <option value={productKey(product)} key={productKey(product)}>
            {product.domain} - {cleanText(product.title)}
          </option>
        ))}
      </select>
    </div>
  );
}

function SupplierSelect({
  suppliers,
  selectedSupplierId,
  setSelectedSupplierId
}: {
  suppliers: Supplier[];
  selectedSupplierId: string;
  setSelectedSupplierId: (id: string) => void;
}) {
  return (
    <div className="field wide-field">
      <Store size={18} />
      <select value={selectedSupplierId} onChange={(event) => setSelectedSupplierId(event.target.value)}>
        {suppliers.map((supplier) => (
          <option value={supplier.supplier_id} key={supplier.supplier_id}>
            {supplier.domain ? `${supplier.domain} - ` : ""}
            {cleanText(supplier.store)}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function Home() {
  const [view, setView] = useState<View>("admin");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(true);
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryKpis, setCategoryKpis] = useState<CategoryKpi[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [apiHealth, setApiHealth] = useState<ApiHealth | null>(null);
  const [datasetFilter, setDatasetFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [sentimentFilter, setSentimentFilter] = useState<SentimentFilter>("all");
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [productDetail, setProductDetail] = useState<Product | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [supplierDashboard, setSupplierDashboard] = useState<SupplierDashboard | null>(null);
  const [query, setQuery] = useState("");
  const [decisionFilter, setDecisionFilter] = useState<DecisionFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("smart");
  const [minimumScore, setMinimumScore] = useState(0);
  const [reviewText, setReviewText] = useState("Produit de mauvaise qualité, taille trop grande.");
  const [sentiment, setSentiment] = useState<SentimentResult | null>(null);
  const [pipelineResult, setPipelineResult] = useState<PipelineRunResult | null>(null);
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCoreData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        healthData,
        filterData,
        dashboardData,
        productData,
        riskyProductData,
        watchProductData,
        supplierData,
        riskySupplierData,
        categoryData
      ] = await Promise.all([
        apiGet<ApiHealth>("/health"),
        apiGet<FilterOptions>("/filters/options"),
        apiGet<AdminDashboard>(apiPath("/admin/dashboard", { domain: datasetFilter, risk: riskFilter })),
        apiGet<Product[]>(
          apiPath(
            "/products",
            productQueryParams({
              datasetFilter,
              categoryFilter,
              supplierFilter,
              sentimentFilter,
              riskFilter,
              periodFilter,
              query,
              sortMode
            })
          )
        ),
        apiGet<Product[]>(
          apiPath("/products", {
            limit: 200,
            search: query.trim() || undefined,
            domain: datasetFilter,
            category: categoryFilter,
            supplier: supplierFilter,
            sentiment: sentimentFilter,
            risk: riskFilter,
            year: periodFilter,
            sort_by: "risque",
            sort_order: "desc"
          })
        ),
        apiGet<Product[]>(
          apiPath("/products", {
            limit: 200,
            search: query.trim() || undefined,
            domain: datasetFilter,
            category: categoryFilter,
            supplier: supplierFilter,
            sentiment: sentimentFilter,
            risk: riskFilter === "all" ? "moyen" : riskFilter,
            year: periodFilter,
            sort_by: "achetable",
            sort_order: "desc"
          })
        ),
        apiGet<Supplier[]>(apiPath("/suppliers", { limit: 100, domain: datasetFilter, risk: riskFilter })),
        apiGet<Supplier[]>(
          apiPath("/suppliers", {
            limit: 100,
            domain: datasetFilter,
            risk: riskFilter,
            sort_by: "risque",
            sort_order: "desc"
          })
        ),
        apiGet<CategoryKpi[]>(apiPath("/categories/performance", { limit: 100, domain: datasetFilter, risk: riskFilter }))
      ]);
      const mergedSuppliers = mergeSuppliers(supplierData, riskySupplierData);
      const mergedProducts = mergeProducts(productData, riskyProductData, watchProductData);
      setApiHealth(healthData);
      setFilterOptions(filterData);
      setDashboard(dashboardData);
      setProducts(mergedProducts);
      setSuppliers(mergedSuppliers);
      setCategoryKpis(categoryData);
      setSelectedProductId((current) => current || (mergedProducts[0] ? productKey(mergedProducts[0]) : ""));
      setSelectedSupplierId((current) => current || mergedSuppliers[0]?.supplier_id || "");
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "API indisponible");
    } finally {
      setLoading(false);
    }
  }, [
    categoryFilter,
    datasetFilter,
    periodFilter,
    query,
    riskFilter,
    sentimentFilter,
    sortMode,
    supplierFilter
  ]);

  useEffect(() => {
    void loadCoreData();
  }, [loadCoreData]);

  const domainOptions = useMemo(() => {
    const domains = new Set<string>(defaultDomains);
    filterOptions?.domains?.forEach((domain) => domains.add(domain));
    dashboard?.global_kpis.domains?.forEach((domain) => domains.add(domain));
    products.forEach((product) => {
      if (product.domain) {
        domains.add(product.domain);
      }
    });
    return Array.from(domains).sort();
  }, [dashboard, filterOptions, products]);

  const domainProducts = useMemo(() => {
    if (datasetFilter === "all") {
      return products;
    }
    return products.filter((product) => product.domain === datasetFilter);
  }, [products, datasetFilter]);

  const categoryOptions = useMemo(() => {
    const categories = new Set<string>();
    if (datasetFilter === "all") {
      filterOptions?.categories?.forEach((category) => categories.add(category));
    }
    categoryKpis
      .filter((category) => datasetFilter === "all" || category.domain === datasetFilter)
      .forEach((category) => categories.add(category.main_category));
    domainProducts.forEach((product) => {
      if (product.main_category) {
        categories.add(product.main_category);
      }
    });
    return Array.from(categories).sort();
  }, [categoryKpis, datasetFilter, domainProducts, filterOptions]);

  const supplierOptions = useMemo(() => {
    const supplierNames = new Set<string>();
    if (datasetFilter === "all") {
      filterOptions?.suppliers?.forEach((supplier) => supplierNames.add(supplier));
    }
    suppliers
      .filter((supplier) => datasetFilter === "all" || supplier.domain === datasetFilter)
      .forEach((supplier) => supplierNames.add(supplier.store));
    domainProducts.forEach((product) => {
      if (product.store) {
        supplierNames.add(product.store);
      }
    });
    return Array.from(supplierNames).sort();
  }, [datasetFilter, domainProducts, filterOptions, suppliers]);

  const scopedProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = domainProducts.filter((product) => {
      const matchesSearch =
        !normalized ||
        `${product.title} ${product.store} ${product.main_category} ${product.domain}`.toLowerCase().includes(normalized);
      const matchesCategory = categoryFilter === "all" || product.main_category === categoryFilter;
      const matchesSupplier = supplierFilter === "all" || product.store === supplierFilter;
      const matchesSentiment = sentimentFilter === "all" || product.dominant_sentiment === sentimentFilter;
      const matchesRisk = riskFilter === "all" || riskLevel(product) === riskFilter;
      const matchesPeriod = productMatchesPeriod(product, periodFilter);
      const matchesDecision = decisionFilter === "all" || decision(product) === decisionFilter;
      const matchesScore = buyability(product) >= minimumScore / 100;
      return (
        matchesSearch &&
        matchesCategory &&
        matchesSupplier &&
        matchesSentiment &&
        matchesRisk &&
        matchesPeriod &&
        matchesDecision &&
        matchesScore
      );
    });

    return [...filtered].sort((a, b) => {
      if (sortMode === "future") {
        return futurePotential(b) - futurePotential(a);
      }
      if (sortMode === "risk") {
        return (a.risk_score ?? 0) - (b.risk_score ?? 0);
      }
      if (sortMode === "rating") {
        return (b.avg_rating ?? 0) - (a.avg_rating ?? 0);
      }
      if (sortMode === "popular") {
        return (b.popularity_score ?? 0) - (a.popularity_score ?? 0);
      }
      return buyability(b) - buyability(a);
    });
  }, [
    categoryFilter,
    decisionFilter,
    domainProducts,
    minimumScore,
    periodFilter,
    query,
    riskFilter,
    sentimentFilter,
    sortMode,
    supplierFilter
  ]);

  const scopedCategoryKpis = useMemo(() => {
    return categoryKpis
      .filter((category) => datasetFilter === "all" || category.domain === datasetFilter)
      .filter((category) => categoryFilter === "all" || category.main_category === categoryFilter);
  }, [categoryFilter, categoryKpis, datasetFilter]);

  const scopedSuppliers = useMemo(() => {
    return suppliers
      .filter((supplier) => datasetFilter === "all" || supplier.domain === datasetFilter)
      .filter((supplier) => supplierFilter === "all" || supplier.store === supplierFilter);
  }, [datasetFilter, supplierFilter, suppliers]);

  const visibleKpis = useMemo(() => {
    const totalReviews = scopedProducts.reduce((sum, product) => sum + (product.nb_reviews ?? 0), 0);
    const weightedRating = scopedProducts.reduce(
      (sum, product) => sum + (product.avg_rating ?? 0) * (product.nb_reviews ?? 0),
      0
    );
    const positiveReviews = scopedProducts.reduce(
      (sum, product) => sum + (product.positive_rate ?? 0) * (product.nb_reviews ?? 0),
      0
    );
    const negativeReviews = scopedProducts.reduce(
      (sum, product) => sum + (product.negative_rate ?? 0) * (product.nb_reviews ?? 0),
      0
    );
    return {
      total_reviews: totalReviews,
      total_products: scopedProducts.length,
      total_suppliers: scopedSuppliers.length,
      total_categories: scopedCategoryKpis.length,
      average_rating_global: totalReviews ? weightedRating / totalReviews : 0,
      positive_rate_global: totalReviews ? positiveReviews / totalReviews : 0,
      negative_rate_global: totalReviews ? negativeReviews / totalReviews : 0
    };
  }, [scopedCategoryKpis.length, scopedProducts, scopedSuppliers.length]);

  const sentimentRows = useMemo(() => {
    const positive = scopedProducts.reduce((sum, product) => sum + (product.positive_rate ?? 0) * (product.nb_reviews ?? 0), 0);
    const neutral = scopedProducts.reduce((sum, product) => sum + (product.neutral_rate ?? 0) * (product.nb_reviews ?? 0), 0);
    const negative = scopedProducts.reduce((sum, product) => sum + (product.negative_rate ?? 0) * (product.nb_reviews ?? 0), 0);
    return [
      { sentiment: "positif", nb_reviews: Math.round(positive), avg_rating: visibleKpis.average_rating_global },
      { sentiment: "neutre", nb_reviews: Math.round(neutral), avg_rating: visibleKpis.average_rating_global },
      { sentiment: "negatif", nb_reviews: Math.round(negative), avg_rating: visibleKpis.average_rating_global }
    ];
  }, [scopedProducts, visibleKpis.average_rating_global]);

  const isGlobalScope = useMemo(() => {
    return (
      datasetFilter === "all" &&
      categoryFilter === "all" &&
      supplierFilter === "all" &&
      sentimentFilter === "all" &&
      riskFilter === "all" &&
      periodFilter === "all" &&
      decisionFilter === "all" &&
      minimumScore === 0 &&
      query.trim() === ""
    );
  }, [categoryFilter, datasetFilter, decisionFilter, minimumScore, periodFilter, query, riskFilter, sentimentFilter, supplierFilter]);

  const dashboardKpis = useMemo(() => {
    if (isGlobalScope && dashboard?.global_kpis) {
      return dashboard.global_kpis;
    }
    return visibleKpis;
  }, [dashboard, isGlobalScope, visibleKpis]);

  const dashboardSentimentRows = useMemo(() => {
    if (isGlobalScope && dashboard?.sentiment_stats?.length) {
      return dashboard.sentiment_stats;
    }
    return sentimentRows;
  }, [dashboard, isGlobalScope, sentimentRows]);

  const dashboardCategories = useMemo(() => {
    if (isGlobalScope && dashboard?.categories?.length) {
      return dashboard.categories;
    }
    return scopedCategoryKpis;
  }, [dashboard, isGlobalScope, scopedCategoryKpis]);

  const productSummary = useMemo(() => {
    const values = scopedProducts.reduce(
      (acc, product) => {
        const productDecision = decision(product);
        acc[productDecision] = (acc[productDecision] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    return {
      achetable: values.Achetable ?? 0,
      watch: values["A surveiller"] ?? 0,
      avoid: values["A eviter"] ?? 0
    };
  }, [scopedProducts]);

  const topProducts = useMemo(
    () => [...scopedProducts].sort((a, b) => (b.popularity_score ?? 0) - (a.popularity_score ?? 0)).slice(0, 8),
    [scopedProducts]
  );

  const problematicProducts = useMemo(
    () => [...scopedProducts].sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0)).slice(0, 12),
    [scopedProducts]
  );

  const dashboardProblematicProducts = useMemo(() => {
    if (isGlobalScope && dashboard?.problematic_products?.length) {
      return dashboard.problematic_products;
    }
    return problematicProducts;
  }, [dashboard, isGlobalScope, problematicProducts]);

  const riskySuppliers = useMemo(() => {
    return [...scopedSuppliers].sort(
      (a, b) =>
        (b.nb_problematic_products ?? 0) - (a.nb_problematic_products ?? 0) ||
        (b.supplier_negative_rate ?? 0) - (a.supplier_negative_rate ?? 0)
    );
  }, [scopedSuppliers]);

  const issueSuppliers = useMemo(() => {
    return riskySuppliers.filter(
      (supplier) => (supplier.nb_problematic_products ?? 0) > 0 || (supplier.supplier_negative_rate ?? 0) > 0
    );
  }, [riskySuppliers]);

  const supplierSelectionPool = useMemo(() => {
    if ((view === "supplier-negative" || view === "supplier-actions") && issueSuppliers.length) {
      return issueSuppliers;
    }
    return scopedSuppliers;
  }, [issueSuppliers, scopedSuppliers, view]);

  const selectedSupplierProducts = useMemo(() => {
    return domainProducts.filter((product) => product.supplier_id === selectedSupplierId);
  }, [domainProducts, selectedSupplierId]);

  const selectedSupplierDisplayProducts = useMemo(() => {
    const productsById = new Map<string, Product | ProductKpi>();
    selectedSupplierProducts.forEach((product) => productsById.set(productKey(product), product));
    supplierDashboard?.top_products?.forEach((product) => productsById.set(productKey(product), product));
    supplierDashboard?.problematic_products?.forEach((product) => productsById.set(productKey(product), product));
    return Array.from(productsById.values()).sort((a, b) => (b.popularity_score ?? 0) - (a.popularity_score ?? 0));
  }, [selectedSupplierProducts, supplierDashboard]);

  const selectedSupplierImproveProducts = useMemo(() => {
    const apiProducts = supplierDashboard?.problematic_products ?? [];
    if (apiProducts.length) {
      return apiProducts;
    }
    return [...selectedSupplierProducts].sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0)).slice(0, 10);
  }, [selectedSupplierProducts, supplierDashboard]);

  useEffect(() => {
    setCategoryFilter("all");
    setSupplierFilter("all");
  }, [datasetFilter]);

  useEffect(() => {
    const currentProductIsVisible = domainProducts.some((product) => productKey(product) === selectedProductId);
    if (!currentProductIsVisible) {
      setSelectedProductId(domainProducts[0] ? productKey(domainProducts[0]) : "");
    }
    const currentSupplierIsVisible = supplierSelectionPool.some((supplier) => supplier.supplier_id === selectedSupplierId);
    if (!currentSupplierIsVisible) {
      setSelectedSupplierId(supplierSelectionPool[0]?.supplier_id || "");
    }
  }, [domainProducts, selectedProductId, selectedSupplierId, supplierSelectionPool]);

  useEffect(() => {
    if (!selectedProductId) {
      return;
    }
    async function loadProduct() {
      try {
        const [detail, recos] = await Promise.all([
          apiGet<Product>(`/products/${selectedProductId}`),
          apiGet<Recommendation[]>(`/products/${selectedProductId}/recommendations`)
        ]);
        setProductDetail(detail);
        setRecommendations(recos);
      } catch {
        setProductDetail(null);
        setRecommendations([]);
      }
    }
    void loadProduct();
  }, [selectedProductId]);

  useEffect(() => {
    if (!selectedSupplierId) {
      return;
    }
    async function loadSupplier() {
      try {
        setSupplierDashboard(await apiGet<SupplierDashboard>(`/suppliers/${selectedSupplierId}/dashboard`));
      } catch {
        setSupplierDashboard(null);
      }
    }
    void loadSupplier();
  }, [selectedSupplierId]);

  async function predictSentiment() {
    setSentiment(null);
    const result = await apiPost<SentimentResult>("/sentiment/predict", { text: reviewText });
    setSentiment(result);
  }

  async function runLiveTraining() {
    setPipelineLoading(true);
    setPipelineResult(null);
    try {
      const result = await apiPost<PipelineRunResult>("/pipeline/run", {});
      setPipelineResult(result);
      await loadCoreData();
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "Pipeline indisponible");
    } finally {
      setPipelineLoading(false);
    }
  }

  function selectProduct(id: string, target: View = "client-product") {
    setSelectedProductId(id);
    setView(target);
  }

  const activeTitle: Record<View, string> = {
    admin: "Dashboard administrateur",
    analytics: "Analyse des données",
    "client-catalogue": "Catalogue client",
    "client-product": "Détail produit",
    "client-recommendations": "Recommandations client",
    "client-sentiment": "Analyse sentiment",
    "supplier-dashboard": "Dashboard fournisseur",
    "supplier-products": "Mes produits",
    "supplier-negative": "Avis négatifs",
    "supplier-actions": "Actions recommandées",
    "data-ml": "Data & Machine Learning",
    guide: "Architecture et documentation"
  };

  const activeDescription: Record<View, string> = {
    admin: "Vue de pilotage : volume, alertes, sentiment et produits prioritaires.",
    analytics: "Graphiques de répartition, tendance, risques et performance par dataset.",
    "client-catalogue": "Recherche et comparaison des produits avec filtres métier.",
    "client-product": "Fiche détaillée, avis récents et recommandations du produit sélectionné.",
    "client-recommendations": "Produits similaires classés par score hybride.",
    "client-sentiment": "Test direct du modèle de classification de sentiment.",
    "supplier-dashboard": "Synthèse fournisseur : score, produits et avis négatifs.",
    "supplier-products": "Liste des produits rattachés au fournisseur sélectionné.",
    "supplier-negative": "Avis négatifs utiles pour prioriser les corrections.",
    "supplier-actions": "Actions recommandées à partir des signaux faibles.",
    "data-ml": "Suivi Big Data, qualité, pipeline et entraînement ML.",
    guide: "Lecture fonctionnelle de la chaîne Bronze, Silver, Gold, API et interface."
  };

  return (
    <div className={sidebarOpen ? "shell" : "shell collapsed"}>
      {sidebarOpen ? (
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark">DS</div>
            <div>
              <strong>E-commerce Intelligence</strong>
              <span>Plateforme multi-espaces</span>
            </div>
          </div>

          <nav className="nav" aria-label="Navigation principale">
            {navGroups.map((group) => (
              <div className="nav-group" key={group.title}>
                <div className="nav-group-title">{group.title}</div>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const locked = Boolean(item.adminOnly && !isAdminLoggedIn);
                  return (
                    <button
                      className={["nav-button", view === item.id ? "active" : "", locked ? "locked" : ""].join(" ")}
                      disabled={locked}
                      key={item.id}
                      onClick={() => setView(item.id)}
                      title={locked ? "Connexion admin requise" : item.label}
                      type="button"
                    >
                      <Icon size={18} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="dataset-picker filter-panel">
            <div className="nav-group-title">Filtres globaux</div>
            <label htmlFor="dataset-select">Catégorie dataset</label>
            <select id="dataset-select" value={datasetFilter} onChange={(event) => setDatasetFilter(event.target.value)}>
              <option value="all">Toutes</option>
              {domainOptions.map((domain) => (
                <option value={domain} key={domain}>
                  {domain}
                </option>
              ))}
            </select>

            <label htmlFor="category-select">Catégorie produit</label>
            <select id="category-select" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="all">Toutes</option>
              {categoryOptions.map((category) => (
                <option value={category} key={category}>
                  {category}
                </option>
              ))}
            </select>

            <label htmlFor="supplier-filter">Fournisseur</label>
            <select id="supplier-filter" value={supplierFilter} onChange={(event) => setSupplierFilter(event.target.value)}>
              <option value="all">Tous</option>
              {supplierOptions.map((supplier) => (
                <option value={supplier} key={supplier}>
                  {supplier}
                </option>
              ))}
            </select>

            <label htmlFor="sentiment-filter">Sentiment</label>
            <select
              id="sentiment-filter"
              value={sentimentFilter}
              onChange={(event) => setSentimentFilter(event.target.value as SentimentFilter)}
            >
              <option value="all">Tous</option>
              <option value="positif">Positif</option>
              <option value="neutre">Neutre</option>
              <option value="negatif">Négatif</option>
            </select>

            <label htmlFor="risk-filter">Niveau de risque</label>
            <select id="risk-filter" value={riskFilter} onChange={(event) => setRiskFilter(event.target.value as RiskFilter)}>
              <option value="all">Tous</option>
              <option value="faible">Faible</option>
              <option value="moyen">Moyen</option>
              <option value="eleve">Eleve</option>
            </select>

            <label htmlFor="period-filter">Période</label>
            <select id="period-filter" value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value as PeriodFilter)}>
              <option value="all">Toutes</option>
              {(filterOptions?.years.length ? filterOptions.years : [2020, 2021, 2022, 2023]).map((year) => (
                <option value={year} key={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </aside>
      ) : null}

      <main className="main">
        <div className="topbar">
          <div>
            <h1>{activeTitle[view]}</h1>
            <p>{activeDescription[view]}</p>
          </div>
          <div className="status">
            <button className="button secondary" onClick={() => setSidebarOpen((current) => !current)} type="button">
              <SlidersHorizontal size={16} />
              {sidebarOpen ? "Cacher menu" : "Afficher menu"}
            </button>
            <span className="pill">{datasetFilter === "all" ? "Global" : datasetFilter}</span>
            <CheckCircle2 size={16} />
            API FastAPI
            <span className="pill">{apiHealth?.data_source?.active ?? "..."}</span>
            <button
              className={isAdminLoggedIn ? "button" : "button secondary"}
              onClick={() => setIsAdminLoggedIn((current) => !current)}
              type="button"
            >
              <ShieldCheck size={16} />
              {isAdminLoggedIn ? "Admin connecte" : "Connexion admin"}
            </button>
            <button className="button secondary" onClick={() => void loadCoreData()} type="button">
              <RefreshCw size={16} />
              Actualiser
            </button>
          </div>
        </div>

        {error ? <div className="error">{error}</div> : null}
        {loading ? <div className="empty">Chargement des données...</div> : null}

        {!loading && !error && view === "admin" ? (
          <AdminPage
            categories={dashboardCategories}
            dataQualityReport={dashboard?.data_quality_report ?? null}
            kpis={dashboardKpis}
            problematicProducts={dashboardProblematicProducts}
            riskySuppliers={riskySuppliers}
            sentimentRows={dashboardSentimentRows}
            onSelectProduct={selectProduct}
          />
        ) : null}

        {!loading && !error && view === "analytics" ? (
          <AnalyticsPage
            categories={dashboardCategories}
            dataQualityReport={dashboard?.data_quality_report ?? null}
            kpis={dashboardKpis}
            products={scopedProducts}
            riskySuppliers={riskySuppliers}
            sentimentRows={dashboardSentimentRows}
          />
        ) : null}

        {!loading && !error && view === "client-catalogue" ? (
          <ClientCataloguePage
            products={scopedProducts}
            productSummary={productSummary}
            query={query}
            setQuery={setQuery}
            decisionFilter={decisionFilter}
            setDecisionFilter={setDecisionFilter}
            minimumScore={minimumScore}
            setMinimumScore={setMinimumScore}
            sortMode={sortMode}
            setSortMode={setSortMode}
            onSelectProduct={selectProduct}
          />
        ) : null}

        {!loading && !error && view === "client-product" ? (
          <ProductPage
            products={domainProducts}
            selectedProductId={selectedProductId}
            setSelectedProductId={setSelectedProductId}
            productDetail={productDetail}
            recommendations={recommendations}
          />
        ) : null}

        {!loading && !error && view === "client-recommendations" ? (
          <RecommendationsPage
            products={domainProducts}
            selectedProductId={selectedProductId}
            setSelectedProductId={setSelectedProductId}
            recommendations={recommendations}
          />
        ) : null}

        {!loading && !error && view === "client-sentiment" ? (
          <SentimentPage
            predictSentiment={predictSentiment}
            reviewText={reviewText}
            sentiment={sentiment}
            setReviewText={setReviewText}
          />
        ) : null}

        {!loading && !error && view === "supplier-dashboard" ? (
          <SupplierDashboardPage
            onSelectProduct={selectProduct}
            selectedSupplierId={selectedSupplierId}
            setSelectedSupplierId={setSelectedSupplierId}
            supplierDashboard={supplierDashboard}
            suppliers={scopedSuppliers}
          />
        ) : null}

        {!loading && !error && view === "supplier-products" ? (
          <SupplierProductsPage
            onSelectProduct={selectProduct}
            products={selectedSupplierDisplayProducts}
            selectedSupplierId={selectedSupplierId}
            setSelectedSupplierId={setSelectedSupplierId}
            suppliers={scopedSuppliers}
          />
        ) : null}

        {!loading && !error && view === "supplier-negative" ? (
          <SupplierNegativePage
            reviews={supplierDashboard?.negative_reviews ?? []}
            selectedSupplierId={selectedSupplierId}
            setSelectedSupplierId={setSelectedSupplierId}
            suppliers={issueSuppliers.length ? issueSuppliers : scopedSuppliers}
          />
        ) : null}

        {!loading && !error && view === "supplier-actions" ? (
          <SupplierActionsPage
            products={selectedSupplierImproveProducts}
            reviews={supplierDashboard?.negative_reviews ?? []}
            selectedSupplierId={selectedSupplierId}
            setSelectedSupplierId={setSelectedSupplierId}
            suppliers={issueSuppliers.length ? issueSuppliers : scopedSuppliers}
          />
        ) : null}

        {!loading && !error && view === "data-ml" ? (
          <DataMlPage
            apiHealth={apiHealth}
            categories={dashboardCategories}
            dataQualityReport={dashboard?.data_quality_report ?? null}
            kpis={dashboardKpis}
            onRunPipeline={runLiveTraining}
            pipelineLoading={pipelineLoading}
            pipelineResult={pipelineResult}
            products={scopedProducts}
          />
        ) : null}

        <MiniAssistant
          dashboard={dashboard}
          onSelectProduct={selectProduct}
          open={assistantOpen}
          products={scopedProducts}
          selectedProduct={productDetail}
          setOpen={setAssistantOpen}
        />
      </main>
    </div>
  );
}

function AdminPage({
  categories,
  dataQualityReport,
  kpis,
  problematicProducts,
  riskySuppliers,
  sentimentRows,
  onSelectProduct
}: {
  categories: CategoryKpi[];
  dataQualityReport: DataQualityReport | null;
  kpis: DashboardKpis;
  problematicProducts: Array<Product | ProductKpi>;
  riskySuppliers: Supplier[];
  sentimentRows: Array<{ sentiment: string; nb_reviews: number; avg_rating: number }>;
  onSelectProduct: (id: string) => void;
}) {
  const scale = dataQualityReport?.scale;
  const reviewsByDataset = scale?.reviews_by_dataset ?? {};
  const datasetsUnderTarget = scale?.datasets_under_target ?? {};
  const minReviewsPerDataset = scale?.min_reviews_required_per_dataset ?? 1500000;
  const datasetCount = Math.max(Object.keys(reviewsByDataset).length, 1);
  const minimumTotalTarget = minReviewsPerDataset * datasetCount;
  const scaleReady = scale?.status === "production_ready";
  const sentimentChartRows = sentimentRows.map((row) => ({
    label: row.sentiment,
    value: row.nb_reviews,
    color: row.sentiment === "positif" ? "#157f72" : row.sentiment === "negatif" ? "#c75832" : "#d28a25"
  }));

  return (
    <section className="grid">
      {!scaleReady ? (
        <div className="panel">
          <div className="panel-header">
            <h2>Volume données sous seuil manager</h2>
            <span className="pill warn">Démo / insuffisant</span>
          </div>
          <div className="panel-body reviews">
            <div className="review">
              Objectif minimum : {number(minReviewsPerDataset)} avis par dataset, soit {number(minimumTotalTarget)} avis
              minimum pour les {datasetCount} datasets actifs.
            </div>
            <div className="review">
              Volume actuellement chargé : {number(scale?.actual_reviews ?? kpis.total_reviews)} avis. Le modèle actuel est
              donc seulement une démonstration locale, pas l'entraînement final.
            </div>
            {Object.entries(reviewsByDataset).map(([domain, count]) => (
              <div className="review" key={domain}>
                {domain} : {number(count)} avis
                {datasetsUnderTarget[domain] !== undefined ? " - sous 1 500 000" : " - seuil atteint"}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid metrics">
        <Metric icon={ShoppingBag} label="Avis analysés" value={number(kpis.total_reviews)} />
        <Metric icon={Target} label="Objectif minimum" value={number(minimumTotalTarget)} />
        <Metric icon={PackageSearch} label="Produits" value={number(kpis.total_products)} />
        <Metric icon={Store} label="Fournisseurs" value={number(kpis.total_suppliers)} />
        <Metric icon={Star} label="Note moyenne" value={number(kpis.average_rating_global, 2)} />
        <Metric icon={AlertTriangle} label="Avis négatifs" value={pct(kpis.negative_rate_global)} />
      </div>

      <div className="grid two">
        <div className="panel">
          <div className="panel-header">
            <h2>Catégories à surveiller</h2>
          </div>
          <div className="panel-body">
            <BarList
              rows={categories
                .slice()
                .sort((a, b) => b.risk_score - a.risk_score)
                .slice(0, 8)
                .map((category) => ({
                  label: `${category.domain} - ${cleanText(category.main_category)}`,
                  value: category.negative_rate
                }))}
              labelKey="label"
              valueKey="value"
              formatter={pct}
            />
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Sentiments</h2>
          </div>
          <div className="panel-body">
            <DonutChart
              centerLabel="avis"
              centerValue={number(sentimentRows.reduce((sum, row) => sum + row.nb_reviews, 0))}
              rows={sentimentChartRows}
            />
          </div>
        </div>
      </div>

      <div className="grid two">
        <RiskySuppliersTable suppliers={riskySuppliers.slice(0, 8)} />
        <TechnicalProductTable
          onSelect={onSelectProduct}
          products={problematicProducts.slice(0, 8)}
          scoreKey="risk_score"
          title="Produits problématiques"
        />
      </div>
    </section>
  );
}

function AnalyticsPage({
  categories,
  dataQualityReport,
  kpis,
  products,
  riskySuppliers,
  sentimentRows
}: {
  categories: CategoryKpi[];
  dataQualityReport: DataQualityReport | null;
  kpis: DashboardKpis;
  products: Product[];
  riskySuppliers: Supplier[];
  sentimentRows: Array<{ sentiment: string; nb_reviews: number; avg_rating: number }>;
}) {
  const scale = dataQualityReport?.scale;
  const reviewsByDataset = scale?.reviews_by_dataset ?? {};
  const minReviewsPerDataset = scale?.min_reviews_required_per_dataset ?? 1500000;
  const datasetCount = Math.max(Object.keys(reviewsByDataset).length, 1);
  const minimumTotalTarget = minReviewsPerDataset * datasetCount;
  const sentimentChartRows = sentimentRows.map((row) => ({
    label: row.sentiment,
    value: row.nb_reviews,
    color: row.sentiment === "positif" ? "#157f72" : row.sentiment === "negatif" ? "#c75832" : "#d28a25"
  }));
  const domainRows = Object.entries(reviewsByDataset).map(([domain, reviews]) => ({ domain, reviews }));
  const detailedReviews = scale?.detail_reviews_processed ?? kpis.detail_reviews_processed ?? 0;
  const loadedProducts = products.length;
  const supplierRows = riskySuppliers.slice(0, 6).map((supplier) => ({
    label: `${cleanText(supplier.store)} (${supplier.domain ?? "global"})`,
    value: supplier.supplier_negative_rate ?? 0,
    color: "#c75832"
  }));

  return (
    <section className="grid">
      <div className="grid metrics">
        <Metric icon={ShoppingBag} label="Avis analysés" value={number(kpis.total_reviews)} />
        <Metric icon={Target} label="Objectif minimum" value={number(minimumTotalTarget)} />
        <Metric icon={PackageSearch} label="Produits analysés" value={number(kpis.total_products)} />
        <Metric icon={Store} label="Fournisseurs" value={number(kpis.total_suppliers)} />
        <Metric icon={AlertTriangle} label="Taux négatif" value={pct(kpis.negative_rate_global)} />
      </div>

      <div className="grid two">
        <div className="panel">
          <div className="panel-header">
            <h2>Répartition des sentiments</h2>
            <span className="pill">Pie chart</span>
          </div>
          <div className="panel-body">
            <DonutChart centerLabel="avis" centerValue={number(kpis.total_reviews)} rows={sentimentChartRows} />
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Portée des données</h2>
            <span className="pill good">Global Gold</span>
          </div>
          <div className="panel-body scope-list">
            <div className="scope-item">
              <span>Volume global consolidé</span>
              <strong>{number(kpis.total_reviews)} avis</strong>
              <small>Source : {kpis.data_source ?? "tables Gold"}</small>
            </div>
            <div className="scope-item">
              <span>Produits Gold</span>
              <strong>{number(kpis.total_products)} produits</strong>
              <small>Total produit du projet, pas la limite d'affichage.</small>
            </div>
            <div className="scope-item">
              <span>Avis détaillés matérialisés</span>
              <strong>{number(detailedReviews)}</strong>
              <small>Échantillon détaillé utilisé pour les pages produit et avis.</small>
            </div>
          </div>
        </div>
      </div>

      <div className="grid two">
        <div className="panel">
          <div className="panel-header">
            <h2>Volume par dataset</h2>
          </div>
          <div className="panel-body">
            <BarList
              rows={domainRows.length ? domainRows : [{ domain: "Tous datasets", reviews: kpis.total_reviews }]}
              labelKey="domain"
              valueKey="reviews"
            />
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Échantillon consultable</h2>
            <span className="pill">Interface</span>
          </div>
          <div className="panel-body scope-list">
            <div className="scope-item">
              <span>Produits chargés dans l'interface</span>
              <strong>{number(loadedProducts)}</strong>
              <small>Lot de navigation : meilleurs, intermédiaires et produits à risque.</small>
            </div>
            <div className="scope-item">
              <span>Interprétation</span>
              <strong>Ce n'est pas le total projet</strong>
              <small>Le total fiable reste {number(kpis.total_products)} produits Gold.</small>
            </div>
          </div>
        </div>
      </div>

      <div className="grid two">
        <div className="panel">
          <div className="panel-header">
            <h2>Risque par catégorie</h2>
          </div>
          <div className="panel-body">
            <BarList
              rows={categories
                .slice()
                .sort((a, b) => b.risk_score - a.risk_score)
                .slice(0, 10)
                .map((category) => ({
                  label: `${category.domain} - ${cleanText(category.main_category)}`,
                  value: category.risk_score
                }))}
              labelKey="label"
              valueKey="value"
              formatter={pct}
            />
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Fournisseurs à risque</h2>
          </div>
          <div className="panel-body">
            <ScoreBars rows={supplierRows} />
          </div>
        </div>
      </div>
    </section>
  );
}

function ClientCataloguePage({
  products,
  productSummary,
  query,
  setQuery,
  decisionFilter,
  setDecisionFilter,
  minimumScore,
  setMinimumScore,
  sortMode,
  setSortMode,
  onSelectProduct
}: {
  products: Product[];
  productSummary: { achetable: number; watch: number; avoid: number };
  query: string;
  setQuery: (value: string) => void;
  decisionFilter: DecisionFilter;
  setDecisionFilter: (value: DecisionFilter) => void;
  minimumScore: number;
  setMinimumScore: (value: number) => void;
  sortMode: SortMode;
  setSortMode: (value: SortMode) => void;
  onSelectProduct: (id: string, target?: View) => void;
}) {
  return (
    <section className="grid">
      <div className="grid three">
        <Metric icon={CheckCircle2} label="Achetables" value={number(productSummary.achetable)} sub="Choix simples" />
        <Metric icon={AlertTriangle} label="À surveiller" value={number(productSummary.watch)} sub="Lire les avis" />
        <Metric icon={ShieldCheck} label="À éviter" value={number(productSummary.avoid)} sub="Risque client" />
      </div>

      <div className="toolbar">
        <div className="field flex-field">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un produit" />
        </div>
        <div className="field">
          <SlidersHorizontal size={18} />
          <select value={decisionFilter} onChange={(event) => setDecisionFilter(event.target.value as DecisionFilter)}>
            <option value="all">Tous</option>
            <option value="Achetable">Achetable</option>
            <option value="A surveiller">À surveiller</option>
            <option value="A eviter">À éviter</option>
          </select>
        </div>
        <div className="field">
          <ArrowDownUp size={18} />
          <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
            <option value="smart">Meilleur achat</option>
            <option value="future">Potentiel futur</option>
            <option value="risk">Moins risqué</option>
            <option value="rating">Meilleure note</option>
            <option value="popular">Plus populaire</option>
          </select>
        </div>
      </div>

      <div className="panel">
        <div className="panel-body score-filter">
          <div>
            <strong>Score minimum de confiance</strong>
            <div className="muted">Le client voit une confiance lisible, pas le score de risque brut.</div>
          </div>
          <input
            aria-label="Score minimum de confiance"
            max="100"
            min="0"
            onChange={(event) => setMinimumScore(Number(event.target.value))}
            type="range"
            value={minimumScore}
          />
          <span className="pill">{minimumScore}%</span>
        </div>
      </div>

      <div className="product-grid">
        {products.slice(0, 12).map((product) => (
          <article className="product-card" key={productKey(product)}>
            <div className="product-visual">
              <div className="visual-block" />
              <div className="visual-line" />
            </div>
            <div>
              <div className="product-title">{cleanText(product.title)}</div>
              <div className="muted">
                {cleanText(product.main_category)} - {cleanText(product.store)}
              </div>
            </div>
            <div className="grid three">
              <span className="pill">{number(product.avg_rating, 2)} / 5</span>
              <span className="pill good">{pct(product.positive_rate)}</span>
              <span className={confidenceClass(product)}>{confidenceLabel(product)}</span>
            </div>
            <div className="muted">{explainProduct(product)}</div>
            <div className="button-row">
              <button className="button" onClick={() => onSelectProduct(productKey(product), "client-product")} type="button">
                <PackageSearch size={16} />
                Détail
              </button>
              <button className="button secondary" onClick={() => onSelectProduct(productKey(product), "client-recommendations")} type="button">
                <Target size={16} />
                Recos
              </button>
            </div>
          </article>
        ))}
      </div>

      <ClientProductTable products={products} onSelect={onSelectProduct} />
    </section>
  );
}

function ClientProductTable({ products, onSelect }: { products: Product[]; onSelect: (id: string, target?: View) => void }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Liste des produits</h2>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Produit</th>
              <th>Note</th>
              <th>Confiance</th>
              <th>Avis positifs</th>
              <th>Décision</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={productKey(product)}>
                <td>
                  <div className="product-title">{cleanText(product.title)}</div>
                  <div className="muted">
                    {product.domain} - {cleanText(product.main_category)} - {cleanText(product.store)}
                  </div>
                </td>
                <td>{number(product.avg_rating, 2)}</td>
                <td>
                  <span className={confidenceClass(product)}>{confidenceLabel(product)}</span>
                </td>
                <td>
                  <span className="pill good">{pct(product.positive_rate)}</span>
                </td>
                <td>
                  <span className={decisionClass(decision(product))}>{decisionLabel(decision(product))}</span>
                </td>
                <td>
                  <div className="button-row">
                    <button className="button secondary" onClick={() => onSelect(productKey(product), "client-product")} type="button">
                      Détail
                    </button>
                    <button className="button secondary" onClick={() => onSelect(productKey(product), "client-recommendations")} type="button">
                      Recos
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProductPage({
  products,
  selectedProductId,
  setSelectedProductId,
  productDetail,
  recommendations
}: {
  products: Product[];
  selectedProductId: string;
  setSelectedProductId: (id: string) => void;
  productDetail: Product | null;
  recommendations: Recommendation[];
}) {
  const sentimentRows = productDetail
    ? [
        { label: "Positifs", value: productDetail.positive_rate ?? 0 },
        { label: "Neutres", value: productDetail.neutral_rate ?? 0 },
        { label: "Négatifs", value: productDetail.negative_rate ?? 0 }
      ]
    : [];

  return (
    <section className="grid">
      <ProductSelect products={products} selectedProductId={selectedProductId} setSelectedProductId={setSelectedProductId} />

      {productDetail ? (
        <div className="detail-layout">
          <div className="grid">
            <div className="panel">
              <div className="panel-header">
                <h2>{cleanText(productDetail.title)}</h2>
                <span className={confidenceClass(productDetail)}>{confidenceLabel(productDetail)}</span>
              </div>
              <div className="panel-body">
                <div className="grid metrics">
                  <Metric icon={Store} label="Fournisseur" value={cleanText(productDetail.store) || "-"} />
                  <Metric icon={Target} label="Catégorie" value={cleanText(productDetail.main_category) || "-"} />
                  <Metric icon={Star} label="Note moyenne" value={number(productDetail.avg_rating, 2)} />
                  <Metric icon={ShoppingBag} label="Nombre d'avis" value={number(productDetail.nb_reviews)} />
                  <Metric icon={Brain} label="Sentiment global" value={productDetail.dominant_sentiment ?? "-"} />
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <h2>Avis positifs / neutres / négatifs</h2>
              </div>
              <div className="panel-body">
                <BarList rows={sentimentRows} labelKey="label" valueKey="value" formatter={pct} />
              </div>
            </div>

            <ReviewsList reviews={productDetail.recent_reviews ?? []} />
          </div>

          <RecommendationsPanel recommendations={recommendations} />
        </div>
      ) : (
        <div className="empty">Produit introuvable.</div>
      )}
    </section>
  );
}

function RecommendationsPage({
  products,
  selectedProductId,
  setSelectedProductId,
  recommendations
}: {
  products: Product[];
  selectedProductId: string;
  setSelectedProductId: (id: string) => void;
  recommendations: Recommendation[];
}) {
  return (
    <section className="grid">
      <ProductSelect products={products} selectedProductId={selectedProductId} setSelectedProductId={setSelectedProductId} />
      <RecommendationsPanel recommendations={recommendations} />
    </section>
  );
}

function RecommendationsPanel({ recommendations }: { recommendations: Recommendation[] }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Produits similaires recommandés</h2>
      </div>
      <div className="panel-body reviews">
        {recommendations.length ? (
          recommendations.map((recommendation) => (
            <div className="review" key={recommendation.recommended_product_id}>
              <div className="product-title">{cleanText(recommendation.recommended_title)}</div>
              <div className="muted">
                {recommendation.recommended_domain} - {recommendation.recommended_product_id}
              </div>
              <span className="pill">Score recommandation {number(recommendation.recommendation_score, 2)}</span>
            </div>
          ))
        ) : (
          <div className="empty">Aucune recommandation disponible.</div>
        )}
      </div>
    </div>
  );
}

function SentimentPage({
  predictSentiment,
  reviewText,
  sentiment,
  setReviewText
}: {
  predictSentiment: () => void;
  reviewText: string;
  sentiment: SentimentResult | null;
  setReviewText: (value: string) => void;
}) {
  return (
    <section className="grid two">
      <div className="panel">
        <div className="panel-header">
          <h2>Avis client</h2>
        </div>
        <div className="panel-body sentiment-box">
          <textarea value={reviewText} onChange={(event) => setReviewText(event.target.value)} />
          <button className="button" onClick={() => predictSentiment()} type="button">
            <Brain size={16} />
            Prédire
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2>Résultat</h2>
        </div>
        <div className="panel-body">
          {sentiment ? (
            <div className="grid">
              <Metric
                icon={ShieldCheck}
                label="Sentiment"
                value={sentiment.sentiment}
                sub={predictionPct(sentiment.confidence) ? `Confiance estimée ${predictionPct(sentiment.confidence)}` : undefined}
              />
              <div className="review">{sentiment.text}</div>
            </div>
          ) : (
            <div className="empty">Aucune prédiction pour le moment.</div>
          )}
        </div>
      </div>
    </section>
  );
}

function SupplierDashboardPage({
  suppliers,
  selectedSupplierId,
  setSelectedSupplierId,
  supplierDashboard,
  onSelectProduct
}: {
  suppliers: Supplier[];
  selectedSupplierId: string;
  setSelectedSupplierId: (id: string) => void;
  supplierDashboard: SupplierDashboard | null;
  onSelectProduct: (id: string, target?: View) => void;
}) {
  return (
    <section className="grid">
      <SupplierSelect suppliers={suppliers} selectedSupplierId={selectedSupplierId} setSelectedSupplierId={setSelectedSupplierId} />

      {supplierDashboard ? (
        <>
          <div className="grid metrics">
            <Metric icon={PackageSearch} label="Produits" value={number(supplierDashboard.supplier.nb_products)} />
            <Metric icon={Star} label="Note moyenne" value={number(supplierDashboard.supplier.avg_supplier_rating, 2)} />
            <Metric icon={AlertTriangle} label="Avis négatifs" value={pct(supplierDashboard.supplier.supplier_negative_rate)} />
            <Metric icon={ShieldCheck} label="Score fournisseur" value={number(supplierDashboard.supplier.supplier_score, 2)} />
            <Metric
              icon={TrendingUp}
              label="Produits à améliorer"
              value={number(supplierDashboard.supplier.nb_problematic_products ?? supplierDashboard.problematic_products.length)}
            />
          </div>

          <div className="grid two">
            <TechnicalProductTable
              onSelect={(id) => onSelectProduct(id, "client-product")}
              products={supplierDashboard.top_products}
              scoreKey="popularity_score"
              title="Meilleurs produits"
            />
            <TechnicalProductTable
              onSelect={(id) => onSelectProduct(id, "client-product")}
              products={supplierDashboard.problematic_products}
              scoreKey="risk_score"
              title="Produits à améliorer"
            />
          </div>

          <ReviewsList reviews={supplierDashboard.negative_reviews ?? []} title="Avis négatifs récents" />
        </>
      ) : (
        <div className="empty">Fournisseur introuvable.</div>
      )}
    </section>
  );
}

function SupplierProductsPage({
  suppliers,
  selectedSupplierId,
  setSelectedSupplierId,
  products,
  onSelectProduct
}: {
  suppliers: Supplier[];
  selectedSupplierId: string;
  setSelectedSupplierId: (id: string) => void;
  products: Array<Product | ProductKpi>;
  onSelectProduct: (id: string, target?: View) => void;
}) {
  return (
    <section className="grid">
      <SupplierSelect suppliers={suppliers} selectedSupplierId={selectedSupplierId} setSelectedSupplierId={setSelectedSupplierId} />
      <TechnicalProductTable
        onSelect={(id) => onSelectProduct(id, "client-product")}
        products={products}
        scoreKey="popularity_score"
        title="Mes produits"
      />
    </section>
  );
}

function SupplierNegativePage({
  suppliers,
  selectedSupplierId,
  setSelectedSupplierId,
  reviews
}: {
  suppliers: Supplier[];
  selectedSupplierId: string;
  setSelectedSupplierId: (id: string) => void;
  reviews: Review[];
}) {
  return (
    <section className="grid">
      <SupplierSelect suppliers={suppliers} selectedSupplierId={selectedSupplierId} setSelectedSupplierId={setSelectedSupplierId} />
      <ReviewsList reviews={reviews} title="Avis négatifs récents" />
    </section>
  );
}

function SupplierActionsPage({
  suppliers,
  selectedSupplierId,
  setSelectedSupplierId,
  products,
  reviews
}: {
  suppliers: Supplier[];
  selectedSupplierId: string;
  setSelectedSupplierId: (id: string) => void;
  products: Array<Product | ProductKpi>;
  reviews: Review[];
}) {
  const hasSizeIssue = reviews.some((review) => review.text.toLowerCase().includes("taille"));
  const hasQualityIssue = reviews.some((review) => {
    const text = review.text.toLowerCase();
    return text.includes("qualite") || text.includes("qualité");
  });
  const hasDeliveryIssue = reviews.some((review) => review.text.toLowerCase().includes("livraison"));
  const actions = [
    hasSizeIssue
      ? "Beaucoup d'avis négatifs mentionnent la taille. Action : vérifier la description des tailles du produit."
      : "Vérifier que les titres et descriptions donnent assez de contexte avant l'achat.",
    hasQualityIssue
      ? "Des avis mentionnent la qualité. Action : contrôler les matériaux, photos et attentes client."
      : "Surveiller les produits dont la confiance descend sous le niveau moyen.",
    hasDeliveryIssue
      ? "Des avis mentionnent la livraison. Action : revoir la promesse logistique ou les informations de délai."
      : "Comparer les produits à améliorer avec les meilleurs produits du même fournisseur."
  ];

  return (
    <section className="grid">
      <SupplierSelect suppliers={suppliers} selectedSupplierId={selectedSupplierId} setSelectedSupplierId={setSelectedSupplierId} />
      <div className="grid two">
        <div className="panel">
          <div className="panel-header">
            <h2>Actions recommandées</h2>
          </div>
          <div className="panel-body reviews">
            {actions.map((action) => (
              <div className="review" key={action}>
                <Lightbulb size={16} /> {action}
              </div>
            ))}
          </div>
        </div>
        <TechnicalProductTable products={products} scoreKey="risk_score" title="Produits prioritaires" />
      </div>
    </section>
  );
}

function DataMlPage({
  apiHealth,
  categories,
  dataQualityReport,
  kpis,
  onRunPipeline,
  pipelineLoading,
  pipelineResult,
  products
}: {
  apiHealth: ApiHealth | null;
  categories: CategoryKpi[];
  dataQualityReport: DataQualityReport | null;
  kpis: DashboardKpis;
  onRunPipeline: () => void;
  pipelineLoading: boolean;
  pipelineResult: PipelineRunResult | null;
  products: Product[];
}) {
  const scale = pipelineResult?.scale ?? dataQualityReport?.scale;
  const reviewsByDataset = scale?.reviews_by_dataset ?? {};
  const datasetsUnderTarget = scale?.datasets_under_target ?? {};
  const minReviewsPerDataset = scale?.min_reviews_required_per_dataset ?? 1500000;
  const scaleReady = scale?.status === "production_ready";

  return (
    <section className="grid">
      <div className="grid metrics">
        <Metric icon={ShoppingBag} label="Avis traités" value={number(kpis.total_reviews)} />
        <Metric icon={PackageSearch} label="Produits Gold" value={number(kpis.total_products)} />
        <Metric icon={Target} label="Catégories Gold" value={number(kpis.total_categories)} />
        <Metric icon={CheckCircle2} label="Source API" value={apiHealth?.data_source?.active ?? "auto"} />
        <Metric
          icon={scaleReady ? CheckCircle2 : AlertTriangle}
          label="Seuil par dataset"
          value={number(minReviewsPerDataset)}
          sub={scaleReady ? "Volume valide" : "Volume insuffisant"}
        />
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2>Exigence volume manager</h2>
          <span className={scaleReady ? "pill good" : "pill warn"}>
            {scaleReady ? "Production" : "Sous seuil"}
          </span>
        </div>
        <div className="panel-body timeline">
          <div className="review">Objectif : chaque dataset actif doit contenir entre 1 500 000 et 5 000 000 avis.</div>
          <div className="review">
            Le total attendu dépend du nombre de datasets actifs : {number(minReviewsPerDataset)} avis minimum par dataset.
          </div>
          <div className="review">{scale?.message ?? "Rapport de volume indisponible."}</div>
          {Object.entries(reviewsByDataset).map(([domain, count]) => (
            <div className="review" key={domain}>
              {domain} : {number(count)} avis
              {datasetsUnderTarget[domain] !== undefined ? " - sous seuil manager" : " - seuil atteint"}
            </div>
          ))}
        </div>
      </div>

      <div className="grid two">
        <div className="panel">
          <div className="panel-header">
            <h2>Pipeline Bronze / Silver / Gold</h2>
            <button className="button" disabled={pipelineLoading} onClick={onRunPipeline} type="button">
              <RefreshCw size={16} />
              {pipelineLoading ? "Entraînement..." : "Relancer ETL + ML"}
            </button>
          </div>
          <div className="panel-body timeline">
            <div className="review">Bronze : reviews + metadata par catégorie.</div>
            <div className="review">Silver : reviews_clean et products_clean avec domain, global_product_id, supplier_id.</div>
            <div className="review">Gold : product_kpis, supplier_kpis, category_kpis, recommendations.</div>
            <div className="review">API : FastAPI expose uniquement les tables Gold et les prédictions.</div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Audit live du système</h2>
          </div>
          <div className="panel-body reviews">
            <div className="review">Modele sentiment : TF-IDF + comparaison baseline / Naive Bayes / Logistic Regression.</div>
            <div className="review">Recommandation : similarité texte + confiance + popularité.</div>
            <div className="review">Produits consultables chargés : {number(products.length)}</div>
            {pipelineResult ? (
              <div className="review">
                Dernier run : {pipelineResult.quality_status}, {number(pipelineResult.reviews)} avis,{" "}
                {number(pipelineResult.products)} produits, modèle {pipelineResult.model?.best_model}.
              </div>
            ) : (
              <div className="review">Aucun run lancé depuis cette interface.</div>
            )}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2>Performance catégories</h2>
        </div>
        <div className="panel-body">
          <BarList
            rows={categories.map((category) => ({
              label: `${category.domain} - ${cleanText(category.main_category)}`,
              value: category.category_score
            }))}
            labelKey="label"
            valueKey="value"
            formatter={pct}
          />
        </div>
      </div>
    </section>
  );
}

function MiniAssistant({
  dashboard,
  products,
  selectedProduct,
  onSelectProduct,
  open,
  setOpen
}: {
  dashboard: AdminDashboard | null;
  products: Product[];
  selectedProduct: Product | null;
  onSelectProduct: (id: string, target?: View) => void;
  open: boolean;
  setOpen: (value: boolean) => void;
}) {
  const quickQuestions = [
    "Quel produit acheter ?",
    "Quel produit éviter ?",
    "Quel fournisseur surveiller ?",
    "Comment lire les scores ?"
  ];
  const [question, setQuestion] = useState(quickQuestions[0]);
  const answer = useMemo(
    () => buildBotAnswer(question, products, dashboard, selectedProduct),
    [dashboard, products, question, selectedProduct]
  );

  return (
    <div className="ai-assistant">
      {open ? (
        <div className="ai-panel">
          <div className="ai-header">
            <div>
              <strong>Assistant IA</strong>
              <span>Conseil produit et fournisseur</span>
            </div>
            <button className="button secondary compact" onClick={() => setOpen(false)} type="button">
              Fermer
            </button>
          </div>

          <div className="bot-message bot">
            <Lightbulb size={18} />
            <div>
              <strong>{answer.title}</strong>
              <p>{answer.text}</p>
            </div>
          </div>

          {answer.products.length ? (
            <div className="mini-products">
              {answer.products.slice(0, 2).map((product) => (
                <button
                  className="mini-product"
                  key={productKey(product)}
                  onClick={() => {
                    onSelectProduct(productKey(product), "client-product");
                    setOpen(false);
                  }}
                  type="button"
                >
                  <span className={decisionClass(decision(product))}>{decisionLabel(decision(product))}</span>
                  <strong>{cleanText(product.title)}</strong>
                </button>
              ))}
            </div>
          ) : null}

          <div className="guide-input">
            <input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Pose une question courte..."
            />
            <button className="button" onClick={() => setQuestion(question.trim() || quickQuestions[0])} type="button">
              <Send size={16} />
            </button>
          </div>

          <div className="quick-questions">
            {quickQuestions.map((item) => (
              <button className="button secondary compact" key={item} onClick={() => setQuestion(item)} type="button">
                {item}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <button className="ai-toggle" onClick={() => setOpen(!open)} type="button">
        <Bot size={20} />
        Assistant IA
      </button>
    </div>
  );
}

function GuidePage({
  dashboard,
  products,
  selectedProduct,
  onSelectProduct
}: {
  dashboard: AdminDashboard | null;
  products: Product[];
  selectedProduct: Product | null;
  onSelectProduct: (id: string, target?: View) => void;
}) {
  return (
    <section className="guide-layout">
      <GuideBot dashboard={dashboard} products={products} selectedProduct={selectedProduct} onSelectProduct={onSelectProduct} />
      <div className="panel guide-rules">
        <div className="panel-header">
          <h2>Relation logique du système</h2>
        </div>
        <div className="panel-body timeline">
          <div className="review">Avis client &rarr; analyse de sentiment.</div>
          <div className="review">Sentiment &rarr; scores produit : confiance, risque, achetable.</div>
          <div className="review">Scores produit &rarr; scores fournisseur et catégories.</div>
          <div className="review">Gold data &rarr; dashboards client, fournisseur et administrateur.</div>
          <div className="review">Recommandation_score &rarr; produits similaires proposes au client.</div>
        </div>
      </div>
    </section>
  );
}

function TechnicalProductTable({
  title,
  products,
  scoreKey,
  onSelect
}: {
  title: string;
  products: Array<Product | ProductKpi>;
  scoreKey: "risk_score" | "popularity_score";
  onSelect?: (id: string) => void;
}) {
  return (
    <div className="panel">
      <div className="panel-header">
        <h2>{title}</h2>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Produit</th>
              <th>Note</th>
              <th>Risque</th>
              <th>Confiance</th>
              <th>Score</th>
              {onSelect ? <th></th> : null}
            </tr>
          </thead>
          <tbody>
            {products.length ? (
              products.map((product) => (
                <tr key={productKey(product)}>
                  <td>
                    <div className="product-title">{cleanText(productLabel(product))}</div>
                    <div className="muted">
                      {product.domain} - {cleanText(product.store)}
                    </div>
                  </td>
                  <td>{number(product.avg_rating, 2)}</td>
                  <td>{riskLevel(product)}</td>
                  <td>
                    <span className={confidenceClass(product)}>{confidenceLabel(product)}</span>
                  </td>
                  <td>{number(product[scoreKey], 2)}</td>
                  {onSelect ? (
                    <td>
                      <button className="button secondary" onClick={() => onSelect(productKey(product))} type="button">
                        Voir
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))
            ) : (
              <tr>
                <td className="table-empty" colSpan={onSelect ? 6 : 5}>
                  Aucun produit exploitable pour ce fournisseur dans l'export actuel.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RiskySuppliersTable({ suppliers }: { suppliers: Supplier[] }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Fournisseurs à risque</h2>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Fournisseur</th>
              <th>Domaine</th>
              <th>Produits</th>
              <th>Avis négatifs</th>
              <th>Produits à risque</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((supplier) => (
              <tr key={`${supplier.supplier_id}-${supplier.domain}`}>
                <td>{cleanText(supplier.store)}</td>
                <td>{supplier.domain}</td>
                <td>{number(supplier.nb_products)}</td>
                <td>{pct(supplier.supplier_negative_rate)}</td>
                <td>{number(supplier.nb_problematic_products ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReviewsList({ reviews, title = "Avis récents" }: { reviews: Review[]; title?: string }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <h2>{title}</h2>
      </div>
      <div className="panel-body reviews">
        {reviews.length ? (
          reviews.map((review) => (
            <div className="review" key={review.review_id}>
              <strong>{number(review.rating, 1)} / 5</strong>{" "}
              <span className={sentimentClass(review.sentiment)}>{review.sentiment}</span>
              <p>{cleanText(review.text)}</p>
              <div className="muted">
                {review.product_title ? `${cleanText(review.product_title)} - ` : ""}
                {review.verified_purchase ? "Achat vérifié" : "Achat non vérifié"}
              </div>
            </div>
          ))
        ) : (
          <div className="empty">Aucun avis disponible.</div>
        )}
      </div>
    </div>
  );
}

function GuideBot({
  dashboard,
  products,
  selectedProduct,
  onSelectProduct
}: {
  dashboard: AdminDashboard | null;
  products: Product[];
  selectedProduct: Product | null;
  onSelectProduct: (id: string, target?: View) => void;
}) {
  const quickQuestions = [
    "Quel produit acheter ?",
    "Quel produit éviter ?",
    "Quel produit peut marcher dans le futur ?",
    "Comment lire les scores ?",
    "Quel fournisseur est fiable ?"
  ];
  const [question, setQuestion] = useState(quickQuestions[0]);
  const [answer, setAnswer] = useState(() => buildBotAnswer(quickQuestions[0], products, dashboard, selectedProduct));

  function askBot(nextQuestion = question) {
    setQuestion(nextQuestion);
    setAnswer(buildBotAnswer(nextQuestion, products, dashboard, selectedProduct));
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>
          <Bot size={18} /> Assistant intelligent
        </h2>
        <span className="pill">Guide utilisateur</span>
      </div>
      <div className="panel-body guide-chat">
        <div className="bot-message user">
          <MessageCircle size={18} />
          <span>{answer.question}</span>
        </div>
        <div className="bot-message bot">
          <Lightbulb size={18} />
          <div>
            <strong>{answer.title}</strong>
            <p>{answer.text}</p>
          </div>
        </div>

        {answer.products.length ? (
          <div className="guide-products">
            {answer.products.map((product) => (
              <button
                className="guide-product"
                key={productKey(product)}
                onClick={() => onSelectProduct(productKey(product), "client-product")}
              >
                <span className={decisionClass(decision(product))}>{decisionLabel(decision(product))}</span>
                <strong>{product.title}</strong>
                <span className="muted">
                  {product.domain} - Confiance {confidenceLabel(product)} - Futur {pct(futurePotential(product))}
                </span>
              </button>
            ))}
          </div>
        ) : null}

        <div className="guide-input">
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Pose une question : quel produit acheter, éviter, comparer..."
          />
          <button className="button" onClick={() => askBot()} type="button">
            <Bot size={16} />
            Demander
          </button>
        </div>

        <div className="quick-questions">
          {quickQuestions.map((item) => (
            <button className="button secondary" key={item} onClick={() => askBot(item)} type="button">
              {item}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function buildBotAnswer(
  rawQuestion: string,
  products: Product[],
  dashboard: AdminDashboard | null,
  selectedProduct: Product | null
) {
  const normalized = rawQuestion.toLowerCase();
  const rankedByBuy = [...products].sort((a, b) => buyability(b) - buyability(a));
  const rankedByFuture = [...products].sort((a, b) => futurePotential(b) - futurePotential(a));
  const rankedByRisk = [...products].sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0));
  const best = rankedByBuy[0];
  const risky = rankedByRisk[0];
  const future = rankedByFuture[0];
  const supplier =
    dashboard?.supplier_ranking?.find((candidate) =>
      products.some((product) => product.store === candidate.store && (!candidate.domain || product.domain === candidate.domain))
    ) ?? dashboard?.supplier_ranking?.[0];

  if (normalized.includes("futur") || normalized.includes("avenir") || normalized.includes("marcher")) {
    return {
      question: rawQuestion,
      title: "Prédiction d'achat futur",
      text: future
        ? `${cleanText(future.title)} a le meilleur potentiel futur : ${pct(futurePotential(future))}. Le système combine popularité, avis positifs et confiance.`
        : "Je n'ai pas encore assez de données produit.",
      products: future ? rankedByFuture.slice(0, 3) : []
    };
  }

  if (normalized.includes("eviter") || normalized.includes("éviter") || normalized.includes("risque") || normalized.includes("mauvais")) {
    return {
      question: rawQuestion,
      title: "Produit à éviter ou surveiller",
      text: risky
        ? `${cleanText(risky.title)} ressort comme produit à surveiller. Raison : ${explainProduct(risky)}`
        : "Je n'ai pas encore assez de données produit.",
      products: risky ? rankedByRisk.slice(0, 3) : []
    };
  }

  if (normalized.includes("score") || normalized.includes("comprendre") || normalized.includes("difference")) {
    return {
      question: rawQuestion,
      title: "Comment le système décide",
      text:
        "Le client voit une confiance lisible. L'admin et Data & ML voient les scores techniques : sentiment, risque, popularité, fournisseur et recommandation.",
      products: selectedProduct ? [selectedProduct] : rankedByBuy.slice(0, 2)
    };
  }

  if (normalized.includes("fournisseur") || normalized.includes("vendeur") || normalized.includes("store")) {
    return {
      question: rawQuestion,
      title: "Fournisseur le plus fiable",
      text: supplier
        ? `${cleanText(supplier.store)} est bien classé actuellement : note moyenne, volume d'avis et faible taux négatif.`
        : "Je n'ai pas encore assez de données fournisseur.",
      products: rankedByBuy
        .filter((product) => product.store === supplier?.store && (!supplier?.domain || product.domain === supplier.domain))
        .slice(0, 3)
    };
  }

  return {
    question: rawQuestion,
    title: "Meilleur choix conseille",
    text: best
      ? `${cleanText(best.title)} est le meilleur choix actuel. Décision : ${decisionLabel(decision(best))}. ${explainProduct(best)}`
      : "Je n'ai pas encore assez de données produit.",
    products: best ? rankedByBuy.slice(0, 3) : []
  };
}
