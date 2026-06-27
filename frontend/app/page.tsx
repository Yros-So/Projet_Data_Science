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
  Search,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Star,
  Store,
  Target,
  TrendingUp
} from "lucide-react";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  AdminDashboard,
  apiGet,
  apiPost,
  CategoryKpi,
  Product,
  ProductKpi,
  Recommendation,
  Review,
  Supplier
} from "../lib/api";

type View =
  | "admin"
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
  recommendations?: number;
  model?: {
    best_model: string;
    accuracy: number;
    classes: string[];
  };
};

type NavItem = {
  id: View;
  label: string;
  icon: ComponentType<{ size?: number }>;
  adminOnly?: boolean;
};

const navGroups: Array<{ title: string; items: NavItem[] }> = [
  {
    title: "Vue globale",
    items: [{ id: "admin", label: "Dashboard global", icon: BarChart3, adminOnly: true }]
  },
  {
    title: "Espace client",
    items: [
      { id: "client-catalogue", label: "Catalogue", icon: ShoppingBag },
      { id: "client-product", label: "Detail produit", icon: PackageSearch },
      { id: "client-recommendations", label: "Recommandations", icon: Target },
      { id: "client-sentiment", label: "Analyse sentiment", icon: Brain }
    ]
  },
  {
    title: "Espace fournisseur",
    items: [
      { id: "supplier-dashboard", label: "Dashboard fournisseur", icon: Store },
      { id: "supplier-products", label: "Mes produits", icon: ShoppingBag },
      { id: "supplier-negative", label: "Avis negatifs", icon: MessageCircle },
      { id: "supplier-actions", label: "Actions", icon: Lightbulb }
    ]
  },
  {
    title: "Data & ML",
    items: [{ id: "data-ml", label: "Pipeline et modeles", icon: Brain }]
  },
  {
    title: "Guide",
    items: [{ id: "guide", label: "Architecture", icon: Bot }]
  }
];

const defaultDomains = ["Amazon_Fashion", "All_Beauty", "Appliances", "Electronics"];

function pct(value?: number | null) {
  return `${Math.round((value ?? 0) * 100)}%`;
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
    return "Confiance elevee";
  }
  if (score >= 0.55) {
    return "Confiance moyenne";
  }
  return "Produit a surveiller";
}

function confidenceClass(product: Product | ProductKpi) {
  const label = confidenceLabel(product);
  if (label === "Confiance elevee") {
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
  return "Signaux negatifs trop presents pour un achat simple.";
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
        rows.map((row) => {
          const value = Number(row[valueKey] ?? 0);
          return (
            <div className="bar-row" key={`${row[labelKey]}-${value}`}>
              <span>{String(row[labelKey])}</span>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${Math.max(4, (value / max) * 100)}%` }} />
              </div>
              <strong>{formatter(value)}</strong>
            </div>
          );
        })
      ) : (
        <div className="empty">Aucune donnee pour ce filtre.</div>
      )}
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
            {product.domain} - {product.title}
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
            {supplier.store}
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
  const [reviewText, setReviewText] = useState("Produit de mauvaise qualite, taille trop petite.");
  const [sentiment, setSentiment] = useState<SentimentResult | null>(null);
  const [pipelineResult, setPipelineResult] = useState<PipelineRunResult | null>(null);
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadCoreData() {
    setLoading(true);
    setError(null);
    try {
      const [dashboardData, productData, supplierData, categoryData] = await Promise.all([
        apiGet<AdminDashboard>("/admin/dashboard"),
        apiGet<Product[]>("/products?limit=200"),
        apiGet<Supplier[]>("/suppliers?limit=100"),
        apiGet<CategoryKpi[]>("/categories/performance")
      ]);
      setDashboard(dashboardData);
      setProducts(productData);
      setSuppliers(supplierData);
      setCategoryKpis(categoryData);
      setSelectedProductId((current) => current || (productData[0] ? productKey(productData[0]) : ""));
      setSelectedSupplierId((current) => current || supplierData[0]?.supplier_id || "");
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "API indisponible");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCoreData();
  }, []);

  const domainOptions = useMemo(() => {
    const domains = new Set<string>(defaultDomains);
    dashboard?.global_kpis.domains?.forEach((domain) => domains.add(domain));
    products.forEach((product) => {
      if (product.domain) {
        domains.add(product.domain);
      }
    });
    return Array.from(domains).sort();
  }, [dashboard, products]);

  const domainProducts = useMemo(() => {
    if (datasetFilter === "all") {
      return products;
    }
    return products.filter((product) => product.domain === datasetFilter);
  }, [products, datasetFilter]);

  const categoryOptions = useMemo(() => {
    return Array.from(new Set(domainProducts.map((product) => product.main_category).filter(Boolean))).sort();
  }, [domainProducts]);

  const supplierOptions = useMemo(() => {
    return Array.from(new Set(domainProducts.map((product) => product.store).filter(Boolean))).sort();
  }, [domainProducts]);

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

  const riskySuppliers = useMemo(() => {
    return [...scopedSuppliers].sort(
      (a, b) =>
        (b.nb_problematic_products ?? 0) - (a.nb_problematic_products ?? 0) ||
        (b.supplier_negative_rate ?? 0) - (a.supplier_negative_rate ?? 0)
    );
  }, [scopedSuppliers]);

  const selectedSupplierProducts = useMemo(() => {
    return domainProducts.filter((product) => product.supplier_id === selectedSupplierId);
  }, [domainProducts, selectedSupplierId]);

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
    const currentSupplierIsVisible = scopedSuppliers.some((supplier) => supplier.supplier_id === selectedSupplierId);
    if (!currentSupplierIsVisible) {
      setSelectedSupplierId(scopedSuppliers[0]?.supplier_id || "");
    }
  }, [domainProducts, scopedSuppliers, selectedProductId, selectedSupplierId]);

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
    "client-catalogue": "Catalogue client",
    "client-product": "Detail produit",
    "client-recommendations": "Recommandations client",
    "client-sentiment": "Analyse sentiment",
    "supplier-dashboard": "Dashboard fournisseur",
    "supplier-products": "Mes produits",
    "supplier-negative": "Avis negatifs",
    "supplier-actions": "Actions recommandees",
    "data-ml": "Data & Machine Learning",
    guide: "Architecture et documentation"
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

          <div className="dataset-picker filter-panel">
            <label htmlFor="dataset-select">Categorie dataset</label>
            <select id="dataset-select" value={datasetFilter} onChange={(event) => setDatasetFilter(event.target.value)}>
              <option value="all">Toutes</option>
              {domainOptions.map((domain) => (
                <option value={domain} key={domain}>
                  {domain}
                </option>
              ))}
            </select>

            <label htmlFor="category-select">Categorie produit</label>
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
              <option value="negatif">Negatif</option>
            </select>

            <label htmlFor="risk-filter">Niveau de risque</label>
            <select id="risk-filter" value={riskFilter} onChange={(event) => setRiskFilter(event.target.value as RiskFilter)}>
              <option value="all">Tous</option>
              <option value="faible">Faible</option>
              <option value="moyen">Moyen</option>
              <option value="eleve">Eleve</option>
            </select>

            <label htmlFor="period-filter">Periode</label>
            <select id="period-filter" value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value as PeriodFilter)}>
              <option value="all">Toutes</option>
              <option value="2020">2020</option>
              <option value="2021">2021</option>
              <option value="2022">2022</option>
              <option value="2023">2023</option>
            </select>
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
        </aside>
      ) : null}

      <main className="main">
        <div className="topbar">
          <div>
            <h1>{activeTitle[view]}</h1>
            <p>Client, fournisseur, administrateur et Data & ML sur les tables Gold.</p>
          </div>
          <div className="status">
            <button className="button secondary" onClick={() => setSidebarOpen((current) => !current)} type="button">
              <SlidersHorizontal size={16} />
              {sidebarOpen ? "Cacher menu" : "Afficher menu"}
            </button>
            <span className="pill">{datasetFilter === "all" ? "Global" : datasetFilter}</span>
            <CheckCircle2 size={16} />
            API FastAPI
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
        {loading ? <div className="empty">Chargement des donnees...</div> : null}

        {!loading && !error && view === "admin" ? (
          <AdminPage
            categories={scopedCategoryKpis}
            kpis={visibleKpis}
            problematicProducts={problematicProducts}
            riskySuppliers={riskySuppliers}
            sentimentRows={sentimentRows}
            onSelectProduct={selectProduct}
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
            products={selectedSupplierProducts}
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
            suppliers={scopedSuppliers}
          />
        ) : null}

        {!loading && !error && view === "supplier-actions" ? (
          <SupplierActionsPage
            products={selectedSupplierImproveProducts}
            reviews={supplierDashboard?.negative_reviews ?? []}
            selectedSupplierId={selectedSupplierId}
            setSelectedSupplierId={setSelectedSupplierId}
            suppliers={scopedSuppliers}
          />
        ) : null}

        {!loading && !error && view === "data-ml" ? (
          <DataMlPage
            categories={scopedCategoryKpis}
            kpis={visibleKpis}
            onRunPipeline={runLiveTraining}
            pipelineLoading={pipelineLoading}
            pipelineResult={pipelineResult}
            products={scopedProducts}
          />
        ) : null}

        {!loading && !error && view === "guide" ? (
          <GuidePage dashboard={dashboard} products={scopedProducts} selectedProduct={productDetail} onSelectProduct={selectProduct} />
        ) : null}
      </main>
    </div>
  );
}

function AdminPage({
  categories,
  kpis,
  problematicProducts,
  riskySuppliers,
  sentimentRows,
  onSelectProduct
}: {
  categories: CategoryKpi[];
  kpis: {
    total_reviews: number;
    total_products: number;
    total_suppliers: number;
    total_categories: number;
    average_rating_global: number;
    negative_rate_global: number;
  };
  problematicProducts: Product[];
  riskySuppliers: Supplier[];
  sentimentRows: Array<{ sentiment: string; nb_reviews: number; avg_rating: number }>;
  onSelectProduct: (id: string) => void;
}) {
  return (
    <section className="grid">
      <div className="grid metrics">
        <Metric icon={ShoppingBag} label="Avis" value={number(kpis.total_reviews)} />
        <Metric icon={PackageSearch} label="Produits" value={number(kpis.total_products)} />
        <Metric icon={Store} label="Fournisseurs" value={number(kpis.total_suppliers)} />
        <Metric icon={Star} label="Note moyenne" value={number(kpis.average_rating_global, 2)} />
        <Metric icon={AlertTriangle} label="Avis negatifs" value={pct(kpis.negative_rate_global)} />
      </div>

      <div className="grid two">
        <div className="panel">
          <div className="panel-header">
            <h2>Categories a surveiller</h2>
          </div>
          <div className="panel-body">
            <BarList
              rows={categories
                .slice()
                .sort((a, b) => b.risk_score - a.risk_score)
                .slice(0, 8)
                .map((category) => ({
                  label: `${category.domain} - ${category.main_category}`,
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
            <BarList rows={sentimentRows} labelKey="sentiment" valueKey="nb_reviews" />
          </div>
        </div>
      </div>

      <div className="grid two">
        <RiskySuppliersTable suppliers={riskySuppliers.slice(0, 8)} />
        <TechnicalProductTable
          onSelect={onSelectProduct}
          products={problematicProducts.slice(0, 8)}
          scoreKey="risk_score"
          title="Produits problematiques"
        />
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
        <Metric icon={AlertTriangle} label="A surveiller" value={number(productSummary.watch)} sub="Lire les avis" />
        <Metric icon={ShieldCheck} label="A eviter" value={number(productSummary.avoid)} sub="Risque client" />
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
            <option value="A surveiller">A surveiller</option>
            <option value="A eviter">A eviter</option>
          </select>
        </div>
        <div className="field">
          <ArrowDownUp size={18} />
          <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
            <option value="smart">Meilleur achat</option>
            <option value="future">Potentiel futur</option>
            <option value="risk">Plus sur</option>
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
              <div className="product-title">{product.title}</div>
              <div className="muted">
                {product.main_category} - {product.store}
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
                Detail
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
              <th>Decision</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={productKey(product)}>
                <td>
                  <div className="product-title">{product.title}</div>
                  <div className="muted">
                    {product.domain} - {product.main_category} - {product.store}
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
                  <span className={decisionClass(decision(product))}>{decision(product)}</span>
                </td>
                <td>
                  <div className="button-row">
                    <button className="button secondary" onClick={() => onSelect(productKey(product), "client-product")} type="button">
                      Detail
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
        { label: "Negatifs", value: productDetail.negative_rate ?? 0 }
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
                <h2>{productDetail.title}</h2>
                <span className={confidenceClass(productDetail)}>{confidenceLabel(productDetail)}</span>
              </div>
              <div className="panel-body">
                <div className="grid metrics">
                  <Metric icon={Store} label="Fournisseur" value={productDetail.store ?? "-"} />
                  <Metric icon={Target} label="Categorie" value={productDetail.main_category ?? "-"} />
                  <Metric icon={Star} label="Note moyenne" value={number(productDetail.avg_rating, 2)} />
                  <Metric icon={ShoppingBag} label="Nombre d'avis" value={number(productDetail.nb_reviews)} />
                  <Metric icon={Brain} label="Sentiment global" value={productDetail.dominant_sentiment ?? "-"} />
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <h2>Avis positifs / neutres / negatifs</h2>
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
        <h2>Produits similaires recommandes</h2>
      </div>
      <div className="panel-body reviews">
        {recommendations.length ? (
          recommendations.map((recommendation) => (
            <div className="review" key={recommendation.recommended_product_id}>
              <div className="product-title">{recommendation.recommended_title}</div>
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
            Predire
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2>Resultat</h2>
        </div>
        <div className="panel-body">
          {sentiment ? (
            <div className="grid">
              <Metric
                icon={ShieldCheck}
                label="Sentiment"
                value={sentiment.sentiment}
                sub={sentiment.confidence ? `Confiance ${pct(sentiment.confidence)}` : undefined}
              />
              <div className="review">{sentiment.text}</div>
            </div>
          ) : (
            <div className="empty">Aucune prediction pour le moment.</div>
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
            <Metric icon={AlertTriangle} label="Avis negatifs" value={pct(supplierDashboard.supplier.supplier_negative_rate)} />
            <Metric icon={ShieldCheck} label="Score fournisseur" value={number(supplierDashboard.supplier.supplier_score, 2)} />
            <Metric
              icon={TrendingUp}
              label="Produits a ameliorer"
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
              title="Produits a ameliorer"
            />
          </div>

          <ReviewsList reviews={supplierDashboard.negative_reviews ?? []} title="Avis negatifs recents" />
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
      <ReviewsList reviews={reviews} title="Avis negatifs recents" />
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
  const hasQualityIssue = reviews.some((review) => review.text.toLowerCase().includes("qualite"));
  const hasDeliveryIssue = reviews.some((review) => review.text.toLowerCase().includes("livraison"));
  const actions = [
    hasSizeIssue
      ? "Beaucoup d'avis negatifs mentionnent la taille. Action : verifier la description des tailles du produit."
      : "Verifier que les titres et descriptions donnent assez de contexte avant l'achat.",
    hasQualityIssue
      ? "Des avis mentionnent la qualite. Action : controler les materiaux, photos et attentes client."
      : "Surveiller les produits dont la confiance descend sous le niveau moyen.",
    hasDeliveryIssue
      ? "Des avis mentionnent la livraison. Action : revoir la promesse logistique ou les informations de delai."
      : "Comparer les produits a ameliorer avec les meilleurs produits du meme fournisseur."
  ];

  return (
    <section className="grid">
      <SupplierSelect suppliers={suppliers} selectedSupplierId={selectedSupplierId} setSelectedSupplierId={setSelectedSupplierId} />
      <div className="grid two">
        <div className="panel">
          <div className="panel-header">
            <h2>Actions recommandees</h2>
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
  categories,
  kpis,
  onRunPipeline,
  pipelineLoading,
  pipelineResult,
  products
}: {
  categories: CategoryKpi[];
  kpis: {
    total_reviews: number;
    total_products: number;
    total_suppliers: number;
    total_categories: number;
    average_rating_global: number;
  };
  onRunPipeline: () => void;
  pipelineLoading: boolean;
  pipelineResult: PipelineRunResult | null;
  products: Product[];
}) {
  return (
    <section className="grid">
      <div className="grid three">
        <Metric icon={ShoppingBag} label="Lignes avis traitees" value={number(kpis.total_reviews)} />
        <Metric icon={PackageSearch} label="Produits Gold" value={number(kpis.total_products)} />
        <Metric icon={Target} label="Categories Gold" value={number(kpis.total_categories)} />
      </div>

      <div className="grid two">
        <div className="panel">
          <div className="panel-header">
            <h2>Pipeline Bronze / Silver / Gold</h2>
            <button className="button" disabled={pipelineLoading} onClick={onRunPipeline} type="button">
              <RefreshCw size={16} />
              {pipelineLoading ? "Entrainement..." : "Relancer ETL + ML"}
            </button>
          </div>
          <div className="panel-body timeline">
            <div className="review">Bronze : reviews + metadata par categorie.</div>
            <div className="review">Silver : reviews_clean et products_clean avec domain, global_product_id, supplier_id.</div>
            <div className="review">Gold : product_kpis, supplier_kpis, category_kpis, recommendations.</div>
            <div className="review">API : FastAPI expose uniquement les tables Gold et les predictions.</div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Audit live du systeme</h2>
          </div>
          <div className="panel-body reviews">
            <div className="review">Modele sentiment : TF-IDF + comparaison baseline / Naive Bayes / Logistic Regression.</div>
            <div className="review">Recommandation : similarite texte + confiance + popularite.</div>
            <div className="review">Produits filtres actuellement : {number(products.length)}</div>
            {pipelineResult ? (
              <div className="review">
                Dernier run : {pipelineResult.quality_status}, {number(pipelineResult.reviews)} avis,{" "}
                {number(pipelineResult.products)} produits, modele {pipelineResult.model?.best_model}.
              </div>
            ) : (
              <div className="review">Aucun run lance depuis cette interface.</div>
            )}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2>Performance categories</h2>
        </div>
        <div className="panel-body">
          <BarList
            rows={categories.map((category) => ({
              label: `${category.domain} - ${category.main_category}`,
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
          <h2>Relation logique du systeme</h2>
        </div>
        <div className="panel-body timeline">
          <div className="review">Avis client &rarr; analyse de sentiment.</div>
          <div className="review">Sentiment &rarr; scores produit : confiance, risque, achetable.</div>
          <div className="review">Scores produit &rarr; scores fournisseur et categories.</div>
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
            {products.map((product) => (
              <tr key={productKey(product)}>
                <td>
                  <div className="product-title">{productLabel(product)}</div>
                  <div className="muted">
                    {product.domain} - {product.store}
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
            ))}
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
        <h2>Fournisseurs a risque</h2>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Fournisseur</th>
              <th>Domaine</th>
              <th>Produits</th>
              <th>Avis negatifs</th>
              <th>Produits a risque</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((supplier) => (
              <tr key={`${supplier.supplier_id}-${supplier.domain}`}>
                <td>{supplier.store}</td>
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

function ReviewsList({ reviews, title = "Avis recents" }: { reviews: Review[]; title?: string }) {
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
              <p>{review.text}</p>
              <div className="muted">
                {review.product_title ? `${review.product_title} - ` : ""}
                {review.verified_purchase ? "Achat verifie" : "Achat non verifie"}
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
    "Quel produit eviter ?",
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
                <span className={decisionClass(decision(product))}>{decision(product)}</span>
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
            placeholder="Pose une question : quel produit acheter, eviter, comparer..."
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
      title: "Prediction d'achat futur",
      text: future
        ? `${future.title} a le meilleur potentiel futur : ${pct(futurePotential(future))}. Le systeme combine popularite, avis positifs et confiance.`
        : "Je n'ai pas encore assez de donnees produit.",
      products: future ? rankedByFuture.slice(0, 3) : []
    };
  }

  if (normalized.includes("eviter") || normalized.includes("risque") || normalized.includes("mauvais")) {
    return {
      question: rawQuestion,
      title: "Produit a eviter ou surveiller",
      text: risky
        ? `${risky.title} ressort comme produit a surveiller. Raison : ${explainProduct(risky)}`
        : "Je n'ai pas encore assez de donnees produit.",
      products: risky ? rankedByRisk.slice(0, 3) : []
    };
  }

  if (normalized.includes("score") || normalized.includes("comprendre") || normalized.includes("difference")) {
    return {
      question: rawQuestion,
      title: "Comment le systeme decide",
      text:
        "Le client voit une confiance lisible. L'admin et Data & ML voient les scores techniques : sentiment, risque, popularite, fournisseur et recommandation.",
      products: selectedProduct ? [selectedProduct] : rankedByBuy.slice(0, 2)
    };
  }

  if (normalized.includes("fournisseur") || normalized.includes("vendeur") || normalized.includes("store")) {
    return {
      question: rawQuestion,
      title: "Fournisseur le plus fiable",
      text: supplier
        ? `${supplier.store} est bien classe actuellement : note moyenne, volume d'avis et faible taux negatif.`
        : "Je n'ai pas encore assez de donnees fournisseur.",
      products: rankedByBuy
        .filter((product) => product.store === supplier?.store && (!supplier?.domain || product.domain === supplier.domain))
        .slice(0, 3)
    };
  }

  return {
    question: rawQuestion,
    title: "Meilleur choix conseille",
    text: best
      ? `${best.title} est le meilleur choix actuel. Decision : ${decision(best)}. ${explainProduct(best)}`
      : "Je n'ai pas encore assez de donnees produit.",
    products: best ? rankedByBuy.slice(0, 3) : []
  };
}
