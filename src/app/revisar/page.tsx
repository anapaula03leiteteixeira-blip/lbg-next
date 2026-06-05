"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import type { Produto, Categoria, Qualidade, Angulo, Fundo, Material } from "@/types";
import { Check, X, RefreshCw, Search, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";

const CATEGORIAS: Categoria[] = ["cuba","sanitario","pastilha","flexivel","rejunte","acessorio","outro"];
const QUALIDADES: Qualidade[] = ["excelente","boa","regular","ruim"];
const ANGULOS:    Angulo[]    = ["frontal","lateral","superior","perspectiva","detalhe","conjunto","embalagem"];
const FUNDOS:     Fundo[]     = ["branco","colorido","ambiente","transparente","outro"];
const MATERIAIS:  Material[]  = ["louca","aco_inox","plastico","ceramica","metal","borracha","outro"];

function imgUrl(url: string | undefined) {
  if (!url) return null;
  if (url.includes("cloudinary.com")) return url.replace("/upload/", "/upload/w_500,q_auto,f_auto/");
  return url;
}

// ─── Modal: Atribuir foto a produto existente ────────────────────────────────

function AtribuirModal({
  foto,
  todos,
  onClose,
  onSaved,
}: {
  foto:    Produto;
  todos:   Produto[];
  onClose: () => void;
  onSaved: (updated: Produto) => void;
}) {
  const [search,  setSearch]  = useState("");
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  // SKUs únicos excluindo o próprio
  const skuMap = new Map<string, Produto>();
  for (const p of todos) {
    if (p.sku !== foto.sku && !skuMap.has(p.sku)) skuMap.set(p.sku, p);
  }
  const options = Array.from(skuMap.values()).filter(p =>
    !search || p.sku.toLowerCase().includes(search.toLowerCase()) || p.nome_produto.toLowerCase().includes(search.toLowerCase())
  );

  async function atribuir(destino: Produto) {
    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/produtos/${foto.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          sku:          destino.sku,
          nome_produto: destino.nome_produto,
          categoria:    destino.categoria,
          precisa_revisao: false,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      onSaved(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth:520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="text-display" style={{ fontSize:"1rem" }}>Atribuir a produto existente</h2>
            <p style={{ fontSize:"0.8rem", color:"#78716c", marginTop:2 }}>Esta foto será associada ao SKU selecionado</p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm"><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div className="search-input-wrap" style={{ marginBottom:"0.875rem" }}>
            <Search size={14} className="search-icon" />
            <input className="search-input" placeholder="Buscar SKU ou nome..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {error && <div className="alert alert-warning" style={{ marginBottom:"0.75rem" }}><AlertTriangle size={14} />{error}</div>}
          <div style={{ maxHeight:320, overflowY:"auto", display:"flex", flexDirection:"column", gap:"0.375rem" }}>
            {options.slice(0, 30).map(p => (
              <button
                key={p.sku}
                disabled={saving}
                onClick={() => atribuir(p)}
                style={{ display:"flex", alignItems:"center", gap:"0.75rem", padding:"0.625rem 0.875rem", border:"1px solid #e7e5e4", borderRadius:8, background:"white", cursor:"pointer", textAlign:"left" }}
              >
                {imgUrl(p.image_url) && (
                  <img src={imgUrl(p.image_url)!} alt={p.nome_produto} style={{ width:40, height:40, objectFit:"cover", borderRadius:4, flexShrink:0 }} />
                )}
                <div>
                  <code style={{ fontSize:"0.78rem", color:"#b45309" }}>{p.sku}</code>
                  <p style={{ fontSize:"0.85rem", margin:0 }}>{p.nome_produto}</p>
                  <p style={{ fontSize:"0.7rem", color:"#78716c", margin:0, textTransform:"capitalize" }}>{p.categoria}</p>
                </div>
              </button>
            ))}
            {options.length === 0 && (
              <p style={{ textAlign:"center", color:"#78716c", padding:"1.5rem 0", fontSize:"0.875rem" }}>Nenhum produto encontrado</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: Reclassificar foto ───────────────────────────────────────────────

function ReclassificarModal({
  foto,
  onClose,
  onSaved,
}: {
  foto:    Produto;
  onClose: () => void;
  onSaved: (updated: Produto) => void;
}) {
  const [form,   setForm]   = useState<Partial<Produto>>({ ...foto });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const upd = (k: keyof Produto, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  async function save() {
    if (!form.sku?.trim() || !form.nome_produto?.trim()) { setError("SKU e Nome são obrigatórios"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/produtos/${foto.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ...form, precisa_revisao: false }),
      });
      if (!res.ok) throw new Error(await res.text());
      onSaved(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
      setSaving(false);
    }
  }

  const sel = (label: string, key: keyof Produto, options: string[]) => (
    <div>
      <p style={{ fontSize:"0.65rem", textTransform:"uppercase", letterSpacing:"0.1em", color:"#78716c", marginBottom:4 }}>{label}</p>
      <select
        value={(form[key] as string) ?? ""}
        onChange={e => upd(key, e.target.value)}
        style={{ width:"100%", padding:"0.5rem 0.625rem", border:"1px solid #e7e5e4", borderRadius:6, fontSize:"0.875rem", background:"white" }}
      >
        {options.map(o => <option key={o} value={o} style={{ textTransform:"capitalize" }}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth:680 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="text-display" style={{ fontSize:"1rem" }}>Reclassificar foto</h2>
            <p style={{ fontSize:"0.8rem", color:"#78716c", marginTop:2 }}>Edite os campos e salve — a foto sairá da fila de revisão</p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm"><X size={16} /></button>
        </div>
        <div className="modal-body">
          {error && <div className="alert alert-warning" style={{ marginBottom:"1rem" }}><AlertTriangle size={14} />{error}</div>}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.875rem" }}>
            <div>
              <p style={{ fontSize:"0.65rem", textTransform:"uppercase", letterSpacing:"0.1em", color:"#78716c", marginBottom:4 }}>SKU *</p>
              <input className="search-input" style={{ width:"100%", border:"1px solid #e7e5e4", borderRadius:6, padding:"0.5rem 0.625rem" }}
                value={form.sku ?? ""} onChange={e => upd("sku", e.target.value)} />
            </div>
            <div style={{ gridColumn:"span 1" }}>
              <p style={{ fontSize:"0.65rem", textTransform:"uppercase", letterSpacing:"0.1em", color:"#78716c", marginBottom:4 }}>Nome do produto *</p>
              <input className="search-input" style={{ width:"100%", border:"1px solid #e7e5e4", borderRadius:6, padding:"0.5rem 0.625rem" }}
                value={form.nome_produto ?? ""} onChange={e => upd("nome_produto", e.target.value)} />
            </div>
            {sel("Categoria", "categoria", CATEGORIAS)}
            {sel("Ângulo",    "angulo",    ANGULOS)}
            {sel("Qualidade", "qualidade_foto", QUALIDADES)}
            {sel("Fundo",     "fundo",     FUNDOS)}
            {sel("Material",  "material_aparente", MATERIAIS)}
            <div>
              <p style={{ fontSize:"0.65rem", textTransform:"uppercase", letterSpacing:"0.1em", color:"#78716c", marginBottom:4 }}>Subcategoria</p>
              <input className="search-input" style={{ width:"100%", border:"1px solid #e7e5e4", borderRadius:6, padding:"0.5rem 0.625rem" }}
                value={form.subcategoria ?? ""} onChange={e => upd("subcategoria", e.target.value)} />
            </div>
          </div>
          <div style={{ marginTop:"0.875rem" }}>
            <p style={{ fontSize:"0.65rem", textTransform:"uppercase", letterSpacing:"0.1em", color:"#78716c", marginBottom:4 }}>Tags (separadas por vírgula)</p>
            <input className="search-input" style={{ width:"100%", border:"1px solid #e7e5e4", borderRadius:6, padding:"0.5rem 0.625rem" }}
              value={Array.isArray(form.tags) ? form.tags.join(", ") : ""}
              onChange={e => upd("tags", e.target.value.split(",").map(t => t.trim()).filter(Boolean))} />
          </div>
          <div style={{ marginTop:"1rem", display:"flex", gap:"0.625rem", justifyContent:"flex-end" }}>
            <button onClick={onClose} className="btn btn-outline btn-sm">Cancelar</button>
            <button onClick={save} disabled={saving} className="btn btn-sm" style={{ background:"#1c1917", color:"white" }}>
              {saving ? "Salvando..." : <><Check size={14} /> Salvar e aprovar</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Card de foto para revisão ───────────────────────────────────────────────

function FotoCard({
  foto,
  todos,
  idx,
  total,
  onPrev,
  onNext,
  onUpdated,
  onDeleted,
}: {
  foto:      Produto;
  todos:     Produto[];
  idx:       number;
  total:     number;
  onPrev:    () => void;
  onNext:    () => void;
  onUpdated: (p: Produto) => void;
  onDeleted: (id: number) => void;
}) {
  const [modal,   setModal]   = useState<"atribuir"|"reclassificar"|null>(null);
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error,   setError]   = useState("");

  async function aprovar() {
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/produtos/${foto.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ precisa_revisao: false }),
      });
      if (!res.ok) throw new Error(await res.text());
      onUpdated(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
      setLoading(false);
    }
  }

  async function excluir() {
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/produtos/${foto.id}`, { method:"DELETE" });
      if (!res.ok) throw new Error(await res.text());
      onDeleted(foto.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
      setLoading(false);
    }
  }

  const src = imgUrl(foto.image_url);

  return (
    <>
      <div style={{ background:"white", border:"2px solid #fcd34d", borderRadius:12, overflow:"hidden", display:"flex", flexDirection:"column" }}>
        {/* Foto */}
        <div style={{ position:"relative", background:"#f5f5f4", height:220 }}>
          {src
            ? <img src={src} alt={foto.nome_produto} style={{ width:"100%", height:"100%", objectFit:"contain" }} />
            : <div style={{ height:"100%", display:"flex", alignItems:"center", justifyContent:"center", color:"#a8a29e" }}>📷 Sem imagem</div>
          }
          <div style={{ position:"absolute", top:8, right:8, background:"#fef3c7", border:"1px solid #fcd34d", borderRadius:6, padding:"2px 8px", fontSize:"0.7rem", fontWeight:600, color:"#92400e" }}>
            ⚠️ Revisão
          </div>
          {/* Navegação */}
          <div style={{ position:"absolute", bottom:8, left:"50%", transform:"translateX(-50%)", display:"flex", gap:"0.375rem", alignItems:"center" }}>
            <button onClick={onPrev} disabled={idx === 0} style={{ background:"rgba(255,255,255,0.9)", border:"1px solid #e7e5e4", borderRadius:6, padding:"4px 8px", cursor:"pointer", opacity: idx === 0 ? 0.3 : 1 }}>
              <ChevronLeft size={14} />
            </button>
            <span style={{ background:"rgba(0,0,0,0.5)", color:"white", fontSize:"0.7rem", borderRadius:4, padding:"2px 8px" }}>{idx+1}/{total}</span>
            <button onClick={onNext} disabled={idx === total - 1} style={{ background:"rgba(255,255,255,0.9)", border:"1px solid #e7e5e4", borderRadius:6, padding:"4px 8px", cursor:"pointer", opacity: idx === total - 1 ? 0.3 : 1 }}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Info */}
        <div style={{ padding:"0.875rem", flex:1, display:"flex", flexDirection:"column", gap:"0.375rem" }}>
          <code style={{ fontSize:"0.75rem", color:"#b45309" }}>{foto.sku || "SEM SKU"}</code>
          <p style={{ fontWeight:500, fontSize:"0.9rem", margin:0 }}>{foto.nome_produto}</p>
          <div style={{ display:"flex", gap:"0.375rem", flexWrap:"wrap", marginTop:2 }}>
            {foto.categoria && <span style={{ fontSize:"0.7rem", background:"#f5f5f4", borderRadius:4, padding:"1px 6px", textTransform:"capitalize" }}>{foto.categoria}</span>}
            {foto.angulo    && <span style={{ fontSize:"0.7rem", background:"#f5f5f4", borderRadius:4, padding:"1px 6px", textTransform:"capitalize" }}>📐 {foto.angulo}</span>}
            {foto.qualidade_foto && <span style={{ fontSize:"0.7rem", background:"#f5f5f4", borderRadius:4, padding:"1px 6px" }}>
              {foto.qualidade_foto === "excelente" ? "🟢" : foto.qualidade_foto === "boa" ? "🔵" : foto.qualidade_foto === "regular" ? "🟡" : "🔴"} {foto.qualidade_foto}
            </span>}
          </div>
          {foto.arquivo_original && (
            <p style={{ fontSize:"0.65rem", color:"#a8a29e", margin:0, wordBreak:"break-all" }}>{foto.arquivo_original}</p>
          )}
          {error && <p style={{ fontSize:"0.75rem", color:"#dc2626", margin:0 }}>{error}</p>}
        </div>

        {/* Ações */}
        <div style={{ padding:"0.75rem", borderTop:"1px solid #f5f5f4", display:"flex", gap:"0.375rem", flexWrap:"wrap" }}>
          <button
            onClick={() => setModal("atribuir")}
            disabled={loading}
            className="btn btn-outline btn-sm"
            style={{ flex:1, justifyContent:"center", fontSize:"0.78rem" }}
            title="Vincular esta foto a um produto existente"
          >
            🔗 Atribuir
          </button>
          <button
            onClick={() => setModal("reclassificar")}
            disabled={loading}
            className="btn btn-outline btn-sm"
            style={{ flex:1, justifyContent:"center", fontSize:"0.78rem" }}
            title="Editar todos os campos desta foto"
          >
            <RefreshCw size={12} /> Reclassificar
          </button>
          <button
            onClick={aprovar}
            disabled={loading}
            className="btn btn-sm"
            style={{ flex:1, justifyContent:"center", background:"#dcfce7", color:"#166534", border:"1px solid #86efac", fontSize:"0.78rem" }}
            title="Marcar como revisada (mantém os dados)"
          >
            <Check size={12} /> Aprovar
          </button>
          {!confirm ? (
            <button
              onClick={() => setConfirm(true)}
              disabled={loading}
              className="btn btn-sm"
              style={{ background:"#fee2e2", color:"#991b1b", border:"1px solid #fca5a5", fontSize:"0.78rem" }}
              title="Excluir esta foto permanentemente"
            >
              <X size={12} />
            </button>
          ) : (
            <button
              onClick={excluir}
              disabled={loading}
              className="btn btn-sm"
              style={{ background:"#dc2626", color:"white", fontSize:"0.78rem" }}
            >
              Confirmar exclusão
            </button>
          )}
        </div>
      </div>

      {modal === "atribuir" && (
        <AtribuirModal
          foto={foto} todos={todos}
          onClose={() => setModal(null)}
          onSaved={p => { onUpdated(p); setModal(null); }}
        />
      )}
      {modal === "reclassificar" && (
        <ReclassificarModal
          foto={foto}
          onClose={() => setModal(null)}
          onSaved={p => { onUpdated(p); setModal(null); }}
        />
      )}
    </>
  );
}

// ─── Página principal de revisão ─────────────────────────────────────────────

function RevisarContent() {
  const searchParams = useSearchParams();
  const highlightId  = searchParams.get("id");

  const [todos,      setTodos]      = useState<Produto[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [navIdx,     setNavIdx]     = useState(0);

  useEffect(() => {
    fetch("/api/produtos").then(r => r.json()).then(data => {
      setTodos(data);
      setLoading(false);
      // Se veio de um link direto, posiciona no item correto
      if (highlightId) {
        const revisao = (data as Produto[]).filter(p => p.precisa_revisao);
        const i = revisao.findIndex(p => String(p.id) === highlightId);
        if (i >= 0) setNavIdx(i);
      }
    }).catch(() => setLoading(false));
  }, [highlightId]);

  const revisao = todos.filter(p => p.precisa_revisao);

  function handleUpdated(updated: Produto) {
    setTodos(prev => prev.map(p => p.id === updated.id ? updated : p));
    // Avança para próximo se ainda houver itens
    setNavIdx(i => Math.min(i, revisao.filter(p => p.id !== updated.id).length - 1));
  }

  function handleDeleted(id: number) {
    setTodos(prev => prev.filter(p => p.id !== id));
    setNavIdx(i => Math.max(0, i - 1));
  }

  // Paginação: 6 por página
  const PAGE = 6;
  const page      = Math.floor(navIdx / PAGE);
  const pageItems = revisao.slice(page * PAGE, (page + 1) * PAGE);
  const totalPages = Math.ceil(revisao.length / PAGE);

  return (
    <AppLayout>
      <div className="topbar">
        <div>
          <h1 className="page-title">Fila de Revisão</h1>
          {!loading && <p style={{ fontSize:"0.8rem", color:"#78716c", marginTop:2 }}>
            {revisao.length === 0 ? "Nenhuma foto pendente 🎉" : `${revisao.length} foto${revisao.length !== 1 ? "s" : ""} aguardando revisão`}
          </p>}
        </div>
      </div>

      <div className="page-content">
        {loading ? (
          <div className="product-grid">
            {Array.from({ length:6 }).map((_,i) => (
              <div key={i} style={{ background:"white", border:"2px solid #fcd34d", borderRadius:12, overflow:"hidden" }}>
                <div className="skeleton" style={{ height:220 }} />
                <div style={{ padding:"0.875rem", display:"flex", flexDirection:"column", gap:"0.5rem" }}>
                  <div className="skeleton" style={{ height:10, width:"40%" }} />
                  <div className="skeleton" style={{ height:14, width:"80%" }} />
                </div>
              </div>
            ))}
          </div>
        ) : revisao.length === 0 ? (
          <div style={{ textAlign:"center", padding:"5rem", color:"#78716c" }}>
            <div style={{ fontSize:"3rem", marginBottom:"1rem" }}>✅</div>
            <p style={{ fontFamily:"var(--font-display)", fontSize:"1.4rem", marginBottom:"0.5rem" }}>Fila de revisão vazia!</p>
            <p style={{ fontSize:"0.875rem" }}>Todas as fotos foram revisadas. Bom trabalho!</p>
          </div>
        ) : (
          <>
            {/* Legenda das ações */}
            <div style={{ background:"#fffbeb", border:"1px solid #fcd34d", borderRadius:8, padding:"0.875rem 1rem", marginBottom:"1.25rem", display:"flex", gap:"1.5rem", flexWrap:"wrap", fontSize:"0.8rem", color:"#78716c" }}>
              <span><strong>🔗 Atribuir</strong> — vincular ao SKU de outro produto</span>
              <span><strong>↺ Reclassificar</strong> — editar SKU, nome e categoria</span>
              <span><strong>✓ Aprovar</strong> — aceitar como está, tirar da fila</span>
              <span><strong>✕</strong> — excluir permanentemente</span>
            </div>

            <div className="product-grid">
              {pageItems.map((foto, i) => (
                <FotoCard
                  key={foto.id}
                  foto={foto}
                  todos={todos}
                  idx={page * PAGE + i}
                  total={revisao.length}
                  onPrev={() => setNavIdx(n => Math.max(0, n - 1))}
                  onNext={() => setNavIdx(n => Math.min(revisao.length - 1, n + 1))}
                  onUpdated={handleUpdated}
                  onDeleted={handleDeleted}
                />
              ))}
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div style={{ display:"flex", justifyContent:"center", gap:"0.5rem", marginTop:"1.5rem" }}>
                {Array.from({ length:totalPages }).map((_,i) => (
                  <button key={i} onClick={() => setNavIdx(i * PAGE)}
                    style={{ width:32, height:32, borderRadius:6, border:"1px solid #e7e5e4", background: i === page ? "#1c1917" : "white", color: i === page ? "white" : "#44403c", cursor:"pointer", fontWeight: i === page ? 700 : 400 }}
                  >{i+1}</button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}

export default function RevisarPage() {
  return (
    <Suspense fallback={<AppLayout><div className="page-content" style={{ textAlign:"center", paddingTop:"4rem" }}>Carregando...</div></AppLayout>}>
      <RevisarContent />
    </Suspense>
  );
}
