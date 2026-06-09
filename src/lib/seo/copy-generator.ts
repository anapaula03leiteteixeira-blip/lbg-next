import Anthropic from '@anthropic-ai/sdk';
import type { KeywordInfo } from '@/types';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const SYSTEM_PROMPT = `Você é especialista em SEO e copywriting para e-commerce brasileiro de louças e metais sanitários premium.
Marca: La Bella Griffe — produtos de origem italiana, porcelana vitrificada de alta resistência, posicionamento premium.

Tom de voz La Bella Griffe:
- Inspirador, sofisticado, próximo
- Vocabulário do universo design e arquitetura (NUNCA "decoração genérica")
- NUNCA use: "decoração", "luxo acessível", "bom preço", "custo-benefício"
- SEMPRE foque em: experiência, estética, durabilidade, design italiano

Responda APENAS com JSON válido, sem texto adicional.`;

interface ProdutoInput {
  sku:                  string;
  nome_produto:         string;
  categoria:            string;
  subcategoria?:        string | null;
  cor_dominante?:       string | null;
  material_aparente?:   string | null;
  tags?:                string[] | null;
  descricao_marketing?: string | null;
  descricao_tecnica?:   string | null;
}

export interface SeoOutput {
  nuvemshop_title:       string;
  nuvemshop_description: string;
  meta_title:            string;
  meta_description:      string;
  alt_text:              string;
  keywords:              string[];
  nuvemshop_copy: {
    titulo:    string;
    descricao: string;
  };
}

function buildPrompt(produto: ProdutoInput, keywords: KeywordInfo[]): string {
  const kwList = keywords.map(k => `"${k.keyword}" (vol: ${k.volume}/mês, dificuldade SEO: ${k.sd})`).join('\n');
  const ctx = [
    `SKU: ${produto.sku}`,
    `Produto: ${produto.nome_produto}`,
    `Categoria: ${produto.categoria}`,
    produto.subcategoria    ? `Subcategoria: ${produto.subcategoria}`          : null,
    produto.cor_dominante   ? `Cor/Acabamento: ${produto.cor_dominante}`       : null,
    produto.material_aparente ? `Material: ${produto.material_aparente}`       : null,
    produto.tags?.length    ? `Tags: ${produto.tags.join(', ')}`               : null,
    produto.descricao_marketing ? `Descrição: ${produto.descricao_marketing}`  : null,
    produto.descricao_tecnica   ? `Ficha técnica: ${produto.descricao_tecnica}` : null,
  ].filter(Boolean).join('\n');

  return `${ctx}

Keywords SEO da categoria (use as de maior volume no título e descrição):
${kwList}

Gere SEO completo para este produto. JSON:
{
  "nuvemshop_title": "título da página — máx 255 chars — keyword principal + dimensão/acabamento + marca La Bella Griffe",
  "nuvemshop_description": "descrição HTML completa para página do produto — use <p>, <ul>, <li> — inclua benefícios, specs, CTA — 300-600 chars",
  "meta_title": "MÁXIMO 70 CHARS — keyword principal no início — para Google snippet",
  "meta_description": "MÁXIMO 160 CHARS — resume o produto com keyword + benefício + CTA — para Google snippet",
  "alt_text": "MÁXIMO 125 CHARS — descreve a imagem para acessibilidade e SEO — inclui produto + cor + marca",
  "keywords": ["array com as 5 keywords mais relevantes para este produto"],
  "nuvemshop_copy": {
    "titulo": "título curto e impactante para o card do catálogo — máx 120 chars",
    "descricao": "descrição do card — 2-3 frases — elegante, foco em design e qualidade — máx 300 chars"
  }
}`;
}

function truncate(s: string | undefined | null, max: number): string {
  return (s ?? '').slice(0, max);
}

export async function generateSeoCopy(produto: ProdutoInput, keywords: KeywordInfo[]): Promise<SeoOutput> {
  const prompt = buildPrompt(produto, keywords);

  const res = await anthropic.messages.create(
    {
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
    },
    { signal: AbortSignal.timeout(45_000) },
  );

  const first = res.content[0];
  if (!first || first.type !== 'text') throw new Error('Resposta vazia do modelo');

  let raw = first.text.trim();
  raw = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();

  const parsed = JSON.parse(raw) as SeoOutput;

  return {
    nuvemshop_title:       truncate(parsed.nuvemshop_title, 255),
    nuvemshop_description: parsed.nuvemshop_description ?? '',
    meta_title:            truncate(parsed.meta_title, 70),
    meta_description:      truncate(parsed.meta_description, 160),
    alt_text:              truncate(parsed.alt_text, 125),
    keywords:              (parsed.keywords ?? []).slice(0, 10),
    nuvemshop_copy: {
      titulo:    truncate(parsed.nuvemshop_copy?.titulo, 255),
      descricao: truncate(parsed.nuvemshop_copy?.descricao, 300),
    },
  };
}
