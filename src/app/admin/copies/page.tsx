"use client";
import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/layout/AppLayout";
import type { ProdutoCopy, Plataforma } from "@/types";
import { COPY_LIMITS, PLATAFORMA_LABEL } from "@/types";
import { X, Pencil, Zap, ChevronDown } from "lucide-react";

// ── Tipos locais ──────────────────────────────────────────────────────────────
interface SkuEntry { sku: string; plataformas: Plataforma[]; }

const PLATAFORMAS: Plataforma[] = ["amazon", "mercado_livre", "shopee", "leroy_merlin", "madeira_madeira"];

const PLAT_COLOR: Record<Plataforma, string> = {
  amazon:          "#FF9900",
  mercado_livre:   "#FFE600",
  shopee:          "#EE4D2D",
  leroy_merlin:    "#78BE20",
  madeira_madeira: "#1C5E8C",
};

// ── Helper: indicador de chars ────────────────────────────────────────────────
function CharBadge({ current, max }: { current: number; max: number }) {
  const pct  = current / max;
  const color = pct > 1 ? "#ef4444" : pct > 0.9 ? "#f59e0b" : "#22c55e";
  return (
    <span style={{ fontSize: "0.7rem", color, fontWeight: 600 }}>
      {current}/{max}
    </span>
  );
}

// ── Modal de edição ───────────────────────────────────────────────────────────
function EditModal({ copy, onClose, onSaved }: { copy: ProdutoCopy; onClose: () => void; onSaved: (updated: ProdutoCopy) => void }) {
  const limits  = COPY_LIMITS[copy.plataforma];
  const [titulo,    setTitulo]    = useState(copy.titulo);
  const [descricao, setDescricao] = useState(copy.descricao);
  const [bullets,   setBullets]   = useState<string[]>(copy.bullets ?? []);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    const body: Record<string, unknown> = { titulo, descricao };
    if (limits.bullets) body.bullets = bullets;
    const res = await fetch(`/api/copies/${copy.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const d = await res.json() as { error?: string };
      setError(d.error ?? "Erro ao salvar");
      setSaving(false);
      return;
    }
    const updated = await res.json() as ProdutoCopy;
    onSaved(updated);
    onClose();
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:"1rem" }}>
      <div style={{ background:"#1c1917", borderRadius:"0.75rem", padding:"1.5rem", width:"100%", maxWidth:"640px", maxHeight:"90vh", overflowY:"auto", display:"flex", flexDirection:"column", gap:"1rem" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <h2 style={{ margin:0, fontSize:"1rem", color:"#e7e5e4" }}>
            Editar copy — <span style={{ color: PLAT_COLOR[copy.plataforma] }}>{PLATAFORMA_LABEL[copy.plataforma]}</span>
          </h2>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"#78716c" }}><X size={18} /></button>
        </div>

        {/* Título */}
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"0.25rem" }}>
            <label style={{ fontSize:"0.8rem", color:"#a8a29e" }}>Título</label>
            <CharBadge current={titulo.length} max={limits.titulo} />
          </div>
          <input
            className="input-field"
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            maxLength={limits.titulo + 20}
          />
        </div>

        {/* Bullets (Amazon / Leroy) */}
        {limits.bullets && (
          <div>
            <label style={{ fontSize:"0.8rem", color:"#a8a29e", display:"block", marginBottom:"0.5rem" }}>
              Bullets ({bullets.length}/{limits.bullets.count})
            </label>
            {bullets.map((b, i) => (
              <div key={i} style={{ display:"flex", gap:"0.5rem", marginBottom:"0.5rem", alignItems:"center" }}>
                <input
                  className="input-field"
                  value={b}
                  onChange={e => { const nb = [...bullets]; nb[i] = e.target.value; setBullets(nb); }}
                  style={{ flex:1 }}
                />
                <CharBadge current={b.length} max={limits.bullets!.chars} />
                <button onClick={() => setBullets(bullets.filter((_, j) => j !== i))} style={{ background:"none", border:"none", cursor:"pointer", color:"#78716c" }}><X size={14} /></button>
              </div>
            ))}
            {bullets.length < limits.bullets.count && (
              <button onClick={() => setBullets([...bullets, ""])} style={{ fontSize:"0.8rem", color:"#c084fc", background:"none", border:"none", cursor:"pointer" }}>
                + Adicionar bullet
              </button>
            )}
          </div>
        )}

        {/* Descrição */}
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"0.25rem" }}>
            <label style={{ fontSize:"0.8rem", color:"#a8a29e" }}>Descrição</label>
            <CharBadge current={descricao.length} max={limits.descricao} />
          </div>
          <textarea
            className="input-field"
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
            rows={6}
            style={{ resize:"vertical" }}
          />
        </div>

        {error && <p style={{ color:"#ef4444", fontSize:"0.85rem", margin:0 }}>{error}</p>}

        <div style={{ display:"flex", gap:"0.75rem", justifyContent:"flex-end" }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Detalhe de copies de um SKU ───────────────────────────────────────────────
function SkuCopiesDetail({ sku, onCopyEdited }: { sku: string; onCopyEdited: (updated: ProdutoCopy) => void }) {
  const [copies,   setCopies]   = useState<ProdutoCopy[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [editing,  setEditing]  = useState<ProdutoCopy | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/copies?sku=${encodeURIComponent(sku)}`)
      .then(r => r.ok ? r.json() : [])
      .then(d => { setCopies(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [sku]);

  if (loading) return <p style={{ color:"#78716c", fontSize:"0.85rem" }}>Carregando...</p>;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem" }}>
      {copies.map(copy => {
        const lim = COPY_LIMITS[copy.plataforma];
        return (
          <div key={copy.plataforma} style={{ background:"#1c1917", borderRadius:"0.5rem", padding:"0.875rem", border:"1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.5rem" }}>
              <span style={{ fontSize:"0.8rem", fontWeight:700, color: PLAT_COLOR[copy.plataforma] }}>
                {PLATAFORMA_LABEL[copy.plataforma]}
              </span>
              <button
                onClick={() => setEditing(copy)}
                style={{ display:"flex", alignItems:"center", gap:4, fontSize:"0.75rem", color:"#a78bfa", background:"none", border:"none", cursor:"pointer" }}
              >
                <Pencil size={12} /> Editar
              </button>
            </div>
            <p style={{ margin:"0 0 0.25rem", fontSize:"0.85rem", color:"#e7e5e4" }}>
              <strong>Título:</strong> {copy.titulo}
              <span style={{ marginLeft:"0.5rem" }}><CharBadge current={copy.titulo.length} max={lim.titulo} /></span>
            </p>
            {copy.bullets?.length ? (
              <ul style={{ margin:"0.25rem 0", paddingLeft:"1.25rem", fontSize:"0.82rem", color:"#a8a29e" }}>
                {copy.bullets.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            ) : null}
            <p style={{ margin:"0.25rem 0 0", fontSize:"0.82rem", color:"#78716c", display:"flex", justifyContent:"space-between" }}>
              <span>Descrição: {copy.descricao.slice(0, 80)}...</span>
              <CharBadge current={copy.descricao.length} max={lim.descricao} />
            </p>
          </div>
        );
      })}
      {editing && (
        <EditModal
          copy={editing}
          onClose={() => setEditing(null)}
          onSaved={updated => {
            setCopies(prev => prev.map(c => c.id === updated.id ? updated : c));
            onCopyEdited(updated);
          }}
        />
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function CopiesPage() {
  const [entries,    setEntries]    = useState<SkuEntry[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [filtPlatf,  setFiltPlatf]  = useState<Plataforma | "">("");
  const [expanded,   setExpanded]   = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [genMsg,     setGenMsg]     = useState<Record<string, string>>({});

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/copies")
      .then(r => r.ok ? r.json() : [])
      .then(d => { setEntries(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleGenerate(sku: string) {
    setGenerating(sku);
    setGenMsg(prev => ({ ...prev, [sku]: "Gerando..." }));
    const res = await fetch("/api/copies/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sku }),
    });
    const d = await res.json() as { copies?: unknown[]; errors?: string[] };
    const ok  = d.copies?.length ?? 0;
    const err = d.errors?.length ?? 0;
    setGenMsg(prev => ({ ...prev, [sku]: `✅ ${ok} copies gerados${err ? ` | ❌ ${err} erros` : ""}` }));
    setGenerating(null);
    load();
  }

  const filtered = entries.filter(e => {
    const matchSearch = !search || e.sku.toLowerCase().includes(search.toLowerCase());
    const matchPlatf  = !filtPlatf || e.plataformas.includes(filtPlatf);
    return matchSearch && matchPlatf;
  });

  return (
    <AppLayout>
      <div style={{ padding:"1.5rem", maxWidth:"900px", margin:"0 auto" }}>
        <h1 style={{ fontSize:"1.25rem", fontWeight:700, color:"#e7e5e4", margin:"0 0 1.25rem" }}>
          Copies SEO por Plataforma
        </h1>

        {/* Filtros */}
        <div style={{ display:"flex", gap:"0.75rem", marginBottom:"1.25rem", flexWrap:"wrap" }}>
          <input
            className="input-field"
            placeholder="Buscar por SKU..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex:1, minWidth:"180px" }}
          />
          <div style={{ position:"relative" }}>
            <select
              className="input-field"
              value={filtPlatf}
              onChange={e => setFiltPlatf(e.target.value as Plataforma | "")}
              style={{ paddingRight:"2rem", appearance:"none" }}
            >
              <option value="">Todas as plataformas</option>
              {PLATAFORMAS.map(p => <option key={p} value={p}>{PLATAFORMA_LABEL[p]}</option>)}
            </select>
            <ChevronDown size={14} style={{ position:"absolute", right:"0.5rem", top:"50%", transform:"translateY(-50%)", pointerEvents:"none", color:"#78716c" }} />
          </div>
        </div>

        {/* Contagem */}
        <p style={{ fontSize:"0.8rem", color:"#78716c", marginBottom:"1rem" }}>
          {loading ? "Carregando..." : `${filtered.length} produto(s) com copies gerados`}
        </p>

        {/* Lista */}
        <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem" }}>
          {filtered.map(entry => (
            <div key={entry.sku} style={{ background:"#28211e", borderRadius:"0.625rem", border:"1px solid rgba(255,255,255,0.07)", overflow:"hidden" }}>
              {/* Cabeçalho da linha */}
              <div
                style={{ display:"flex", alignItems:"center", gap:"0.75rem", padding:"0.75rem 1rem", cursor:"pointer" }}
                onClick={() => setExpanded(prev => prev === entry.sku ? null : entry.sku)}
              >
                <ChevronDown
                  size={14}
                  style={{ color:"#78716c", transition:"transform 0.15s", transform: expanded === entry.sku ? "rotate(180deg)" : "none", flexShrink:0 }}
                />
                <span style={{ fontWeight:600, color:"#e7e5e4", fontSize:"0.9rem", minWidth:"140px" }}>{entry.sku}</span>

                {/* Chips de plataformas */}
                <div style={{ display:"flex", gap:"0.35rem", flexWrap:"wrap", flex:1 }}>
                  {PLATAFORMAS.map(p => (
                    <span
                      key={p}
                      style={{
                        fontSize:"0.68rem", padding:"2px 7px", borderRadius:20, fontWeight:600,
                        background: entry.plataformas.includes(p) ? PLAT_COLOR[p] + "33" : "rgba(255,255,255,0.04)",
                        color:      entry.plataformas.includes(p) ? PLAT_COLOR[p] : "#57534e",
                        border:     `1px solid ${entry.plataformas.includes(p) ? PLAT_COLOR[p] + "66" : "transparent"}`,
                      }}
                    >
                      {PLATAFORMA_LABEL[p]}
                    </span>
                  ))}
                </div>

                {/* Botão Gerar */}
                <button
                  onClick={e => { e.stopPropagation(); handleGenerate(entry.sku); }}
                  disabled={generating === entry.sku}
                  style={{ display:"flex", alignItems:"center", gap:4, fontSize:"0.75rem", padding:"4px 10px", borderRadius:6, background:"#7c3aed22", color:"#a78bfa", border:"1px solid #7c3aed44", cursor:"pointer", whiteSpace:"nowrap", flexShrink:0 }}
                >
                  <Zap size={12} />
                  {generating === entry.sku ? "Gerando..." : "Re-gerar"}
                </button>
              </div>

              {/* Mensagem de geração */}
              {genMsg[entry.sku] && (
                <p style={{ margin:0, padding:"0 1rem 0.5rem", fontSize:"0.78rem", color:"#86efac" }}>{genMsg[entry.sku]}</p>
              )}

              {/* Detalhe expandido */}
              {expanded === entry.sku && (
                <div style={{ padding:"0 1rem 1rem", borderTop:"1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ paddingTop:"0.75rem" }}>
                    <SkuCopiesDetail
                      sku={entry.sku}
                      onCopyEdited={() => {}}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}

          {!loading && filtered.length === 0 && (
            <div style={{ textAlign:"center", padding:"3rem", color:"#78716c" }}>
              <p>Nenhum copy encontrado.</p>
              <p style={{ fontSize:"0.85rem" }}>Use o script <code>generate-copies.ts</code> para gerar em lote.</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
