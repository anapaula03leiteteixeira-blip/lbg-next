"use client";
import { useState, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import type { Produto } from "@/types";

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.625rem" }}>
      <div style={{ width: 100, fontSize: "0.75rem", color: "#78716c", textTransform: "capitalize", textAlign: "right", flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1, background: "#f5f5f4", borderRadius: 4, height: 24, overflow: "hidden" }}>
        <div style={{ width: `${Math.max(2, (value / max) * 100)}%`, background: color, height: "100%", borderRadius: 4, transition: "width 0.6s ease", display: "flex", alignItems: "center", paddingLeft: 8 }}>
          <span style={{ fontSize: "0.7rem", color: "white", fontWeight: 600, whiteSpace: "nowrap" }}>{value}</span>
        </div>
      </div>
    </div>
  );
}

export default function RelatorioPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    fetch("/api/produtos").then(r => r.json()).then(d => { setProdutos(d); setLoading(false); });
  }, []);

  if (loading) return (
    <AppLayout>
      <div className="topbar"><h1 className="page-title">Relatório</h1></div>
      <div className="page-content" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
        <p style={{ color: "#78716c" }}>Carregando dados...</p>
      </div>
    </AppLayout>
  );

  // Fotos = todas as imagens (sum de imagens[] por produto)
  const todasImagens: import("@/types").ProdutoImagem[] = produtos.flatMap(p => p.imagens ?? []);
  const total     = todasImagens.length;
  const skus      = produtos.length;
  const revisao   = produtos.filter(p => p.precisa_revisao).length;
  const excelente = todasImagens.filter(i => i.qualidade_foto === "excelente").length;

  // Contagens
  const byCat  = Object.entries(produtos.reduce((acc, p) => { acc[p.categoria] = (acc[p.categoria]??0)+1; return acc; }, {} as Record<string,number>)).sort((a,b)=>b[1]-a[1]);
  const byQual = (["excelente","boa","regular","ruim"] as const).map(q => [q, todasImagens.filter(i=>i.qualidade_foto===q).length] as [string,number]).filter(([,v])=>v>0);
  const byAng  = Object.entries(todasImagens.reduce((acc, i) => { if(i.angulo){acc[i.angulo]=(acc[i.angulo]??0)+1;} return acc; }, {} as Record<string,number>)).sort((a,b)=>b[1]-a[1]);
  const topSku = Object.entries(produtos.reduce((acc, p) => { acc[p.sku]=(p.imagens?.length??1); return acc; }, {} as Record<string,number>)).sort((a,b)=>b[1]-a[1]).slice(0,10);

  const maxCat  = Math.max(...byCat.map(([,v])=>v),  1);
  const maxQual = Math.max(...byQual.map(([,v])=>v), 1);
  const maxAng  = Math.max(...byAng.map(([,v])=>v),  1);
  const maxSku  = Math.max(...topSku.map(([,v])=>v),  1);

  const QUAL_COLORS: Record<string,string> = { excelente:"#16a34a", boa:"#2563eb", regular:"#ca8a04", ruim:"#dc2626" };
  const CAT_COLORS = ["#b45309","#1c1917","#44403c","#78716c","#a8a29e","#d6d3d1"];

  const revisao_df = produtos.filter(p => p.precisa_revisao);

  return (
    <AppLayout>
      <div className="topbar"><h1 className="page-title">Relatório</h1></div>
      <div className="page-content">

        {/* Métricas */}
        <div className="metrics-grid">
          {[["Total de fotos", total], ["Produtos (SKUs)", skus], ["Qualidade excelente", excelente], ["Para revisão", revisao]].map(([l,v]) => (
            <div className="metric-card" key={l as string}>
              <div className="metric-label">{l}</div>
              <div className="metric-value">{v}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
          {/* Por Categoria */}
          <div style={{ background: "white", border: "1px solid #e7e5e4", borderRadius: 8, padding: "1.25rem" }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", marginBottom: "1rem" }}>Por Categoria</h3>
            {byCat.map(([cat, n], i) => <Bar key={cat} label={cat} value={n} max={maxCat} color={CAT_COLORS[i % CAT_COLORS.length]} />)}
          </div>

          {/* Por Qualidade */}
          <div style={{ background: "white", border: "1px solid #e7e5e4", borderRadius: 8, padding: "1.25rem" }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", marginBottom: "1rem" }}>Por Qualidade</h3>
            {byQual.map(([q, n]) => <Bar key={q} label={q} value={n} max={maxQual} color={QUAL_COLORS[q] ?? "#a8a29e"} />)}
          </div>

          {/* Por Ângulo */}
          <div style={{ background: "white", border: "1px solid #e7e5e4", borderRadius: 8, padding: "1.25rem" }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", marginBottom: "1rem" }}>Por Ângulo</h3>
            {byAng.map(([a, n]) => <Bar key={a} label={a} value={n} max={maxAng} color="#44403c" />)}
          </div>

          {/* Top SKUs */}
          <div style={{ background: "white", border: "1px solid #e7e5e4", borderRadius: 8, padding: "1.25rem" }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", marginBottom: "1rem" }}>Top 10 SKUs com mais fotos</h3>
            {topSku.map(([sku, n]) => <Bar key={sku} label={sku} value={n} max={maxSku} color="#b45309" />)}
          </div>
        </div>

        {/* Lista de revisão */}
        <div style={{ background: "white", border: "1px solid #e7e5e4", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #e7e5e4", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem" }}>⚠️ Aguardando Revisão</h3>
            {revisao_df.length > 0 && (
              <a
                href={`data:text/csv;charset=utf-8,${encodeURIComponent(["sku","nome_produto","categoria","qualidade_foto"].join(",") + "\n" + revisao_df.map(p=>[p.sku,p.nome_produto,p.categoria,p.qualidade_foto].join(",")).join("\n"))}`}
                download="revisao.csv"
                className="btn btn-outline btn-sm"
              >📥 Exportar</a>
            )}
          </div>
          {revisao_df.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#16a34a" }}>
              ✅ Nenhum produto aguardando revisão!
            </div>
          ) : (
            <table className="data-table">
              <thead><tr>{["SKU","Nome","Categoria","Qualidade"].map(h=><th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {revisao_df.map(p => (
                  <tr key={p.sku}>
                    <td><code style={{ fontSize: "0.8rem" }}>{p.sku}</code></td>
                    <td>{p.nome_produto}</td>
                    <td style={{ textTransform: "capitalize" }}>{p.categoria}</td>
                    <td>{p.qualidade_foto ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
