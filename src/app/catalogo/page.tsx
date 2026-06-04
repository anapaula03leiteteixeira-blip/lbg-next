"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import type { Produto, Categoria, Qualidade } from "@/types";
import { Search, SlidersHorizontal, X, ChevronDown, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";

const CATEGORIAS: Categoria[] = ["cuba","sanitario","flexivel","rejunte","acessorio","outro"];
const QUALIDADES: Qualidade[] = ["excelente","boa","regular","ruim"];

const QUAL_BADGE: Record<string, string> = {
  excelente: "badge-excelente", boa: "badge-boa",
  regular:   "badge-regular",   ruim: "badge-ruim",
};
const QUAL_DOT: Record<string, string> = {
  excelente: "🟢", boa: "🔵", regular: "🟡", ruim: "🔴",
};

function imgUrl(url: string | undefined, w = 600) {
  if (!url) return null;
  if (url.includes("cloudinary.com")) return url.replace("/upload/", `/upload/w_${w},q_auto,f_auto/`);
  return url;
}

function SkeletonCard() {
  return (
    <div style={{ background:"white", border:"1px solid #e7e5e4", borderRadius:8, overflow:"hidden" }}>
      <div className="skeleton" style={{ height:165 }} />
      <div style={{ padding:"0.875rem", display:"flex", flexDirection:"column", gap:"0.5rem" }}>
        <div className="skeleton" style={{ height:10, width:"40%" }} />
        <div className="skeleton" style={{ height:14, width:"80%" }} />
        <div className="skeleton" style={{ height:12, width:"55%" }} />
      </div>
    </div>
  );
}

// ─── Modal com galeria multi-foto ────────────────────────────────────────────

function ProductModal({
  allPhotos,
  onClose,
  onRevisar,
}: {
  allPhotos: Produto[];
  onClose:   () => void;
  onRevisar: (foto: Produto) => void;
}) {
  const [idx, setIdx] = useState(0);

  // Ordenar: melhores fotos primeiro, depois por ângulo
  const QUAL_ORDER: Record<string, number> = { excelente:0, boa:1, regular:2, ruim:3 };
  const sorted = [...allPhotos].sort((a, b) =>
    (QUAL_ORDER[a.qualidade_foto ?? "ruim"] ?? 9) - (QUAL_ORDER[b.qualidade_foto ?? "ruim"] ?? 9)
  );

  const active = sorted[idx] ?? sorted[0];
  const total  = sorted.length;

  const prev = useCallback(() => setIdx(i => Math.max(0, i - 1)), []);
  const next = useCallback(() => setIdx(i => Math.min(total - 1, i + 1)), [total]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft")  prev();
      if (e.key === "ArrowRight") next();
      if (e.key === "Escape")     onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [prev, next, onClose]);

  if (!active) return null;

  // Dados do produto (produto-nível, da melhor foto)
  const rep = sorted[0];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 860, width: "95vw" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div>
            <p className="product-sku">{rep.sku}</p>
            <h2 className="text-display" style={{ fontSize:"1.2rem", fontWeight:500 }}>{rep.nome_produto}</h2>
          </div>
          <div style={{ display:"flex", gap:"0.5rem", alignItems:"center" }}>
            {active.precisa_revisao && (
              <button
                onClick={() => onRevisar(active)}
                className="btn btn-sm"
                style={{ background:"#fef3c7", color:"#92400e", border:"1px solid #fcd34d", fontWeight:600 }}
              >
                <AlertTriangle size={13} /> Revisar esta foto
              </button>
            )}
            <button onClick={onClose} className="btn btn-ghost btn-sm"><X size={18} /></button>
          </div>
        </div>

        <div className="modal-body" style={{ padding: "1rem 1.5rem 1.5rem" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1.5rem" }}>

            {/* Coluna esquerda — foto principal + thumbnails */}
            <div>
              {/* Foto principal com navegação */}
              <div style={{ position:"relative", borderRadius:8, overflow:"hidden", background:"#f5f5f4", border:"1px solid #e7e5e4" }}>
                {imgUrl(active.image_url) ? (
                  <img
                    src={imgUrl(active.image_url, 600)!}
                    alt={active.nome_produto}
                    style={{ width:"100%", display:"block", maxHeight:320, objectFit:"contain" }}
                  />
                ) : (
                  <div style={{ height:280, display:"flex", alignItems:"center", justifyContent:"center", color:"#a8a29e" }}>
                    📷 Sem imagem
                  </div>
                )}

                {/* Overlay prev/next */}
                {total > 1 && (
                  <>
                    <button
                      onClick={prev} disabled={idx === 0}
                      style={{ position:"absolute", left:8, top:"50%", transform:"translateY(-50%)", background:"rgba(255,255,255,0.9)", border:"1px solid #e7e5e4", borderRadius:6, padding:"6px", cursor:"pointer", opacity: idx === 0 ? 0.3 : 1 }}
                    ><ChevronLeft size={18} /></button>
                    <button
                      onClick={next} disabled={idx === total - 1}
                      style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", background:"rgba(255,255,255,0.9)", border:"1px solid #e7e5e4", borderRadius:6, padding:"6px", cursor:"pointer", opacity: idx === total - 1 ? 0.3 : 1 }}
                    ><ChevronRight size={18} /></button>
                    <div style={{ position:"absolute", bottom:8, right:10, background:"rgba(0,0,0,0.55)", color:"white", fontSize:"0.72rem", borderRadius:4, padding:"2px 8px" }}>
                      {idx + 1} / {total}
                    </div>
                  </>
                )}
              </div>

              {/* Thumbnails strip */}
              {total > 1 && (
                <div style={{ display:"flex", gap:"0.5rem", marginTop:"0.625rem", overflowX:"auto", paddingBottom:4 }}>
                  {sorted.map((foto, i) => (
                    <button
                      key={foto.id}
                      onClick={() => setIdx(i)}
                      title={foto.angulo ?? ""}
                      style={{
                        flexShrink: 0,
                        width: 60, height: 60,
                        borderRadius: 6,
                        overflow: "hidden",
                        border: i === idx ? "2px solid #b45309" : "2px solid transparent",
                        cursor: "pointer",
                        padding: 0,
                        background: "#f5f5f4",
                        position: "relative",
                      }}
                    >
                      {imgUrl(foto.image_url, 120)
                        ? <img src={imgUrl(foto.image_url, 120)!} alt={foto.angulo ?? ""} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                        : <span style={{ fontSize:"1.25rem", display:"flex", alignItems:"center", justifyContent:"center", height:"100%" }}>📷</span>
                      }
                      {foto.precisa_revisao && (
                        <span style={{ position:"absolute", top:2, right:2, fontSize:"0.6rem" }}>⚠️</span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Info desta foto específica */}
              <div style={{ marginTop:"0.75rem", display:"flex", flexWrap:"wrap", gap:"0.375rem", alignItems:"center" }}>
                {active.angulo && <span className="badge badge-cat" style={{ textTransform:"capitalize" }}>📐 {active.angulo}</span>}
                {active.fundo  && <span className="badge badge-cat" style={{ textTransform:"capitalize" }}>🎨 {active.fundo}</span>}
                {active.qualidade_foto && (
                  <span className={`badge ${QUAL_BADGE[active.qualidade_foto]}`}>
                    {QUAL_DOT[active.qualidade_foto]} {active.qualidade_foto}
                  </span>
                )}
                {active.precisa_revisao && <span className="badge badge-revisao">⚠️ Revisão pendente</span>}
              </div>

              {active.problemas_foto && active.problemas_foto.length > 0 && (
                <div className="alert alert-warning" style={{ marginTop:"0.75rem" }}>
                  <AlertTriangle size={14} />
                  <div>
                    <strong>Problemas:</strong>{" "}
                    {active.problemas_foto.join(", ")}
                  </div>
                </div>
              )}
            </div>

            {/* Coluna direita — dados do produto */}
            <div style={{ display:"flex", flexDirection:"column", gap:"0.875rem" }}>
              {[
                ["Categoria",   rep.categoria],
                ["Subcategoria",rep.subcategoria],
                ["Cor",         rep.cor_dominante],
                ["Material",    rep.material_aparente],
              ].map(([label, val]) => val ? (
                <div key={label}>
                  <p style={{ fontSize:"0.65rem", textTransform:"uppercase", letterSpacing:"0.1em", color:"#78716c", marginBottom:2 }}>{label}</p>
                  <p style={{ fontSize:"0.875rem", textTransform:"capitalize" }}>{val}</p>
                </div>
              ) : null)}

              {rep.tags && rep.tags.length > 0 && (
                <div>
                  <p style={{ fontSize:"0.65rem", textTransform:"uppercase", letterSpacing:"0.1em", color:"#78716c", marginBottom:"0.4rem" }}>Tags</p>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:"0.3rem" }}>
                    {rep.tags.map(t => <span key={t} className="badge badge-cat">{t}</span>)}
                  </div>
                </div>
              )}

              {rep.descricao_marketing && (
                <div style={{ padding:"0.875rem 1rem", background:"#fafaf9", borderRadius:8, borderLeft:"3px solid #b45309" }}>
                  <p style={{ fontStyle:"italic", fontSize:"0.875rem", color:"#44403c", lineHeight:1.6 }}>{rep.descricao_marketing}</p>
                </div>
              )}

              {rep.descricao_tecnica && (
                <div>
                  <p style={{ fontSize:"0.65rem", textTransform:"uppercase", letterSpacing:"0.1em", color:"#78716c", marginBottom:4 }}>Descrição Técnica</p>
                  <p style={{ fontSize:"0.85rem", color:"#57534e", lineHeight:1.6 }}>{rep.descricao_tecnica}</p>
                </div>
              )}

              <div style={{ marginTop:"auto", paddingTop:"0.5rem", borderTop:"1px solid #f5f5f4", fontSize:"0.72rem", color:"#a8a29e" }}>
                {total} foto{total !== 1 ? "s" : ""} · Use ← → ou clique nos thumbnails
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function CatalogoPage() {
  const router = useRouter();
  const [produtos,    setProdutos]    = useState<Produto[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [catSel,      setCatSel]      = useState<Categoria[]>([]);
  const [qualSel,     setQualSel]     = useState<Qualidade[]>([]);
  const [revisaoOnly, setRevisaoOnly] = useState(false);
  const [selectedSku, setSelectedSku] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode,    setViewMode]    = useState<"grid"|"table">("grid");

  useEffect(() => {
    fetch("/api/produtos")
      .then(r => r.json())
      .then(data => { setProdutos(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = produtos.filter(p => {
    if (search) {
      const s = search.toLowerCase();
      const hay = [p.sku, p.nome_produto, p.subcategoria, p.cor_dominante, ...(p.tags ?? [])].join(" ").toLowerCase();
      if (!hay.includes(s)) return false;
    }
    if (catSel.length  && !catSel.includes(p.categoria))       return false;
    if (qualSel.length && p.qualidade_foto && !qualSel.includes(p.qualidade_foto)) return false;
    if (revisaoOnly    && !p.precisa_revisao)                   return false;
    return true;
  });

  // Melhor foto por SKU para o card
  const QUAL_ORDER: Record<string, number> = { excelente:0, boa:1, regular:2, ruim:3 };
  const bySkuMap = new Map<string, Produto>();
  for (const p of filtered) {
    const curr = bySkuMap.get(p.sku);
    if (!curr || (QUAL_ORDER[p.qualidade_foto ?? "ruim"] ?? 9) < (QUAL_ORDER[curr.qualidade_foto ?? "ruim"] ?? 9)) {
      bySkuMap.set(p.sku, p);
    }
  }
  const unique = Array.from(bySkuMap.values());

  // Todas as fotos do SKU selecionado (busca em TODOS os produtos, não só filtrados)
  const modalPhotos = selectedSku
    ? produtos.filter(p => p.sku === selectedSku)
    : [];

  const n_revisao = produtos.filter(p => p.precisa_revisao).length;

  function toggleCat(c: Categoria)  { setCatSel(prev  => prev.includes(c)  ? prev.filter(x => x !== c)  : [...prev, c]);  }
  function toggleQual(q: Qualidade) { setQualSel(prev  => prev.includes(q)  ? prev.filter(x => x !== q)  : [...prev, q]);  }
  const clearFilters = () => { setSearch(""); setCatSel([]); setQualSel([]); setRevisaoOnly(false); };
  const hasFilters = search || catSel.length || qualSel.length || revisaoOnly;

  return (
    <AppLayout>
      <div className="topbar">
        <h1 className="page-title">Catálogo</h1>
        <div style={{ display:"flex", gap:"0.5rem" }}>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setViewMode("grid")}
            style={viewMode === "grid" ? { background:"#1c1917", color:"white" } : {}}
          >⊞ Grade</button>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setViewMode("table")}
            style={viewMode === "table" ? { background:"#1c1917", color:"white" } : {}}
          >☰ Lista</button>
        </div>
      </div>

      <div className="page-content">
        {/* Métricas */}
        <div className="metrics-grid">
          {[
            ["Produtos",   unique.length],
            ["Fotos",      filtered.length],
            ["Categorias", new Set(filtered.map(p => p.categoria)).size],
            ["Revisão",    n_revisao],
          ].map(([label, val]) => (
            <div
              key={label as string}
              className="metric-card"
              style={(label === "Revisão" && (val as number) > 0) ? { borderLeft:"3px solid #f59e0b", cursor:"pointer" } : {}}
              onClick={() => label === "Revisão" && (val as number) > 0 && router.push("/revisar")}
            >
              <div className="metric-label">{label}</div>
              <div className="metric-value" style={label === "Revisão" && (val as number) > 0 ? { color:"#b45309" } : {}}>
                {val}
              </div>
              {label === "Revisão" && (val as number) > 0 && (
                <div style={{ fontSize:"0.65rem", color:"#b45309", marginTop:2 }}>Clique para revisar →</div>
              )}
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
            <SlidersHorizontal size={14} /> Filtros
            {(catSel.length + qualSel.length) > 0 && ` (${catSel.length + qualSel.length})`}
            <ChevronDown size={13} style={{ transform: showFilters ? "rotate(180deg)" : undefined, transition:"transform 0.2s" }} />
          </button>
          {hasFilters && (
            <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
              <X size={13} /> Limpar
            </button>
          )}
        </div>

        {showFilters && (
          <div style={{ background:"white", border:"1px solid #e7e5e4", borderRadius:8, padding:"1rem 1.25rem", marginBottom:"1.25rem", display:"flex", gap:"2rem", flexWrap:"wrap" }}>
            <div>
              <p style={{ fontSize:"0.65rem", textTransform:"uppercase", letterSpacing:"0.1em", color:"#78716c", marginBottom:"0.5rem" }}>Categoria</p>
              <div style={{ display:"flex", gap:"0.375rem", flexWrap:"wrap" }}>
                {CATEGORIAS.map(c => (
                  <button key={c} onClick={() => toggleCat(c)} className="badge badge-cat"
                    style={{ cursor:"pointer", border: catSel.includes(c) ? "1.5px solid #b45309" : "1px solid #e7e5e4", background: catSel.includes(c) ? "#fef3c7" : "#f5f5f4", color: catSel.includes(c) ? "#92400e" : "#44403c", textTransform:"capitalize" }}
                  >{c}</button>
                ))}
              </div>
            </div>
            <div>
              <p style={{ fontSize:"0.65rem", textTransform:"uppercase", letterSpacing:"0.1em", color:"#78716c", marginBottom:"0.5rem" }}>Qualidade</p>
              <div style={{ display:"flex", gap:"0.375rem" }}>
                {QUALIDADES.map(q => (
                  <button key={q} onClick={() => toggleQual(q)} className={`badge ${QUAL_BADGE[q]}`}
                    style={{ cursor:"pointer", opacity: qualSel.length && !qualSel.includes(q) ? 0.4 : 1, textTransform:"capitalize" }}
                  >{QUAL_DOT[q]} {q}</button>
                ))}
              </div>
            </div>
            <div>
              <p style={{ fontSize:"0.65rem", textTransform:"uppercase", letterSpacing:"0.1em", color:"#78716c", marginBottom:"0.5rem" }}>Status</p>
              <button onClick={() => setRevisaoOnly(r => !r)} className="badge badge-revisao"
                style={{ cursor:"pointer", opacity: revisaoOnly ? 1 : 0.5 }}
              >⚠️ Precisam revisão</button>
            </div>
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="product-grid">
            {Array.from({ length:12 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : unique.length === 0 ? (
          <div style={{ textAlign:"center", padding:"4rem", color:"#78716c" }}>
            <div style={{ fontSize:"2rem", marginBottom:"0.75rem" }}>🔍</div>
            <p style={{ fontFamily:"var(--font-display)", fontSize:"1.2rem" }}>Nenhum produto encontrado</p>
            <p style={{ fontSize:"0.875rem", marginTop:"0.5rem" }}>Tente outros termos ou limpe os filtros</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="product-grid">
            {unique.map(p => {
              const src = imgUrl(p.image_url, 400);
              const nFotos = produtos.filter(x => x.sku === p.sku).length;
              const temRevisao = produtos.some(x => x.sku === p.sku && x.precisa_revisao);
              return (
                <div
                  key={p.id}
                  className="product-card"
                  style={temRevisao ? { borderColor:"#fcd34d" } : {}}
                  onClick={() => setSelectedSku(p.sku)}
                >
                  {src
                    ? <img src={src} alt={p.nome_produto} className="product-img" loading="lazy" />
                    : <div className="product-img-placeholder">📷 Sem imagem</div>
                  }
                  <div className="product-info">
                    <div className="product-sku" style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span>{p.sku}</span>
                      {nFotos > 1 && <span style={{ fontSize:"0.65rem", color:"#78716c", background:"#f5f5f4", borderRadius:4, padding:"1px 5px" }}>{nFotos} fotos</span>}
                    </div>
                    <div className="product-name">{p.nome_produto}</div>
                    <div className="product-meta">
                      <span className="badge badge-cat" style={{ textTransform:"capitalize" }}>{p.categoria}</span>
                      {p.qualidade_foto && <span className={`badge ${QUAL_BADGE[p.qualidade_foto]}`}>{QUAL_DOT[p.qualidade_foto]} {p.qualidade_foto}</span>}
                      {temRevisao && <span className="badge badge-revisao">⚠️</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ background:"white", border:"1px solid #e7e5e4", borderRadius:8, overflow:"hidden" }}>
            <table className="data-table">
              <thead>
                <tr>{["SKU","Nome","Categoria","Cor","Qualidade","Fotos","Revisão"].map(h => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {unique.map(p => {
                  const nFotos = produtos.filter(x => x.sku === p.sku).length;
                  const temRevisao = produtos.some(x => x.sku === p.sku && x.precisa_revisao);
                  return (
                    <tr key={p.id} onClick={() => setSelectedSku(p.sku)} style={{ cursor:"pointer" }}>
                      <td><code style={{ fontSize:"0.8rem" }}>{p.sku}</code></td>
                      <td style={{ fontWeight:500 }}>{p.nome_produto}</td>
                      <td style={{ textTransform:"capitalize" }}>{p.categoria}</td>
                      <td>{p.cor_dominante ?? "—"}</td>
                      <td>{p.qualidade_foto ? <span className={`badge ${QUAL_BADGE[p.qualidade_foto]}`}>{p.qualidade_foto}</span> : "—"}</td>
                      <td style={{ textAlign:"center" }}>{nFotos}</td>
                      <td>{temRevisao ? "⚠️ Sim" : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedSku && modalPhotos.length > 0 && (
        <ProductModal
          allPhotos={modalPhotos}
          onClose={() => setSelectedSku(null)}
          onRevisar={(foto) => {
            setSelectedSku(null);
            router.push(`/revisar?id=${foto.id}`);
          }}
        />
      )}
    </AppLayout>
  );
}
