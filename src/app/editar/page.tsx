"use client";
import { useState, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import type { Produto, Categoria, Qualidade, Angulo, Fundo, Material } from "@/types";
import { Search, Save, Trash2 } from "lucide-react";

const CATEGORIAS: Categoria[] = ["cuba","sanitario","pastilha","flexivel","rejunte","acessorio","outro"];
const QUALIDADES: Qualidade[] = ["excelente","boa","regular","ruim"];
const ANGULOS:    Angulo[]    = ["frontal","lateral","superior","perspectiva","detalhe","conjunto","embalagem"];
const FUNDOS:     Fundo[]     = ["branco","colorido","ambiente","transparente","outro"];
const MATERIAIS:  Material[]  = ["louca","aco_inox","plastico","ceramica","metal","borracha","outro"];

export default function EditarProdutoPage() {
  const [produtos,   setProdutos]   = useState<Produto[]>([]);
  const [search,     setSearch]     = useState("");
  const [selected,   setSelected]   = useState<Produto | null>(null);
  const [form,       setForm]       = useState<Partial<Produto>>({});
  const [saving,     setSaving]     = useState(false);
  const [deleting,   setDeleting]   = useState(false);
  const [success,    setSuccess]    = useState("");
  const [error,      setError]      = useState("");
  const [confirmDel, setConfirmDel] = useState("");

  useEffect(() => {
    fetch("/api/produtos").then(r => r.json()).then(setProdutos);
  }, []);

  const upd = (k: keyof Produto, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const results = search.length > 1
    ? produtos.filter(p =>
        p.sku.toLowerCase().includes(search.toLowerCase()) ||
        p.nome_produto.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  function select(p: Produto) {
    setSelected(p);
    setForm({ ...p });
    setSearch(p.sku + " — " + p.nome_produto);
    setSuccess(""); setError(""); setConfirmDel("");
  }

  async function save() {
    if (!selected) return;
    setSaving(true); setError(""); setSuccess("");
    try {
      const res = await fetch(`/api/produtos/${selected.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setSuccess("Produto atualizado com sucesso!");
      // Atualiza lista local
      setProdutos(prev => prev.map(p => p.id === selected.id ? { ...p, ...form } as Produto : p));
    } catch(e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally { setSaving(false); }
  }

  async function del() {
    if (!selected || confirmDel !== selected.sku) {
      setError("Digite o SKU corretamente para confirmar.");
      return;
    }
    setDeleting(true); setError("");
    try {
      const res = await fetch(`/api/produtos/${selected.id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setProdutos(prev => prev.filter(p => p.id !== selected.id));
      setSelected(null); setForm({}); setSearch(""); setConfirmDel("");
      setSuccess("Produto excluído.");
    } catch(e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao excluir");
    } finally { setDeleting(false); }
  }

  return (
    <AppLayout>
      <div className="topbar">
        <h1 className="page-title">Editar Produto</h1>
      </div>

      <div className="page-content" style={{ maxWidth: 900 }}>
        {/* Busca */}
        <div style={{ position: "relative", marginBottom: "1.5rem" }}>
          <Search size={15} style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "#78716c" }} />
          <input
            className="search-input"
            style={{ paddingLeft: "2.5rem", maxWidth: "100%", width: "100%" }}
            placeholder="Buscar por SKU ou nome do produto..."
            value={search}
            onChange={e => { setSearch(e.target.value); setSelected(null); }}
          />
          {/* Dropdown de resultados */}
          {results.length > 0 && !selected && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "white", border: "1px solid #e7e5e4", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 20, maxHeight: 280, overflowY: "auto" }}>
              {results.slice(0, 15).map(p => (
                <button
                  key={p.id}
                  onClick={() => select(p)}
                  style={{ width: "100%", padding: "0.75rem 1rem", display: "flex", alignItems: "center", gap: "1rem", border: "none", background: "none", cursor: "pointer", textAlign: "left" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#fafaf9")}
                  onMouseLeave={e => (e.currentTarget.style.background = "none")}
                >
                  {p.image_url && (
                    <img src={p.image_url.includes("cloudinary") ? p.image_url.replace("/upload/","/upload/w_60,h_60,c_fill/") : p.image_url}
                      alt="" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4, border: "1px solid #e7e5e4", flexShrink: 0 }} />
                  )}
                  <div>
                    <div style={{ fontSize: "0.8rem", fontWeight: 600 }}>{p.sku}</div>
                    <div style={{ fontSize: "0.8rem", color: "#78716c" }}>{p.nome_produto}</div>
                  </div>
                  <span className="badge badge-cat" style={{ marginLeft: "auto", textTransform: "capitalize" }}>{p.categoria}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {!selected && (
          <div style={{ textAlign: "center", padding: "3rem", color: "#78716c" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🔍</div>
            <p style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem" }}>Busque um produto para editar</p>
            <p style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>Digite pelo menos 2 letras do SKU ou nome</p>
          </div>
        )}

        {selected && (
          <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: "1.5rem" }}>
            {/* Imagem atual */}
            <div>
              {selected.image_url ? (
                <img src={selected.image_url.includes("cloudinary") ? selected.image_url.replace("/upload/","/upload/w_400,q_auto/") : selected.image_url}
                  alt={selected.nome_produto} style={{ width: "100%", borderRadius: 8, border: "1px solid #e7e5e4" }} />
              ) : (
                <div style={{ background: "#f5f5f4", borderRadius: 8, height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#a8a29e", fontSize: "0.8rem" }}>
                  Sem imagem
                </div>
              )}
              <p style={{ fontSize: "0.7rem", color: "#78716c", marginTop: "0.5rem", textAlign: "center" }}>
                Para trocar a foto, cadastre novamente como novo produto
              </p>
            </div>

            {/* Formulário */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }}>
                <div className="input-group" style={{ gridColumn: "1/-1" }}>
                  <label className="input-label">SKU *</label>
                  <input className="input-field" value={form.sku ?? ""} onChange={e => upd("sku", e.target.value)} />
                </div>
                <div className="input-group" style={{ gridColumn: "1/-1" }}>
                  <label className="input-label">Nome *</label>
                  <input className="input-field" value={form.nome_produto ?? ""} onChange={e => upd("nome_produto", e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label">Categoria</label>
                  <select className="input-field" value={form.categoria ?? ""} onChange={e => upd("categoria", e.target.value)}>
                    {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Qualidade</label>
                  <select className="input-field" value={form.qualidade_foto ?? ""} onChange={e => upd("qualidade_foto", e.target.value)}>
                    {QUALIDADES.map(q => <option key={q} value={q}>{q}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Ângulo</label>
                  <select className="input-field" value={form.angulo ?? ""} onChange={e => upd("angulo", e.target.value)}>
                    {ANGULOS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Material</label>
                  <select className="input-field" value={form.material_aparente ?? ""} onChange={e => upd("material_aparente", e.target.value)}>
                    {MATERIAIS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Cor dominante</label>
                  <input className="input-field" value={form.cor_dominante ?? ""} onChange={e => upd("cor_dominante", e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label">Subcategoria</label>
                  <input className="input-field" value={form.subcategoria ?? ""} onChange={e => upd("subcategoria", e.target.value)} />
                </div>
                <div className="input-group" style={{ gridColumn: "1/-1" }}>
                  <label className="input-label">Tags (vírgula)</label>
                  <input className="input-field"
                    value={Array.isArray(form.tags) ? form.tags.join(", ") : ""}
                    onChange={e => upd("tags", e.target.value.split(",").map(t => t.trim()).filter(Boolean))}
                  />
                </div>
                <div className="input-group" style={{ gridColumn: "1/-1" }}>
                  <label className="input-label">Descrição catálogo</label>
                  <textarea className="input-field" value={form.descricao_marketing ?? ""} onChange={e => upd("descricao_marketing", e.target.value)} />
                </div>
                <div className="input-group" style={{ gridColumn: "1/-1" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.875rem" }}>
                    <input type="checkbox" checked={form.precisa_revisao ?? false} onChange={e => upd("precisa_revisao", e.target.checked)} />
                    Marcar para revisão
                  </label>
                </div>
              </div>

              {success && <div className="alert alert-success"><span>✅</span> {success}</div>}
              {error   && <div className="alert alert-error"><span>⚠️</span> {error}</div>}

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button className="btn btn-primary btn-lg" onClick={save} disabled={saving} style={{ flex: 1 }}>
                  <Save size={16} /> {saving ? "Salvando..." : "Salvar alterações"}
                </button>
              </div>

              <hr className="divider" />

              {/* Exclusão */}
              <div style={{ background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 8, padding: "1rem" }}>
                <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "#991b1b", marginBottom: "0.5rem" }}>⚠️ Zona de perigo</p>
                <p style={{ fontSize: "0.8rem", color: "#7f1d1d", marginBottom: "0.75rem" }}>
                  Para excluir, digite o SKU <strong>{selected.sku}</strong> abaixo para confirmar:
                </p>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input className="input-field" placeholder={selected.sku} value={confirmDel} onChange={e => setConfirmDel(e.target.value)} style={{ flex: 1 }} />
                  <button className="btn btn-danger" onClick={del} disabled={deleting || confirmDel !== selected.sku}>
                    <Trash2 size={15} /> {deleting ? "..." : "Excluir"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
