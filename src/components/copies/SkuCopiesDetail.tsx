"use client";
import { useState, useEffect } from "react";
import { Pencil, Zap, X, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import type { ProdutoCopy, Plataforma } from "@/types";
import { COPY_LIMITS, PLATAFORMA_LABEL } from "@/types";

export const PLAT_COLOR: Record<Plataforma, string> = {
  amazon:          "#FF9900",
  mercado_livre:   "#FFE600",
  shopee:          "#EE4D2D",
  leroy_merlin:    "#78BE20",
  madeira_madeira: "#1C5E8C",
  nuvemshop:       "#5C6BC0",
};

const DESC_PREVIEW_CHARS = 80;

// ── Helper: indicador de chars ────────────────────────────────────────────────
export function CharBadge({ current, max }: { current: number; max: number }) {
  const pct  = current / max;
  const color = pct > 1 ? "#ef4444" : pct > 0.9 ? "#f59e0b" : "#22c55e";
  return (
    <span style={{ fontSize: "0.7rem", color, fontWeight: 600 }}>
      {current}/{max}
    </span>
  );
}

// ── Helper: botão de copiar com feedback ──────────────────────────────────────
function CopyButton({ text, fieldKey, copiedKey, onCopy }: {
  text: string;
  fieldKey: string;
  copiedKey: string | null;
  onCopy: (key: string, text: string) => void;
}) {
  const isCopied = copiedKey === fieldKey;
  return (
    <button
      type="button"
      onClick={() => onCopy(fieldKey, text)}
      title={isCopied ? "Copiado!" : "Copiar"}
      style={{
        display:"inline-flex", alignItems:"center", gap:4,
        fontSize:"0.7rem", fontWeight:600,
        color: isCopied ? "#86efac" : "#a8a29e",
        background:"none", border:"none", cursor:"pointer",
        padding:"2px 4px", borderRadius:4, flexShrink:0,
        transition:"color 0.15s",
      }}
    >
      {isCopied ? <Check size={12} /> : <Copy size={12} />}
      {isCopied ? "Copiado!" : "Copiar"}
    </button>
  );
}

// ── Modal de edição ───────────────────────────────────────────────────────────
export function EditCopyModal({ copy, onClose, onSaved }: {
  copy: ProdutoCopy;
  onClose: () => void;
  onSaved: (updated: ProdutoCopy) => void;
}) {
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
export function SkuCopiesDetail({ sku, onCopyEdited, showGenerateButton = true }: {
  sku: string;
  onCopyEdited?: (updated: ProdutoCopy) => void;
  showGenerateButton?: boolean;
}) {
  const [copies,     setCopies]     = useState<ProdutoCopy[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [editing,    setEditing]    = useState<ProdutoCopy | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genMsg,     setGenMsg]     = useState("");
  const [expanded,   setExpanded]   = useState<Record<string, boolean>>({});
  const [copiedKey,  setCopiedKey]  = useState<string | null>(null);

  function toggleExpanded(plataforma: string) {
    setExpanded(prev => ({ ...prev, [plataforma]: !prev[plataforma] }));
  }

  async function handleCopy(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(prev => (prev === key ? null : prev)), 2000);
    } catch {
      // clipboard indisponível (contexto não-seguro) — falha silenciosa
    }
  }

  function fetchCopies() {
    setLoading(true);
    fetch(`/api/copies?sku=${encodeURIComponent(sku)}`)
      .then(r => r.ok ? r.json() : [])
      .then(d => { setCopies(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { fetchCopies(); }, [sku]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleGenerate() {
    setGenerating(true);
    setGenMsg("Gerando copies...");
    try {
      const res = await fetch("/api/copies/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku }),
      });
      const d = await res.json() as { copies?: unknown[]; errors?: string[] };
      const ok  = d.copies?.length ?? 0;
      const err = d.errors?.length ?? 0;
      setGenMsg(`✅ ${ok} copies gerados${err ? ` | ❌ ${err} erros` : ""}`);
      fetchCopies();
    } catch {
      setGenMsg("❌ Erro ao gerar copies");
    } finally {
      setGenerating(false);
    }
  }

  if (loading) return <p style={{ color:"#78716c", fontSize:"0.85rem" }}>Carregando...</p>;

  if (copies.length === 0) {
    return (
      <div style={{ textAlign:"center", padding:"1.5rem 1rem", color:"#78716c" }}>
        <p style={{ marginBottom:"0.75rem", fontSize:"0.9rem" }}>Copies não gerados para este produto.</p>
        {genMsg && <p style={{ fontSize:"0.8rem", color:"#86efac", marginBottom:"0.75rem" }}>{genMsg}</p>}
        {showGenerateButton && (
          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:"0.8rem", padding:"6px 14px", borderRadius:6, background:"#7c3aed22", color:"#a78bfa", border:"1px solid #7c3aed44", cursor: generating ? "wait" : "pointer" }}
          >
            <Zap size={13} />
            {generating ? "Gerando..." : "⚡ Gerar agora"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem" }}>
      {copies.map(copy => {
        const lim         = COPY_LIMITS[copy.plataforma];
        const isExpanded  = expanded[copy.plataforma] ?? false;
        const hasBullets  = !!copy.bullets?.length;
        const descLong    = copy.descricao.length > DESC_PREVIEW_CHARS;
        const descShown   = isExpanded || !descLong
          ? copy.descricao
          : `${copy.descricao.slice(0, DESC_PREVIEW_CHARS)}…`;

        return (
          <div key={copy.plataforma} style={{ background:"#1c1917", borderRadius:"0.5rem", padding:"0.875rem", border:"1px solid rgba(255,255,255,0.06)" }}>
            {/* Cabeçalho: plataforma + ações */}
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

            {/* Título */}
            <div style={{ marginBottom:"0.4rem" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"0.5rem", marginBottom:"0.15rem" }}>
                <span style={{ fontSize:"0.7rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", color:"#78716c" }}>Título</span>
                <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
                  <CharBadge current={copy.titulo.length} max={lim.titulo} />
                  <CopyButton text={copy.titulo} fieldKey={`${copy.plataforma}:titulo`} copiedKey={copiedKey} onCopy={handleCopy} />
                </div>
              </div>
              <p style={{ margin:0, fontSize:"0.85rem", color:"#e7e5e4", lineHeight:1.4 }}>{copy.titulo}</p>
            </div>

            {/* Bullets */}
            {hasBullets && (
              <div style={{ marginBottom:"0.4rem" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"0.5rem", marginBottom:"0.15rem" }}>
                  <span style={{ fontSize:"0.7rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", color:"#78716c" }}>
                    Bullets ({copy.bullets!.length})
                  </span>
                  <CopyButton text={copy.bullets!.join("\n")} fieldKey={`${copy.plataforma}:bullets`} copiedKey={copiedKey} onCopy={handleCopy} />
                </div>
                <ul style={{ margin:0, paddingLeft:"1.25rem", fontSize:"0.82rem", color:"#a8a29e", lineHeight:1.5 }}>
                  {copy.bullets!.map((b, i) => <li key={i}>{b}</li>)}
                </ul>
              </div>
            )}

            {/* Descrição */}
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"0.5rem", marginBottom:"0.15rem" }}>
                <span style={{ fontSize:"0.7rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", color:"#78716c" }}>Descrição</span>
                <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
                  <CharBadge current={copy.descricao.length} max={lim.descricao} />
                  <CopyButton text={copy.descricao} fieldKey={`${copy.plataforma}:descricao`} copiedKey={copiedKey} onCopy={handleCopy} />
                </div>
              </div>
              <p style={{ margin:0, fontSize:"0.82rem", color:"#a8a29e", lineHeight:1.5, whiteSpace:"pre-wrap" }}>{descShown}</p>
              {descLong && (
                <button
                  type="button"
                  onClick={() => toggleExpanded(copy.plataforma)}
                  style={{ display:"inline-flex", alignItems:"center", gap:3, marginTop:"0.35rem", fontSize:"0.72rem", fontWeight:600, color:"#a78bfa", background:"none", border:"none", cursor:"pointer", padding:0 }}
                >
                  {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  {isExpanded ? "Ver menos" : "Ver mais"}
                </button>
              )}
            </div>
          </div>
        );
      })}
      {editing && (
        <EditCopyModal
          copy={editing}
          onClose={() => setEditing(null)}
          onSaved={updated => {
            setCopies(prev => prev.map(c => c.id === updated.id ? updated : c));
            onCopyEdited?.(updated);
          }}
        />
      )}
    </div>
  );
}
