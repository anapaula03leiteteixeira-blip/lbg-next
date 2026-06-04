"use client";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import AppLayout from "@/components/layout/AppLayout";
import type { Produto, Categoria, Qualidade } from "@/types";
import { Search, SlidersHorizontal, X, ChevronDown } from "lucide-react";

const CATEGORIAS: Categoria[] = ["cuba","sanitario","flexivel","rejunte","acessorio","outro"];
const QUALIDADES: Qualidade[] = ["excelente","boa","regular","ruim"];

const QUAL_BADGE: Record<string, string> = {
  excelente: "badge-excelente",
  boa:       "badge-boa",
  regular:   "badge-regular",
  ruim:      "badge-ruim",
};
const QUAL_DOT: Record<string, string> = {
  excelente:"🟢", boa:"🔵", regular:"🟡", ruim:"🔴",
};

function SkeletonCard() {
  return (
    <div style={{ background: "white", border: "1px solid #e7e5e4", borderRadius: 8, overflow: "hidden" }}>
      <div className="skeleton" style={{ height: 165 }} />
      <div style={{ padding: "0.875rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <div className="skeleton" style={{ height: 10, width: "40%" }} />
        <div className="skeleton" style={{ height: 14, width: "80%" }} />
        <div className="skeleton" style={{ height: 12, width: "55%" }} />
      </div>
    </div>
  );
}

function ProductModal({ product, onClose }: { product: Produto; onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="product-sku">{product.sku}</p>
            <h2 className="text-display" style={{ fontSize: "1.3rem", fontWeight: 500 }}>{product.nome_produto}</h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            {/* Imagem */}
            <div>
              {product.image_url ? (
                <img
                  src={product.image_url.includes("cloudinary.com")
                    ? product.image_url.replace("/upload/", "/upload/w_600,q_auto,f_auto/")
                    : product.image_url}
                  alt={product.nome_produto}
                  style={{ width: "100%", borderRadius: 8, border: "1px solid #e7e5e4" }}
                />
              ) : (
                <div style={{ background: "#f5f5f4", borderRadius: 8, height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: "#a8a29e" }}>
                  Sem imagem
                </div>
              )}
            </div>
            {/* Dados */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              {[
                ["Categoria",    product.categoria],
                ["Subcategoria", product.subcategoria],
                ["Cor",         product.cor_dominante],
                ["Ângulo",      product.angulo],
                ["Fundo",       product.fundo],
                ["Material",    product.material_aparente],
              ].map(([label, val]) => val ? (
                <div key={label}>
                  <p style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#78716c", marginBottom: 2 }}>{label}</p>
                  <p style={{ fontSize: "0.875rem", textTransform: "capitalize" }}>{val}</p>
                </div>
              ) : null)}

              {product.qualidade_foto && (
                <div>
                  <p style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#78716c", marginBottom: 4 }}>Qualidade</p>
                  <span className={`badge ${QUAL_BADGE[product.qualidade_foto]}`}>
                    {QUAL_DOT[product.qualidade_foto]} {product.qualidade_foto}
                  </span>
                </div>
              )}

              {product.precisa_revisao && (
                <span className="badge badge-revisao">⚠️ Precisa revisão</span>
              )}
            </div>
          </div>

          {product.tags && product.tags.length > 0 && (
            <div style={{ marginTop: "1.25rem" }}>
              <p style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#78716c", marginBottom: "0.5rem" }}>Tags</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
                {product.tags.map(t => (
                  <span key={t} className="badge badge-cat">{t}</span>
                ))}
              </div>
            </div>
          )}

          {product.descricao_marketing && (
            <div style={{ marginTop: "1.25rem", padding: "1rem", background: "#fafaf9", borderRadius: 8, borderLeft: "3px solid #b45309" }}>
              <p style={{ fontStyle: "italic", fontSize: "0.9rem", color: "#44403c" }}>{product.descricao_marketing}</p>
            </div>
          )}

          {product.descricao_tecnica && (
            <div style={{ marginTop: "0.875rem" }}>
              <p style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#78716c", marginBottom: 4 }}>Descrição Técnica</p>
              <p style={{ fontSize: "0.85rem", color: "#57534e" }}>{product.descricao_tecnica}</p>
            </div>
          )}

          {product.problemas_foto && product.problemas_foto.length > 0 && (
            <div className="alert alert-warning" style={{ marginTop: "1rem" }}>
              <span>⚠️</span>
              <div>
                <strong>Problemas na foto:</strong>
                <ul style={{ marginTop: 4, paddingLeft: "1rem" }}>
                  {product.problemas_foto.map(p => <li key={p} style={{ fontSize: "0.85rem" }}>{p}</li>)}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CatalogoPage() {
  const [produtos,      setProdutos]      = useState<Produto[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState("");
  const [catSel,        setCatSel]        = useState<Categoria[]>([]);
  const [qualSel,       setQualSel]       = useState<Qualidade[]>([]);
  const [revisaoOnly,   setRevisaoOnly]   = useState(false);
  const [selected,      setSelected]      = useState<Produto | null>(null);
  const [showFilters,   setShowFilters]   = useState(false);
  const [viewMode,      setViewMode]      = useState<"grid"|"table">("grid");

  useEffect(() => {
    fetch("/api/produtos")
      .then(r => r.json())
      .then(data => { setProdutos(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Filtragem client-side (rápido, catálogo interno pequeno)
  const filtered = produtos.filter(p => {
    if (search) {
      const s = search.toLowerCase();
      const haystack = [p.sku, p.nome_produto, p.subcategoria, p.cor_dominante, ...(p.tags ?? [])].join(" ").toLowerCase();
      if (!haystack.includes(s)) return false;
    }
    if (catSel.length  && !catSel.includes(p.categoria))       return false;
    if (qualSel.length && p.qualidade_foto && !qualSel.includes(p.qualidade_foto)) return false;
    if (revisaoOnly    && !p.precisa_revisao)                   return false;
    return true;
  });

  // Melhor foto por SKU
  const QUAL_ORDER: Record<string, number> = { excelente:0, boa:1, regular:2, ruim:3 };
  const bySkuMap = new Map<string, Produto>();
  for (const p of filtered) {
    const curr = bySkuMap.get(p.sku);
    if (!curr || (QUAL_ORDER[p.qualidade_foto ?? "ruim"] ?? 9) < (QUAL_ORDER[curr.qualidade_foto ?? "ruim"] ?? 9)) {
      bySkuMap.set(p.sku, p);
    }
  }
  const unique = Array.from(bySkuMap.values());

  const n_revisao = filtered.filter(p => p.precisa_revisao).length;

  function toggleCat(c: Categoria) {
    setCatSel(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  }
  function toggleQual(q: Qualidade) {
    setQualSel(prev => prev.includes(q) ? prev.filter(x => x !== q) : [...prev, q]);
  }
  const clearFilters = () => { setSearch(""); setCatSel([]); setQualSel([]); setRevisaoOnly(false); };
  const hasFilters = search || catSel.length || qualSel.length || revisaoOnly;

  return (
    <AppLayout>
      {/* Topbar */}
      <div className="topbar">
        <h1 className="page-title">Catálogo</h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            className={`btn btn-outline btn-sm ${viewMode === "grid" ? "btn-primary" : ""}`}
            onClick={() => setViewMode("grid")}
            style={viewMode === "grid" ? { background: "#1c1917", color: "white" } : {}}
          >⊞ Grade</button>
          <button
            className={`btn btn-outline btn-sm ${viewMode === "table" ? "btn-primary" : ""}`}
            onClick={() => setViewMode("table")}
            style={viewMode === "table" ? { background: "#1c1917", color: "white" } : {}}
          >☰ Lista</button>
        </div>
      </div>

      <div className="page-content">
        {/* Métricas */}
        <div className="metrics-grid">
          {[
            ["Produtos", unique.length],
            ["Fotos",    filtered.length],
            ["Categorias", new Set(filtered.map(p => p.categoria)).size],
            ["Revisão",  n_revisao],
          ].map(([label, val]) => (
            <div className="metric-card" key={label as string}>
              <div className="metric-label">{label}</div>
              <div className="metric-value">{val}</div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="filters-bar">
          <div className="search-input-wrap">
            <Search size={15} className="search-icon" />
            <input
              className="search-input"
              placeholder="Buscar SKU, nome, cor, tag..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <button className="btn btn-outline btn-sm" onClick={() => setShowFilters(f => !f)}>
            <SlidersHorizontal size={14} /> Filtros {(catSel.length + qualSel.length) > 0 && `(${catSel.length + qualSel.length})`}
            <ChevronDown size={13} style={{ transform: showFilters ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }} />
          </button>

          {revisaoOnly && (
            <span className="badge badge-revisao">⚠️ Só revisão</span>
          )}
          {hasFilters && (
            <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
              <X size={13} /> Limpar filtros
            </button>
          )}
        </div>

        {/* Painel de filtros expandível */}
        {showFilters && (
          <div style={{ background: "white", border: "1px solid #e7e5e4", borderRadius: 8, padding: "1rem 1.25rem", marginBottom: "1.25rem", display: "flex", gap: "2rem", flexWrap: "wrap" }}>
            <div>
              <p style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#78716c", marginBottom: "0.5rem" }}>Categoria</p>
              <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
                {CATEGORIAS.map(c => (
                  <button
                    key={c}
                    onClick={() => toggleCat(c)}
                    className={`badge badge-cat`}
                    style={{ cursor: "pointer", border: catSel.includes(c) ? "1.5px solid #b45309" : "1px solid #e7e5e4", background: catSel.includes(c) ? "#fef3c7" : "#f5f5f4", color: catSel.includes(c) ? "#92400e" : "#44403c", textTransform: "capitalize" }}
                  >{c}</button>
                ))}
              </div>
            </div>
            <div>
              <p style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#78716c", marginBottom: "0.5rem" }}>Qualidade</p>
              <div style={{ display: "flex", gap: "0.375rem" }}>
                {QUALIDADES.map(q => (
                  <button
                    key={q}
                    onClick={() => toggleQual(q)}
                    className={`badge ${QUAL_BADGE[q]}`}
                    style={{ cursor: "pointer", opacity: qualSel.length && !qualSel.includes(q) ? 0.4 : 1, textTransform: "capitalize" }}
                  >{QUAL_DOT[q]} {q}</button>
                ))}
              </div>
            </div>
            <div>
              <p style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#78716c", marginBottom: "0.5rem" }}>Status</p>
              <button
                onClick={() => setRevisaoOnly(r => !r)}
                className="badge badge-revisao"
                style={{ cursor: "pointer", opacity: revisaoOnly ? 1 : 0.5 }}
              >⚠️ Precisam revisão</button>
            </div>
          </div>
        )}

        {/* Grid de produtos */}
        {loading ? (
          <div className="product-grid">
            {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : unique.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem", color: "#78716c" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🔍</div>
            <p style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem" }}>Nenhum produto encontrado</p>
            <p style={{ fontSize: "0.875rem", marginTop: "0.5rem" }}>Tente outros termos ou limpe os filtros</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="product-grid">
            {unique.map(p => {
              const imgSrc = p.image_url
                ? p.image_url.includes("cloudinary.com")
                  ? p.image_url.replace("/upload/", "/upload/w_400,q_auto,f_auto/")
                  : p.image_url
                : null;
              return (
                <div key={p.id} className="product-card" onClick={() => setSelected(p)}>
                  {imgSrc
                    ? <img src={imgSrc} alt={p.nome_produto} className="product-img" loading="lazy" />
                    : <div className="product-img-placeholder">📷 Sem imagem</div>
                  }
                  <div className="product-info">
                    <div className="product-sku">{p.sku}</div>
                    <div className="product-name">{p.nome_produto}</div>
                    <div className="product-meta">
                      <span className="badge badge-cat" style={{ textTransform: "capitalize" }}>{p.categoria}</span>
                      {p.qualidade_foto && (
                        <span className={`badge ${QUAL_BADGE[p.qualidade_foto]}`}>
                          {QUAL_DOT[p.qualidade_foto]} {p.qualidade_foto}
                        </span>
                      )}
                      {p.precisa_revisao && <span className="badge badge-revisao">⚠️</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ background: "white", border: "1px solid #e7e5e4", borderRadius: 8, overflow: "hidden" }}>
            <table className="data-table">
              <thead>
                <tr>
                  {["SKU","Nome","Categoria","Cor","Qualidade","Revisão"].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {unique.map(p => (
                  <tr key={p.id} onClick={() => setSelected(p)} style={{ cursor: "pointer" }}>
                    <td><code style={{ fontSize: "0.8rem" }}>{p.sku}</code></td>
                    <td style={{ fontWeight: 500 }}>{p.nome_produto}</td>
                    <td style={{ textTransform: "capitalize" }}>{p.categoria}</td>
                    <td>{p.cor_dominante ?? "—"}</td>
                    <td>{p.qualidade_foto ? <span className={`badge ${QUAL_BADGE[p.qualidade_foto]}`}>{p.qualidade_foto}</span> : "—"}</td>
                    <td>{p.precisa_revisao ? "⚠️ Sim" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && <ProductModal product={selected} onClose={() => setSelected(null)} />}
    </AppLayout>
  );
}
