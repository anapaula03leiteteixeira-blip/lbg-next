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
  descricao_marketing: string | null;
  descricao_tecnica?: string | null;
}

function contextoBase(p: ProdutoDB): string {
  return [
    `Marca: La Bella Griffe — louças e metais sanitários de origem italiana. Fabricados com porcelana vitrificada de alta resistência. Posicionamento: qualidade premium a preço acessível. Garantia de fábrica. Distribuição nacional.`,
    `Produto: ${p.nome_produto}`,
    `Categoria: ${p.categoria}`,
    p.subcategoria      ? `Subcategoria: ${p.subcategoria}`                       : null,
    p.cor_dominante     ? `Cor/Acabamento: ${p.cor_dominante}`                    : null,
    p.material_aparente ? `Material: ${p.material_aparente}`                      : null,
    p.tags?.length      ? `Tags: ${p.tags.join(", ")}`                            : null,
    p.descricao_marketing ? `Descrição marketing: ${p.descricao_marketing}`       : null,
    p.descricao_tecnica ? `Descrição técnica: ${p.descricao_tecnica}`             : null,
  ].filter(Boolean).join("\n");
}

function buildPrompt(plataforma: Plataforma, p: ProdutoDB): string {
  const ctx = contextoBase(p);
  switch (plataforma) {
    case "mercado_livre":
      return `${ctx}\n\nGere listing para Mercado Livre Brasil. JSON:\n{"titulo":"≤60 chars — [Produto] [material] [cor/acabamento] — sem artigos, sem emojis","descricao":"3-4 frases convertendo quem já está na página: benefícios concretos, dimensões exatas, compatibilidade, facilidade de instalação. Tom direto e confiante.","palavras_chave":["5 termos que compradores digitam no ML — do mais específico ao mais amplo"],"ficha_tecnica_hints":["3 atributos-chave para preencher na ficha técnica ML"]}`;
    case "shopee":
      return `${ctx}\n\nGere listing para Shopee Brasil. JSON:\n{"titulo":"≤58 chars — keyword principal NOS PRIMEIROS 15 CHARS (obrigatório, têm peso 3.2x no algoritmo). Sem keyword stuffing. Tom acessível.","descricao":"2-3 frases curtas — custo-benefício, qualidade, o que o comprador ganha. Tom acessível.","palavras_chave":["5 termos simples de alta intenção, como comprador Shopee buscaria"]}`;
    case "amazon":
      return `${ctx}\n\nGere listing para Amazon Brasil. JSON:\n{"titulo":"150-200 chars — começa com 'La Bella Griffe', inclui produto + material + dimensão + 2 diferenciais","bullets":["MATERIAL PREMIUM: <louça/porcelana vitrificada, resistência, acabamento>","DIMENSÕES EXATAS: <medidas para instalação sem surpresas>","INSTALAÇÃO FÁCIL: <compatibilidade, instruções, o que vem na caixa>","DESIGN ITALIANO: <estética, linha, combinação com outros produtos La Bella>","GARANTIA E QUALIDADE: <durabilidade, marca, suporte pós-venda>"],"descricao":"HTML com <p><ul><li> ≤2000 chars. Responde perguntas do comprador, quebra objeções, conduz à compra.","palavras_chave":["5-8 termos incluindo variações técnicas e sinônimos"],"backend_keywords":"string corrida com sinônimos variações de busca sem vírgula sem repetição"}`;
    case "leroy_merlin":
      return `${ctx}\n\nGere listing para Leroy Merlin Brasil (perfil: reformador, profissional ou DIY). JSON:\n{"titulo":"80-120 chars — produto + material + dimensão + contexto de uso em reforma","descricao":"≤280 chars (LIMITE DA PLATAFORMA) — specs técnicas, compatibilidade, contexto de reforma, facilidade de instalação","palavras_chave":["5 termos com foco em reforma, instalação, compatibilidade"],"ficha_tecnica_hints":["3 atributos técnicos prioritários para Leroy"]}`;
    case "madeira_madeira":
      return `${ctx}\n\nGere listing para MadeiraMadeira (perfil: decoração + reforma + entrega rápida). JSON:\n{"titulo":"80-120 chars — produto + estilo/design + cor + aplicação no ambiente","descricao":"≤2000 chars — design, qualidade visual, dimensões, como transforma o banheiro. Tom aspiracional mas direto.","palavras_chave":["5 termos com foco em design, ambiente, decoração de banheiro"]}`;
  }
}

interface CopyRaw {
  titulo?: string;
  bullets?: string[];
  descricao?: string;
  palavras_chave?: string[];
  ficha_tecnica_hints?: string[];
  backend_keywords?: string;
}

async function gerarCopy(plataforma: Plataforma, p: ProdutoDB): Promise<CopyRaw> {
  const prompt = buildPrompt(plataforma, p);
  const res = await anthropic.messages.create(
    {
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      system: "Você é um especialista em SEO para e-commerce brasileiro com foco em produtos de banheiro (cubas, torneiras, pastilhas, acessórios sanitários). Gere copies que maximizem visibilidade nas buscas E convertam vendas. Responda APENAS com JSON válido, sem texto adicional.",
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
      return { plataforma: plat, titulo, bullets, descricao, palavras_chave: raw.palavras_chave, ficha_tecnica_hints: raw.ficha_tecnica_hints, backend_keywords: raw.backend_keywords };
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
