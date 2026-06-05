"use client";
import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import type { ClassificacaoIA, Categoria, Qualidade, Angulo, Fundo, Material } from "@/types";
import { Upload, Sparkles, Save, CheckCircle, Package, ChevronDown, ChevronUp, Images } from "lucide-react";

const CATEGORIAS: Categoria[] = ["cuba","sanitario","pastilha","flexivel","rejunte","acessorio","outro"];
const QUALIDADES: Qualidade[] = ["excelente","boa","regular","ruim"];
const ANGULOS:    Angulo[]    = ["frontal","lateral","superior","perspectiva","detalhe","conjunto","embalagem"];
const FUNDOS:     Fundo[]     = ["branco","colorido","ambiente","transparente","outro"];
const MATERIAIS:  Material[]  = ["louca","aco_inox","plastico","ceramica","metal","borracha","outro"];

type Step = 1 | 2 | 3;

function HowItWorks() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background:"#fafaf9", border:"1px solid #e7e5e4", borderRadius:10, marginBottom:"1.25rem", overflow:"hidden" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0.875rem 1.125rem", background:"none", border:"none", cursor:"pointer", textAlign:"left" }}
      >
        <span style={{ display:"flex", alignItems:"center", gap:"0.5rem", fontWeight:600, fontSize:"0.875rem" }}>
          <span style={{ fontSize:"1rem" }}>💡</span> Como funciona o cadastro individual
        </span>
        {open ? <ChevronUp size={16} color="#78716c" /> : <ChevronDown size={16} color="#78716c" />}
      </button>

      {open && (
        <div style={{ padding:"0 1.125rem 1rem", display:"flex", flexDirection:"column", gap:"0.875rem" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"0.75rem" }}>
            {[
              { n:"1", icon:"📷", title:"Carregue a(s) foto(s)", desc:"Arraste uma ou várias fotos do mesmo produto de uma vez. Cada foto será processada individualmente na mesma sessão." },
              { n:"2", icon:"✨", title:"IA classifica automaticamente", desc:"O Claude Vision analisa a imagem e preenche categoria, ângulo, material, cor e descrição. Informe SKU e nome para aumentar a precisão." },
              { n:"3", icon:"💾", title:"Revise e salve", desc:"Confira os dados sugeridos, corrija o que precisar e salve. Para múltiplas fotos, o sistema avança automaticamente para a próxima." },
            ].map(s => (
              <div key={s.n} style={{ background:"white", border:"1px solid #e7e5e4", borderRadius:8, padding:"0.875rem", display:"flex", flexDirection:"column", gap:"0.375rem" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"0.5rem", marginBottom:"0.25rem" }}>
                  <span style={{ background:"#111111", color:"white", width:20, height:20, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.7rem", fontWeight:700, flexShrink:0 }}>{s.n}</span>
                  <span style={{ fontSize:"1.1rem" }}>{s.icon}</span>
                  <strong style={{ fontSize:"0.8rem" }}>{s.title}</strong>
                </div>
                <p style={{ fontSize:"0.78rem", color:"#78716c", lineHeight:1.55, margin:0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ background:"#fffbeb", border:"1px solid #fde68a", borderRadius:8, padding:"0.75rem 1rem", fontSize:"0.8rem", color:"#92400e", display:"flex", gap:"0.5rem" }}>
            <span style={{ flexShrink:0 }}>💡</span>
            <span><strong>Dica multi-ângulo:</strong> Para o mesmo produto, arraste todas as fotos (frontal, lateral, detalhe…) de uma vez. O SKU e o nome informados serão aproveitados em todas as fotos da fila automaticamente.</span>
          </div>
          <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:8, padding:"0.75rem 1rem", fontSize:"0.8rem", color:"#166534", display:"flex", gap:"0.5rem" }}>
            <span style={{ flexShrink:0 }}>📦</span>
            <span><strong>Cadastro em lote?</strong> Para importar dezenas de produtos de uma vez, use o <strong>Importar em Lote</strong> — basta preparar um arquivo ZIP com as fotos organizadas por SKU.</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NovoProdutoPage() {
  const fileRef = useRef<HTMLInputElement>(null);

  // Queue de fotos do mesmo produto
  const [fileQueue,    setFileQueue]    = useState<File[]>([]);
  const [queueIdx,     setQueueIdx]     = useState(0);
  const [previews,     setPreviews]     = useState<string[]>([]);

  const [drag,         setDrag]         = useState(false);
  const [step,         setStep]         = useState<Step>(1);
  const [aiResult,     setAiResult]     = useState<ClassificacaoIA | null>(null);
  const [classifying,  setClassifying]  = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [savedCount,   setSavedCount]   = useState(0);
  const [error,        setError]        = useState("");

  // Hints compartilhados entre fotos da fila
  const [skuHint,  setSkuHint]  = useState("");
  const [catHint,  setCatHint]  = useState<string>("auto");
  const [nomeHint, setNomeHint] = useState("");

  const [form, setForm] = useState<ClassificacaoIA>({});
  const upd = (k: keyof ClassificacaoIA, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const currentFile    = fileQueue[queueIdx] ?? null;
  const currentPreview = previews[queueIdx]  ?? null;
  const isMulti        = fileQueue.length > 1;
  const isLastInQueue  = queueIdx >= fileQueue.length - 1;

  function handleFiles(raw: FileList | File[]) {
    const files = Array.from(raw).filter(f => {
      if (f.size > 10 * 1024 * 1024) { setError(`"${f.name}" excede 10MB e foi ignorado.`); return false; }
      return true;
    });
    if (files.length === 0) return;
    const urls = files.map(f => URL.createObjectURL(f));
    setFileQueue(files);
    setQueueIdx(0);
    setPreviews(urls);
    setStep(2);
    setError("");
    setAiResult(null);
    setSavedCount(0);
    setForm({});
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDrag(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  }, []);

  async function classify() {
    if (!currentFile) return;
    setClassifying(true); setError("");
    try {
      const fd = new FormData();
      fd.append("file", currentFile);
      fd.append("arquivo_original", currentFile.name);
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

  function advanceQueue() {
    const next = queueIdx + 1;
    if (next < fileQueue.length) {
      setQueueIdx(next);
      setStep(2);
      setAiResult(null);
      setForm({});
      setError("");
    } else {
      // Fila concluída — resetar tudo
      setFileQueue([]); setPreviews([]); setQueueIdx(0);
      setStep(1); setAiResult(null); setForm({});
      setSkuHint(""); setCatHint("auto"); setNomeHint("");
      setError("");
    }
  }

  async function save() {
    if (!form.sku?.trim())         { setError("SKU obrigatório.");  return; }
    if (!form.nome_produto?.trim()) { setError("Nome obrigatório."); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/produtos", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setSavedCount(c => c + 1);
      // Avançar fila após breve feedback
      setTimeout(advanceQueue, isMulti ? 1200 : 2500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  // Estado de "foto salva, avançando"
  const justSaved = saving === false && savedCount > 0 && step === 3 && !form.sku;

  return (
    <AppLayout>
      <div className="topbar">
        <h1 className="page-title">Novo Produto</h1>
        <Link href="/novo/bulk" className="btn btn-gold" style={{ fontWeight: 600, letterSpacing: "0.02em" }}>
          <Package size={15} />
          Importar em Lote
        </Link>
      </div>

      <div className="page-content" style={{ maxWidth: 900 }}>
        <HowItWorks />

        {/* Steps indicator */}
        <div className="steps">
          {([["1","Upload da foto"], ["2","Classificar com IA"], ["3","Revisar e salvar"]] as const).map(([n, label]) => (
            <div key={n} className={`step ${step === +n ? "active" : step > +n ? "done" : ""}`}>
              <div className="step-num">{step > +n ? "✓" : n}</div>
              {label}
            </div>
          ))}
        </div>

        {/* Indicador de fila */}
        {isMulti && step >= 2 && (
          <div style={{ display:"flex", alignItems:"center", gap:"0.625rem", marginBottom:"1rem", padding:"0.625rem 1rem", background:"#f0f9ff", border:"1px solid #bae6fd", borderRadius:8, fontSize:"0.82rem", color:"#0369a1" }}>
            <Images size={15} />
            <strong>Foto {queueIdx + 1} de {fileQueue.length}</strong>
            <span style={{ color:"#0284c7" }}>·</span>
            <span>{fileQueue.length - queueIdx - 1} restante{fileQueue.length - queueIdx - 1 !== 1 ? "s" : ""}</span>
            {savedCount > 0 && <span style={{ marginLeft:"auto", color:"#16a34a", fontWeight:600 }}>✅ {savedCount} salva{savedCount !== 1 ? "s" : ""}</span>}
            {/* Thumbnails strip */}
            <div style={{ display:"flex", gap:"0.25rem", marginLeft:"auto" }}>
              {previews.map((p, i) => (
                <div key={i} style={{ width:28, height:28, borderRadius:4, overflow:"hidden", border: i === queueIdx ? "2px solid #0369a1" : i < queueIdx ? "2px solid #16a34a" : "2px solid #e0f2fe", flexShrink:0, position:"relative" }}>
                  <img src={p} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  {i < queueIdx && <div style={{ position:"absolute", inset:0, background:"rgba(22,163,74,0.45)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.65rem" }}>✓</div>}
                </div>
              ))}
            </div>
          </div>
        )}

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
            <p style={{ fontSize:"1rem", fontWeight:500, marginBottom:6 }}>Clique ou arraste as fotos aqui</p>
            <p className="upload-zone-text">Arraste <strong>uma ou várias fotos</strong> do mesmo produto · JPG, PNG, WEBP · Máx. 10MB cada</p>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              style={{ display:"none" }}
              onChange={e => { if (e.target.files?.length) handleFiles(e.target.files); }}
            />
          </div>
        )}

        {/* STEP 2 e 3 */}
        {step >= 2 && currentFile && (
          <div style={{ display:"grid", gridTemplateColumns:"280px 1fr", gap:"1.5rem" }}>
            {/* Preview */}
            <div>
              <img src={currentPreview!} alt="Preview" style={{ width:"100%", borderRadius:8, border:"1px solid #e7e5e4" }} />
              <p style={{ fontSize:"0.75rem", color:"#78716c", marginTop:"0.5rem", textAlign:"center" }}>{currentFile.name} · {(currentFile.size/1024).toFixed(0)}KB</p>
              {step === 2 && (
                <button className="btn btn-ghost btn-sm btn-full" style={{ marginTop:"0.75rem" }}
                  onClick={() => { setFileQueue([]); setPreviews([]); setQueueIdx(0); setStep(1); setError(""); }}>
                  Trocar foto{isMulti ? "s" : ""}
                </button>
              )}
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
              {step === 2 && (
                <>
                  <div>
                    <h3 style={{ fontFamily:"var(--font-display)", fontSize:"1.1rem", marginBottom:"0.25rem" }}>Dê uma dica para a IA</h3>
                    <p style={{ fontSize:"0.8rem", color:"#78716c" }}>
                      {isMulti ? "As dicas abaixo serão usadas em todas as fotos da fila." : "Opcional — quanto mais info, mais precisa a classificação"}
                    </p>
                  </div>

                  <div className="input-group">
                    <label className="input-label">SKU / Código</label>
                    <input className="input-field" placeholder="ex: LBG100IPANEMA" value={skuHint} onChange={e => setSkuHint(e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Categoria</label>
                    <select className="input-field" value={catHint} onChange={e => setCatHint(e.target.value)}>
                      <option value="auto">— IA decide automaticamente —</option>
                      {CATEGORIAS.map(c => <option key={c} value={c} style={{ textTransform:"capitalize" }}>{c}</option>)}
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
                    <p style={{ fontSize:"0.8rem", color:"#78716c", textAlign:"center" }}>
                      Claude Vision está analisando a foto — aguarde alguns segundos...
                    </p>
                  )}
                </>
              )}

              {/* STEP 3 — Revisão */}
              {step === 3 && (
                <>
                  {justSaved ? (
                    <div className="alert alert-success" style={{ padding:"1.5rem", justifyContent:"center", flexDirection:"column", textAlign:"center", gap:"0.5rem" }}>
                      <CheckCircle size={32} color="#16a34a" />
                      <strong style={{ fontSize:"1.1rem" }}>Salvo!</strong>
                      {isMulti && !isLastInQueue && <span style={{ fontSize:"0.85rem" }}>Carregando próxima foto...</span>}
                      {(!isMulti || isLastInQueue) && <span style={{ fontSize:"0.85rem" }}>Pronto para o próximo cadastro</span>}
                    </div>
                  ) : (
                    <>
                      <div>
                        <h3 style={{ fontFamily:"var(--font-display)", fontSize:"1.1rem", marginBottom:"0.25rem" }}>✅ IA classificou! Revise e salve</h3>
                        <p style={{ fontSize:"0.8rem", color:"#78716c" }}>Corrija qualquer campo se necessário</p>
                      </div>

                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.875rem" }}>
                        <div className="input-group" style={{ gridColumn:"1/-1" }}>
                          <label className="input-label">SKU *</label>
                          <input className="input-field" value={form.sku ?? ""} onChange={e => upd("sku", e.target.value)} />
                        </div>
                        <div className="input-group" style={{ gridColumn:"1/-1" }}>
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
                          <label className="input-label">Fundo</label>
                          <select className="input-field" value={form.fundo ?? ""} onChange={e => upd("fundo", e.target.value)}>
                            {FUNDOS.map(f => <option key={f} value={f}>{f}</option>)}
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
                        <div className="input-group" style={{ gridColumn:"1/-1" }}>
                          <label className="input-label">Tags (separe por vírgula)</label>
                          <input className="input-field"
                            value={Array.isArray(form.tags) ? form.tags.join(", ") : ""}
                            onChange={e => upd("tags", e.target.value.split(",").map(t => t.trim()).filter(Boolean))}
                          />
                        </div>
                        <div className="input-group" style={{ gridColumn:"1/-1" }}>
                          <label className="input-label">Descrição para catálogo</label>
                          <textarea className="input-field" value={form.descricao_marketing ?? ""} onChange={e => upd("descricao_marketing", e.target.value)} />
                        </div>
                        <div className="input-group" style={{ gridColumn:"1/-1" }}>
                          <label style={{ display:"flex", alignItems:"center", gap:"0.5rem", cursor:"pointer", fontSize:"0.875rem" }}>
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
                            <ul style={{ paddingLeft:"1rem", marginTop:4 }}>
                              {form.problemas_foto.map(p => <li key={p} style={{ fontSize:"0.85rem" }}>{p}</li>)}
                            </ul>
                          </div>
                        </div>
                      )}

                      {error && <div className="alert alert-error"><span>⚠️</span>{error}</div>}

                      <div style={{ display:"flex", gap:"0.75rem" }}>
                        <button className="btn btn-primary btn-lg" style={{ flex:1 }} onClick={save} disabled={saving}>
                          <Save size={16} />
                          {saving ? "Salvando..." : isMulti && !isLastInQueue ? `Salvar e ir para foto ${queueIdx + 2}` : "Salvar no catálogo"}
                        </button>
                        {isMulti && !isLastInQueue && (
                          <button className="btn btn-outline btn-lg" onClick={advanceQueue} title="Pular esta foto">
                            Pular
                          </button>
                        )}
                      </div>
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
