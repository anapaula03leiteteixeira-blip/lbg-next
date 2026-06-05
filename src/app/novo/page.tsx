"use client";
import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import type { ClassificacaoIA, Categoria, Qualidade, Angulo, Fundo, Material } from "@/types";
import { Upload, Sparkles, Save, CheckCircle, Package } from "lucide-react";

const CATEGORIAS: Categoria[] = ["cuba","sanitario","flexivel","rejunte","acessorio","outro"];
const QUALIDADES: Qualidade[] = ["excelente","boa","regular","ruim"];
const ANGULOS:    Angulo[]    = ["frontal","lateral","superior","perspectiva","detalhe","conjunto","embalagem"];
const FUNDOS:     Fundo[]     = ["branco","colorido","ambiente","transparente","outro"];
const MATERIAIS:  Material[]  = ["louca","aco_inox","plastico","ceramica","metal","borracha","outro"];

type Step = 1 | 2 | 3;

export default function NovoProdutoPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file,       setFile]       = useState<File | null>(null);
  const [preview,    setPreview]    = useState<string | null>(null);
  const [drag,       setDrag]       = useState(false);
  const [step,       setStep]       = useState<Step>(1);
  const [aiResult,   setAiResult]   = useState<ClassificacaoIA | null>(null);
  const [classifying,setClassifying] = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [error,      setError]      = useState("");

  // Hints
  const [skuHint,  setSkuHint]  = useState("");
  const [catHint,  setCatHint]  = useState<string>("auto");
  const [nomeHint, setNomeHint] = useState("");

  // Form editável após IA
  const [form, setForm] = useState<ClassificacaoIA>({});
  const upd = (k: keyof ClassificacaoIA, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  function handleFile(f: File) {
    if (f.size > 10 * 1024 * 1024) { setError("Arquivo muito grande (máx. 10MB)."); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setStep(2);
    setError("");
    setAiResult(null);
    setSaved(false);
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  async function classify() {
    if (!file) return;
    setClassifying(true); setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (skuHint)            fd.append("sku",      skuHint);
      if (catHint !== "auto") fd.append("categoria", catHint);
      if (nomeHint)           fd.append("nome",      nomeHint);

      const res  = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro na classificação");

      setAiResult(data.classificacao);
      setForm({ ...data.classificacao, image_url: data.image_url, hash_sha256: data.hash_sha256, arquivo_original: data.arquivo_original });
      setStep(3);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setClassifying(false);
    }
  }

  async function save() {
    if (!form.sku?.trim()) { setError("SKU obrigatório."); return; }
    if (!form.nome_produto?.trim()) { setError("Nome obrigatório."); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/produtos", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setSaved(true);
      // Reset para próximo produto
      setTimeout(() => {
        setFile(null); setPreview(null); setStep(1);
        setAiResult(null); setForm({}); setSaved(false);
        setSkuHint(""); setCatHint("auto"); setNomeHint("");
      }, 2500);
    } catch(e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout>
      <div className="topbar">
        <h1 className="page-title">Novo Produto</h1>
        <Link href="/novo/bulk" className="btn btn-outline btn-sm">
          <Package size={14} />
          Importar em Lote
        </Link>
      </div>

      <div className="page-content" style={{ maxWidth: 900 }}>
        {/* Steps indicator */}
        <div className="steps">
          {([["1","Upload da foto"], ["2","Classificar com IA"], ["3","Revisar e salvar"]] as const).map(([n, label]) => (
            <div key={n} className={`step ${step === +n ? "active" : step > +n ? "done" : ""}`}>
              <div className="step-num">{step > +n ? "✓" : n}</div>
              {label}
            </div>
          ))}
        </div>

        {/* STEP 1 — Upload */}
        {step === 1 && (
          <div
            className={`upload-zone ${drag ? "drag-over" : ""}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
          >
            <div className="upload-zone-icon">📷</div>
            <p style={{ fontSize: "1rem", fontWeight: 500, marginBottom: 6 }}>Clique ou arraste a foto aqui</p>
            <p className="upload-zone-text">JPG, PNG ou WEBP · Máximo 10MB</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: "none" }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>
        )}

        {/* STEP 2 — Contexto + Classificar */}
        {step >= 2 && file && (
          <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "1.5rem" }}>
            {/* Preview */}
            <div>
              <img src={preview!} alt="Preview" style={{ width: "100%", borderRadius: 8, border: "1px solid #e7e5e4" }} />
              <p style={{ fontSize: "0.75rem", color: "#78716c", marginTop: "0.5rem", textAlign: "center" }}>{file.name} · {(file.size/1024).toFixed(0)}KB</p>
              {step === 2 && (
                <button className="btn btn-ghost btn-sm btn-full" style={{ marginTop: "0.75rem" }} onClick={() => { setFile(null); setPreview(null); setStep(1); }}>
                  Trocar foto
                </button>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {step === 2 && (
                <>
                  <div>
                    <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", marginBottom: "0.25rem" }}>Dê uma dica para a IA</h3>
                    <p style={{ fontSize: "0.8rem", color: "#78716c" }}>Opcional — quanto mais info, mais precisa a classificação</p>
                  </div>

                  <div className="input-group">
                    <label className="input-label">SKU / Código</label>
                    <input className="input-field" placeholder="ex: LBG100IPANEMA" value={skuHint} onChange={e => setSkuHint(e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Categoria</label>
                    <select className="input-field" value={catHint} onChange={e => setCatHint(e.target.value)}>
                      <option value="auto">— IA decide automaticamente —</option>
                      {CATEGORIAS.map(c => <option key={c} value={c} style={{ textTransform: "capitalize" }}>{c}</option>)}
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Nome ou descrição</label>
                    <input className="input-field" placeholder="ex: Cuba de Apoio Redonda Branca" value={nomeHint} onChange={e => setNomeHint(e.target.value)} />
                  </div>

                  {error && <div className="alert alert-error"><span>⚠️</span>{error}</div>}

                  <button className="btn btn-gold btn-lg" onClick={classify} disabled={classifying}>
                    <Sparkles size={16} />
                    {classifying ? "Analisando com IA..." : "Classificar com IA"}
                  </button>
                  {classifying && (
                    <p style={{ fontSize: "0.8rem", color: "#78716c", textAlign: "center" }}>
                      Claude Vision está analisando a foto — aguarde alguns segundos...
                    </p>
                  )}
                </>
              )}

              {/* STEP 3 — Form de revisão */}
              {step === 3 && (
                <>
                  {saved ? (
                    <div className="alert alert-success" style={{ padding: "1.5rem", justifyContent: "center", flexDirection: "column", textAlign: "center", gap: "0.5rem" }}>
                      <CheckCircle size={32} color="#16a34a" />
                      <strong style={{ fontSize: "1.1rem" }}>Produto salvo!</strong>
                      <span style={{ fontSize: "0.85rem" }}>Preparando para o próximo cadastro...</span>
                    </div>
                  ) : (
                    <>
                      <div>
                        <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", marginBottom: "0.25rem" }}>✅ IA classificou! Revise e salve</h3>
                        <p style={{ fontSize: "0.8rem", color: "#78716c" }}>Corrija qualquer campo se necessário</p>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }}>
                        <div className="input-group" style={{ gridColumn: "1/-1" }}>
                          <label className="input-label">SKU *</label>
                          <input className="input-field" value={form.sku ?? ""} onChange={e => upd("sku", e.target.value)} />
                        </div>
                        <div className="input-group" style={{ gridColumn: "1/-1" }}>
                          <label className="input-label">Nome do produto *</label>
                          <input className="input-field" value={form.nome_produto ?? ""} onChange={e => upd("nome_produto", e.target.value)} />
                        </div>
                        <div className="input-group">
                          <label className="input-label">Categoria</label>
                          <select className="input-field" value={form.categoria ?? ""} onChange={e => upd("categoria", e.target.value)}>
                            {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div className="input-group">
                          <label className="input-label">Qualidade da foto</label>
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
                          <label className="input-label">Tags (separe por vírgula)</label>
                          <input className="input-field"
                            value={Array.isArray(form.tags) ? form.tags.join(", ") : ""}
                            onChange={e => upd("tags", e.target.value.split(",").map(t => t.trim()).filter(Boolean))}
                          />
                        </div>
                        <div className="input-group" style={{ gridColumn: "1/-1" }}>
                          <label className="input-label">Descrição para catálogo</label>
                          <textarea className="input-field" value={form.descricao_marketing ?? ""} onChange={e => upd("descricao_marketing", e.target.value)} />
                        </div>
                        <div className="input-group" style={{ gridColumn: "1/-1" }}>
                          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.875rem" }}>
                            <input type="checkbox" checked={form.precisa_revisao ?? false} onChange={e => upd("precisa_revisao", e.target.checked)} />
                            Marcar para revisão posterior
                          </label>
                        </div>
                      </div>

                      {form.problemas_foto && form.problemas_foto.length > 0 && (
                        <div className="alert alert-warning">
                          <span>⚠️</span>
                          <div>
                            <strong>Problemas detectados:</strong>
                            <ul style={{ paddingLeft: "1rem", marginTop: 4 }}>
                              {form.problemas_foto.map(p => <li key={p} style={{ fontSize: "0.85rem" }}>{p}</li>)}
                            </ul>
                          </div>
                        </div>
                      )}

                      {error && <div className="alert alert-error"><span>⚠️</span>{error}</div>}

                      <button className="btn btn-primary btn-lg" onClick={save} disabled={saving}>
                        <Save size={16} />
                        {saving ? "Salvando..." : "Salvar no catálogo"}
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
