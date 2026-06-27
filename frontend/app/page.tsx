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
import { useEffect, useMemo, useState } from "react";
import {
  AdminDashboard,
  apiGet,
  apiPost,
  Product,
  ProductKpi,
  Recommendation,
  Supplier
} from "../lib/api";

type View = "admin" | "products" | "product" | "supplier" | "sentiment" | "guide";
type DecisionFilter = "all" | "Achetable" | "A surveiller" | "A eviter";
type SortMode = "smart" | "future" | "risk" | "rating" | "popular";

type SupplierDashboard = {
  supplier: Supplier;
  top_products: ProductKpi[];
  problematic_products: ProductKpi[];
};

type SentimentResult = {
  text: string;
  sentiment: string;
  confidence: number | null;
};

const views: Array<{ id: View; label: string; icon: React.ComponentType<{ size?: number }> }> = [
  { id: "admin", label: "Admin", icon: BarChart3 },
  { id: "products", label: "Catalogue", icon: ShoppingBag },
  { id: "product", label: "Produit", icon: PackageSearch },
  { id: "supplier", label: "Fournisseur", icon: Store },
  { id: "sentiment", label: "Sentiment", icon: Brain },
  { id: "guide", label: "Guide", icon: Bot }
];

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

function decisionClass(value: string) {
  if (value === "Achetable") {
    return "pill good";
  }
  if (value === "A eviter") {
    return "pill danger";
  }
  return "pill warn";
}

function explainProduct(product: Product | ProductKpi) {
  if (product.purchase_reason) {
    return product.purchase_reason;
  }
  const value = decision(product);
  if (value === "Achetable") {
    return "Le produit combine bonne note, avis positifs et risque faible.";
  }
  if (value === "A surveiller") {
    return "Le produit peut etre interessant, mais il faut lire les avis avant achat.";
  }
  return "Le produit presente trop de signaux negatifs pour etre recommande.";
}

function Metric({
  icon: Icon,
  label,
  value,
  sub
}: {
  icon: React.ComponentType<{ size?: number }>;
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
      {rows.map((row) => {
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
      })}
    </div>
  );
}

function ProductRows({ products, onSelect }: { products: Product[]; onSelect: (id: string) => void }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Produit</th>
            <th>Categorie</th>
            <th>Fournisseur</th>
            <th>Prix</th>
            <th>Note</th>
            <th>Positif</th>
            <th>Decision</th>
            <th>Potentiel futur</th>
            <th>Risque</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.parent_asin}>
              <td>
                <div className="product-title">{product.title}</div>
                <div className="muted">{product.parent_asin}</div>
              </td>
              <td>{product.main_category}</td>
              <td>{product.store}</td>
              <td>{money(product.price)}</td>
              <td>{number(product.avg_rating, 2)}</td>
              <td>
                <span className="pill good">{pct(product.positive_rate)}</span>
              </td>
              <td>
                <span className={decisionClass(decision(product))}>{decision(product)}</span>
                <div className="muted">{explainProduct(product)}</div>
              </td>
              <td>{pct(futurePotential(product))}</td>
              <td>
                <span className={(product.risk_score ?? 0) > 0.35 ? "pill warn" : "pill"}>
                  {number(product.risk_score, 2)}
                </span>
              </td>
              <td>
                <button className="button secondary" onClick={() => onSelect(product.parent_asin)} type="button">
                  <PackageSearch size={16} />
                  Ouvrir
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Home() {
  const [view, setView] = useState<View>("admin");
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [productDetail, setProductDetail] = useState<Product | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [supplierDashboard, setSupplierDashboard] = useState<SupplierDashboard | null>(null);
  const [query, setQuery] = useState("");
  const [decisionFilter, setDecisionFilter] = useState<DecisionFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortMode, setSortMode] = useState<SortMode>("smart");
  const [minimumScore, setMinimumScore] = useState(0);
  const [reviewText, setReviewText] = useState("Produit de mauvaise qualite, taille trop petite.");
  const [sentiment, setSentiment] = useState<SentimentResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadCoreData() {
    setLoading(true);
    setError(null);
    try {
      const [dashboardData, productData, supplierData] = await Promise.all([
        apiGet<AdminDashboard>("/admin/dashboard"),
        apiGet<Product[]>("/products?limit=80"),
        apiGet<Supplier[]>("/suppliers?limit=80")
      ]);
      setDashboard(dashboardData);
      setProducts(productData);
      setSuppliers(supplierData);
      setSelectedProductId((current) => current || productData[0]?.parent_asin || "");
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

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = products.filter((product) => {
      const matchesSearch =
        !normalized || `${product.title} ${product.store} ${product.main_category}`.toLowerCase().includes(normalized);
      const matchesDecision = decisionFilter === "all" || decision(product) === decisionFilter;
      const matchesCategory = categoryFilter === "all" || product.main_category === categoryFilter;
      const matchesScore = buyability(product) >= minimumScore / 100;
      return matchesSearch && matchesDecision && matchesCategory && matchesScore;
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
  }, [products, query, decisionFilter, categoryFilter, sortMode, minimumScore]);

  const categories = useMemo(() => {
    return Array.from(new Set(products.map((product) => product.main_category).filter(Boolean))).sort();
  }, [products]);

  const productSummary = useMemo(() => {
    const values = products.reduce(
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
  }, [products]);

  async function predictSentiment() {
    setSentiment(null);
    const result = await apiPost<SentimentResult>("/ml/sentiment/predict", { text: reviewText });
    setSentiment(result);
  }

  function selectProduct(id: string) {
    setSelectedProductId(id);
    setView("product");
  }

  const activeTitle = {
    admin: "Dashboard administrateur",
    products: "Catalogue produits",
    product: "Analyse produit",
    supplier: "Dashboard fournisseur",
    sentiment: "Prediction de sentiment",
    guide: "Guide intelligent"
  }[view];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">DS</div>
          <div>
            <strong>E-commerce Intelligence</strong>
            <span>Amazon Fashion reviews</span>
          </div>
        </div>
        <nav className="nav" aria-label="Navigation principale">
          {views.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={view === item.id ? "nav-button active" : "nav-button"}
                key={item.id}
                onClick={() => setView(item.id)}
                type="button"
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="main">
        <div className="topbar">
          <div>
            <h1>{activeTitle}</h1>
            <p>Backend FastAPI, donnees Gold, modele de sentiment et recommandations.</p>
          </div>
          <div className="status">
            <CheckCircle2 size={16} />
            API FastAPI
            <button className="button secondary" onClick={() => void loadCoreData()} type="button">
              <RefreshCw size={16} />
              Actualiser
            </button>
          </div>
        </div>

        {error ? <div className="error">{error}</div> : null}
        {loading ? <div className="empty">Chargement des donnees...</div> : null}

        {!loading && !error && view === "admin" && dashboard ? (
          <section className="grid">
            <div className="grid metrics">
              <Metric icon={ShoppingBag} label="Avis" value={number(dashboard.global_kpis.total_reviews)} />
              <Metric icon={PackageSearch} label="Produits" value={number(dashboard.global_kpis.total_products)} />
              <Metric icon={Store} label="Fournisseurs" value={number(dashboard.global_kpis.total_suppliers)} />
              <Metric
                icon={Star}
                label="Note moyenne"
                value={number(dashboard.global_kpis.average_rating_global, 2)}
              />
              <Metric
                icon={AlertTriangle}
                label="Avis negatifs"
                value={pct(dashboard.global_kpis.negative_rate_global)}
              />
            </div>

            <div className="grid two">
              <div className="panel">
                <div className="panel-header">
                  <h2>Sentiments</h2>
                </div>
                <div className="panel-body">
                  <BarList rows={dashboard.sentiment_stats} labelKey="sentiment" valueKey="nb_reviews" />
                </div>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <h2>Categories a surveiller</h2>
                </div>
                <div className="panel-body">
                  <BarList
                    rows={dashboard.categories.map((category) => ({
                      main_category: category.main_category,
                      negative_rate: category.negative_rate
                    }))}
                    labelKey="main_category"
                    valueKey="negative_rate"
                    formatter={pct}
                  />
                </div>
              </div>
            </div>

            <div className="grid two">
              <KpiTable
                title="Produits populaires"
                products={dashboard.top_products}
                scoreKey="popularity_score"
                scoreLabel="Popularite"
                onSelect={selectProduct}
              />
              <KpiTable
                title="Produits problematiques"
                products={dashboard.problematic_products}
                scoreKey="risk_score"
                scoreLabel="Risque"
                onSelect={selectProduct}
              />
            </div>
          </section>
        ) : null}

        {!loading && !error && view === "products" ? (
          <section className="grid">
            <div className="grid three">
              <Metric icon={CheckCircle2} label="Achetables" value={number(productSummary.achetable)} sub="Bon choix" />
              <Metric icon={AlertTriangle} label="A surveiller" value={number(productSummary.watch)} sub="Lire les avis" />
              <Metric icon={ShieldCheck} label="A eviter" value={number(productSummary.avoid)} sub="Risque trop haut" />
            </div>

            <div className="toolbar">
              <div className="field" style={{ flex: 1 }}>
                <Search size={18} />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher" />
              </div>
              <div className="field">
                <SlidersHorizontal size={18} />
                <select value={decisionFilter} onChange={(event) => setDecisionFilter(event.target.value as DecisionFilter)}>
                  <option value="all">Tous les produits</option>
                  <option value="Achetable">Achetable</option>
                  <option value="A surveiller">A surveiller</option>
                  <option value="A eviter">A eviter</option>
                </select>
              </div>
              <div className="field">
                <Target size={18} />
                <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                  <option value="all">Toutes categories</option>
                  {categories.map((category) => (
                    <option value={category} key={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <ArrowDownUp size={18} />
                <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
                  <option value="smart">Meilleur achat</option>
                  <option value="future">Potentiel futur</option>
                  <option value="risk">Moins risque</option>
                  <option value="rating">Meilleure note</option>
                  <option value="popular">Plus populaire</option>
                </select>
              </div>
            </div>

            <div className="panel">
              <div className="panel-body score-filter">
                <div>
                  <strong>Score minimum d'achat</strong>
                  <div className="muted">0% affiche tout, 70% garde seulement les produits faciles a recommander.</div>
                </div>
                <input
                  aria-label="Score minimum d'achat"
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
              {filteredProducts.slice(0, 12).map((product) => (
                <article className="product-card" key={product.parent_asin}>
                  <div className="product-visual">
                    <div className="visual-block" />
                    <div className="visual-line" />
                  </div>
                  <div>
                    <div className="product-title">{product.title}</div>
                    <div className="muted">{product.store}</div>
                  </div>
                  <div className="grid three">
                    <span className="pill">{number(product.avg_rating, 2)} / 5</span>
                    <span className="pill good">{pct(product.positive_rate)}</span>
                    <span className={decisionClass(decision(product))}>{decision(product)}</span>
                  </div>
                  <div className="smart-score">
                    <span>Score achat</span>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${Math.round(buyability(product) * 100)}%` }} />
                    </div>
                    <strong>{pct(buyability(product))}</strong>
                  </div>
                  <div className="muted">{explainProduct(product)}</div>
                  <button className="button" onClick={() => selectProduct(product.parent_asin)} type="button">
                    <PackageSearch size={16} />
                    Analyser
                  </button>
                </article>
              ))}
            </div>

            <div className="panel">
              <div className="panel-header">
                <h2>Liste complete</h2>
              </div>
              <ProductRows products={filteredProducts} onSelect={selectProduct} />
            </div>
          </section>
        ) : null}

        {!loading && !error && view === "product" ? (
          <ProductDetail
            products={products}
            selectedProductId={selectedProductId}
            setSelectedProductId={setSelectedProductId}
            productDetail={productDetail}
            recommendations={recommendations}
          />
        ) : null}

        {!loading && !error && view === "supplier" ? (
          <SupplierView
            suppliers={suppliers}
            selectedSupplierId={selectedSupplierId}
            setSelectedSupplierId={setSelectedSupplierId}
            supplierDashboard={supplierDashboard}
            onSelect={selectProduct}
          />
        ) : null}

        {!loading && !error && view === "sentiment" ? (
          <section className="grid two">
            <div className="panel">
              <div className="panel-header">
                <h2>Avis client</h2>
              </div>
              <div className="panel-body sentiment-box">
                <textarea value={reviewText} onChange={(event) => setReviewText(event.target.value)} />
                <button className="button" onClick={() => void predictSentiment()} type="button">
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
        ) : null}

        {!loading && !error && view === "guide" ? (
          <GuideBot
            dashboard={dashboard}
            products={products}
            selectedProduct={productDetail}
            onSelectProduct={selectProduct}
          />
        ) : null}
      </main>
    </div>
  );
}

function KpiTable({
  title,
  products,
  scoreKey,
  scoreLabel,
  onSelect
}: {
  title: string;
  products: ProductKpi[];
  scoreKey: "risk_score" | "popularity_score";
  scoreLabel: string;
  onSelect: (id: string) => void;
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
              <th>{scoreLabel}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.parent_asin}>
                <td>
                  <div className="product-title">{product.product_title}</div>
                  <div className="muted">{product.store}</div>
                </td>
                <td>{number(product.avg_rating, 2)}</td>
                <td>{number(product[scoreKey], 2)}</td>
                <td>
                  <button className="button secondary" onClick={() => onSelect(product.parent_asin)} type="button">
                    <PackageSearch size={16} />
                    Voir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProductDetail({
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
  return (
    <section className="grid">
      <div className="toolbar">
        <div className="field" style={{ minWidth: 320 }}>
          <PackageSearch size={18} />
          <select value={selectedProductId} onChange={(event) => setSelectedProductId(event.target.value)}>
            {products.map((product) => (
              <option value={product.parent_asin} key={product.parent_asin}>
                {product.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {productDetail ? (
        <div className="detail-layout">
          <div className="grid">
            <div className="panel">
              <div className="panel-header">
                <h2>{productDetail.title}</h2>
                <span className="pill">{productDetail.parent_asin}</span>
              </div>
              <div className="panel-body">
                <div className="grid metrics">
                  <Metric icon={Star} label="Note" value={number(productDetail.avg_rating, 2)} />
                  <Metric icon={ShoppingBag} label="Avis" value={number(productDetail.nb_reviews)} />
                  <Metric icon={TrendingUp} label="Positif" value={pct(productDetail.positive_rate)} />
                  <Metric icon={AlertTriangle} label="Negatif" value={pct(productDetail.negative_rate)} />
                  <Metric icon={ShieldCheck} label="Risque" value={number(productDetail.risk_score, 2)} />
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <h2>Avis recents</h2>
              </div>
              <div className="panel-body reviews">
                {productDetail.recent_reviews?.length ? (
                  productDetail.recent_reviews.map((review) => (
                    <div className="review" key={review.review_id}>
                      <strong>{number(review.rating, 1)} / 5</strong>{" "}
                      <span className={review.sentiment === "negatif" ? "pill warn" : "pill good"}>
                        {review.sentiment}
                      </span>
                      <p>{review.text}</p>
                      <div className="muted">{review.verified_purchase ? "Achat verifie" : "Achat non verifie"}</div>
                    </div>
                  ))
                ) : (
                  <div className="empty">Aucun avis recent.</div>
                )}
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>Recommandations</h2>
            </div>
            <div className="panel-body reviews">
              {recommendations.length ? (
                recommendations.map((recommendation) => (
                  <div className="review" key={recommendation.recommended_product_id}>
                    <div className="product-title">{recommendation.recommended_title}</div>
                    <div className="muted">{recommendation.recommended_product_id}</div>
                    <span className="pill">{number(recommendation.recommendation_score, 2)}</span>
                  </div>
                ))
              ) : (
                <div className="empty">Aucune recommandation disponible.</div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="empty">Produit introuvable.</div>
      )}
    </section>
  );
}

function SupplierView({
  suppliers,
  selectedSupplierId,
  setSelectedSupplierId,
  supplierDashboard,
  onSelect
}: {
  suppliers: Supplier[];
  selectedSupplierId: string;
  setSelectedSupplierId: (id: string) => void;
  supplierDashboard: SupplierDashboard | null;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="grid">
      <div className="toolbar">
        <div className="field" style={{ minWidth: 320 }}>
          <Store size={18} />
          <select value={selectedSupplierId} onChange={(event) => setSelectedSupplierId(event.target.value)}>
            {suppliers.map((supplier) => (
              <option value={supplier.supplier_id} key={supplier.supplier_id}>
                {supplier.store}
              </option>
            ))}
          </select>
        </div>
      </div>

      {supplierDashboard ? (
        <>
          <div className="grid metrics">
            <Metric icon={PackageSearch} label="Produits" value={number(supplierDashboard.supplier.nb_products)} />
            <Metric icon={ShoppingBag} label="Avis" value={number(supplierDashboard.supplier.nb_reviews)} />
            <Metric
              icon={Star}
              label="Note moyenne"
              value={number(supplierDashboard.supplier.avg_supplier_rating, 2)}
            />
            <Metric
              icon={AlertTriangle}
              label="Avis negatifs"
              value={pct(supplierDashboard.supplier.supplier_negative_rate)}
            />
            <Metric
              icon={ShieldCheck}
              label="Score"
              value={number(supplierDashboard.supplier.supplier_score, 2)}
            />
          </div>

          <div className="grid two">
            <KpiTable
              title="Meilleurs produits"
              products={supplierDashboard.top_products}
              scoreKey="popularity_score"
              scoreLabel="Popularite"
              onSelect={onSelect}
            />
            <KpiTable
              title="Produits a ameliorer"
              products={supplierDashboard.problematic_products}
              scoreKey="risk_score"
              scoreLabel="Risque"
              onSelect={onSelect}
            />
          </div>
        </>
      ) : (
        <div className="empty">Fournisseur introuvable.</div>
      )}
    </section>
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
  onSelectProduct: (id: string) => void;
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
    <section className="guide-layout">
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
                <button className="guide-product" key={product.parent_asin} onClick={() => onSelectProduct(product.parent_asin)}>
                  <span className={decisionClass(decision(product))}>{decision(product)}</span>
                  <strong>{product.title}</strong>
                  <span className="muted">
                    Achat {pct(buyability(product))} - Futur {pct(futurePotential(product))} - Risque{" "}
                    {number(product.risk_score, 2)}
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
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2>Questions rapides</h2>
        </div>
        <div className="panel-body quick-questions">
          {quickQuestions.map((item) => (
            <button className="button secondary" key={item} onClick={() => askBot(item)} type="button">
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="panel guide-rules">
        <div className="panel-header">
          <h2>Logique simple</h2>
        </div>
        <div className="panel-body">
          <div className="rule">
            <span className="pill good">Achetable</span>
            <p>Bonne note, beaucoup d'avis positifs, faible risque. C'est le choix le plus facile a recommander.</p>
          </div>
          <div className="rule">
            <span className="pill warn">A surveiller</span>
            <p>Le produit est interessant, mais il faut verifier les avis et comparer avec un produit similaire.</p>
          </div>
          <div className="rule">
            <span className="pill danger">A eviter</span>
            <p>Les avis negatifs ou le risque sont trop eleves. Le systeme conseille de chercher une alternative.</p>
          </div>
        </div>
      </div>
    </section>
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
  const supplier = dashboard?.supplier_ranking?.[0];

  if (normalized.includes("futur") || normalized.includes("avenir") || normalized.includes("marcher")) {
    return {
      question: rawQuestion,
      title: "Prediction d'achat futur",
      text: future
        ? `${future.title} a le meilleur potentiel futur : score futur ${pct(futurePotential(future))}. Le systeme regarde la popularite, les avis positifs et le risque.`
        : "Je n'ai pas encore assez de donnees produit.",
      products: future ? rankedByFuture.slice(0, 3) : []
    };
  }

  if (normalized.includes("eviter") || normalized.includes("risque") || normalized.includes("mauvais")) {
    return {
      question: rawQuestion,
      title: "Produit a eviter ou surveiller",
      text: risky
        ? `${risky.title} ressort comme produit le plus risque. Raison : ${explainProduct(risky)}`
        : "Je n'ai pas encore assez de donnees produit.",
      products: risky ? rankedByRisk.slice(0, 3) : []
    };
  }

  if (normalized.includes("score") || normalized.includes("comprendre") || normalized.includes("difference")) {
    return {
      question: rawQuestion,
      title: "Comment le systeme decide",
      text:
        "Le score d'achat combine la note moyenne, le taux d'avis positifs, les achats verifies, la popularite et le risque. Plus le score est haut, plus le produit est simple a recommander. Le potentiel futur ajoute l'effet popularite pour predire les produits qui peuvent continuer a etre achetes.",
      products: selectedProduct ? [selectedProduct] : rankedByBuy.slice(0, 2)
    };
  }

  if (normalized.includes("fournisseur") || normalized.includes("vendeur") || normalized.includes("store")) {
    return {
      question: rawQuestion,
      title: "Fournisseur le plus fiable",
      text: supplier
        ? `${supplier.store} est le fournisseur le mieux classe actuellement. Il combine note moyenne, volume d'avis et faible taux negatif.`
        : "Je n'ai pas encore assez de donnees fournisseur.",
      products: rankedByBuy.filter((product) => product.store === supplier?.store).slice(0, 3)
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
