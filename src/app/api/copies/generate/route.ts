import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseServer } from "@/lib/supabase";
import { getAuthUser } from "@/lib/get-auth-user";
import type { Plataforma } from "@/types";
import { COPY_LIMITS } from "@/types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const PLATAFORMAS: Plataforma[] = ["amazon", "mercado_livre", "shopee", "leroy_merlin", "madeira_madeira"];

interface ProdutoDB {
  sku: string;
  nome_produto: string;
  categoria: string;
  subcategoria?: string | null;
  cor_dominante?: string | null;
  material_aparente?: string | null;
  tags?: string[] | null;
  descricao_marketing: string;
  descricao_tecnica?: string | null;
}

function contextoBase(p: ProdutoDB): string {
  return [
    `Marca: La Bella Griffe`,
    `Produto: ${p.nome_produto}`,
    `Categoria: ${p.categoria}`,
    p.subcategoria      ? `Subcategoria: ${p.subcategoria}`                       : null,
    p.cor_dominante     ? `Cor/Acabamento: ${p.cor_dominante}`                    : null,
    p.material_aparente ? `Material: ${p.material_aparente}`                      : null,
    p.tags?.length      ? `Tags: ${p.tags.join(", ")}`                            : null,
    `Descrição marketing: ${p.descricao_marketing}`,
    p.descricao_tecnica ? `Descrição técnica: ${p.descricao_tecnica}`             : null,
  ].filter(Boolean).join("\n");
}

function buildPrompt(plataforma: Plataforma, p: ProdutoDB): string {
  const ctx = contextoBase(p);
  switch (plataforma) {
    case "amazon":
      return `${ctx}\n\nGere um listing otimizado para Amazon Brasil. Responda APENAS em JSON válido:\n{"titulo":"≤200 chars, marca+produto+material+diferencial, palavras-chave no início","bullets":["BENEFÍCIO EM MAIÚSCULA: detalhe ≤255 chars","...x5"],"descricao":"HTML com <p><ul><li>, ≤2000 chars, tom persuasivo e técnico","palavras_chave":["5-10 termos de busca backend"]}`;
    case "mercado_livre":
      return `${ctx}\n\nGere listing para Mercado Livre Brasil. Responda APENAS em JSON válido:\n{"titulo":"≤60 chars, direto: Marca+produto+material, sem emojis","descricao":"≤4000 chars, atributos técnicos+diferenciais+aplicação+garantia","palavras_chave":["5-8 termos"]}`;
    case "shopee":
      return `${ctx}\n\nGere listing para Shopee Brasil. Responda APENAS em JSON válido:\n{"titulo":"≤120 chars com 3-5 emojis relevantes (💧🚿🏠✨🛁), tom informal e atraente","descricao":"≤3000 chars, repita palavras-chave 3-4x naturalmente, emojis no início dos parágrafos","palavras_chave":["5-8 termos"]}`;
    case "leroy_merlin":
      return `${ctx}\n\nGere listing para Leroy Merlin Brasil. Responda APENAS em JSON válido:\n{"titulo":"≤100 chars, técnico e objetivo","bullets":["Especificação: valor (ex: Material: louça vitrificada)","...até 10 itens: dimensões, material, acabamento, aplicação, garantia"],"descricao":"≤1000 chars, técnico e preciso, norma ABNT se aplicável","palavras_chave":["5-8 termos técnicos"]}`;
    case "madeira_madeira":
      return `${ctx}\n\nGere listing para MadeiraMadeira. Responda APENAS em JSON válido:\n{"titulo":"≤150 chars, inclua dimensões e material se disponíveis","descricao":"≤2000 chars, foco em ambiente de uso, dimensões exatas, material, acabamento e instalação","palavras_chave":["5-8 termos"]}`;
  }
}

interface CopyRaw {
  titulo?: string;
  bullets?: string[];
  descricao?: string;
  palavras_chave?: string[];
}

async function gerarCopy(plataforma: Plataforma, p: ProdutoDB): Promise<CopyRaw> {
  const prompt = buildPrompt(plataforma, p);
  const res = await anthropic.messages.create(
    {
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
    },
    { signal: AbortSignal.timeout(30_000) },
  );

  const first = res.content[0];
  if (!first || first.type !== "text") throw new Error("Resposta vazia");

  let raw = first.text.trim();
  raw = raw.replace(/^```(?:json)?\s*/m, "").replace(/\s*```$/m, "").trim();
  return JSON.parse(raw) as CopyRaw;
}

function truncar(s: string | undefined, max: number): string {
  return (s ?? "").slice(0, max);
}

// POST /api/copies/generate — gera (ou re-gera) os 5 copies de um SKU
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (user.role === "viewer") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const body = await req.json() as { sku?: string };
  const sku  = (body.sku ?? "").trim().toUpperCase();
  if (!sku) return NextResponse.json({ error: "sku obrigatório" }, { status: 400 });

  const sb = supabaseServer();
  const { data: produto } = await sb
    .from("produtos")
    .select("sku, nome_produto, categoria, subcategoria, cor_dominante, material_aparente, tags, descricao_marketing, descricao_tecnica")
    .eq("sku", sku)
    .single();

  if (!produto) return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
  const p = produto as ProdutoDB;
  if (!p.descricao_marketing) {
    return NextResponse.json({ error: "Produto sem descricao_marketing — execute o script enrich-marketing primeiro" }, { status: 422 });
  }

  const results = await Promise.allSettled(
    PLATAFORMAS.map(async (plat) => {
      const raw    = await gerarCopy(plat, p);
      const limits = COPY_LIMITS[plat];
      const titulo = truncar(raw.titulo, limits.titulo);
      const descricao = truncar(raw.descricao, limits.descricao);
      const bullets = limits.bullets
        ? (raw.bullets ?? []).slice(0, limits.bullets.count).map(b => b.slice(0, limits.bullets!.chars))
        : null;

      const { error } = await sb.from("produto_copies").upsert(
        { sku, plataforma: plat, titulo, bullets, descricao, palavras_chave: raw.palavras_chave ?? [], atualizado_em: new Date().toISOString() },
        { onConflict: "sku,plataforma" },
      );
      if (error) throw new Error(error.message);
      return { plataforma: plat, titulo, bullets, descricao, palavras_chave: raw.palavras_chave };
    })
  );

  const copies = results
    .filter(r => r.status === "fulfilled")
    .map(r => (r as PromiseFulfilledResult<{ plataforma: Plataforma; titulo: string; bullets: string[] | null; descricao: string; palavras_chave: string[] }>).value);

  const errors = results
    .filter(r => r.status === "rejected")
    .map(r => (r as PromiseRejectedResult).reason instanceof Error
      ? (r as PromiseRejectedResult).reason.message
      : String((r as PromiseRejectedResult).reason));

  return NextResponse.json({ sku, copies, errors });
}
