"use client";
import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/layout/AppLayout";
import type { Plataforma } from "@/types";
import { PLATAFORMA_LABEL } from "@/types";
import { Zap, ChevronDown } from "lucide-react";
import { SkuCopiesDetail, PLAT_COLOR } from "@/components/copies/SkuCopiesDetail";

// ── Tipos locais ──────────────────────────────────────────────────────────────
interface SkuEntry { sku: string; plataformas: Plataforma[]; }

const PLATAFORMAS: Plataforma[] = ["amazon", "mercado_livre", "shopee", "leroy_merlin", "madeira_madeira"];

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
