import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// ── CLI args ───────────────────────────────────────────────────────────────
const args         = process.argv.slice(2);
const DRY_RUN      = args.includes('--dry-run');
const FORCE        = args.includes('--force');
const ESTIMATE     = args.includes('--estimate');
const skuIdx       = args.indexOf('--sku');
const catIdx       = args.indexOf('--categoria');
const SKU_FILTER   = skuIdx  !== -1 ? args[skuIdx  + 1] ?? null : null;
const CAT_FILTER   = catIdx  !== -1 ? args[catIdx  + 1] ?? null : null;

// ── Constants ──────────────────────────────────────────────────────────────
const BATCH_SIZE     = 5;
const BATCH_DELAY_MS = 2_000;  // 2s entre batches — respeita rate limit Anthropic
const MODEL          = 'claude-sonnet-4-6';

// Custo estimado Claude Sonnet 4.6: $3/1M input + $15/1M output
const COST_IN  = 3  / 1_000_000;
const COST_OUT = 15 / 1_000_000;
const EST_IN   = 700;
const EST_OUT  = 400;

// ── Keyword map (inline para script standalone) ────────────────────────────
interface KwInfo { keyword: string; volume: number; sd: number; cpc: number }

const KEYWORD_MAP: Record<string, KwInfo[]> = {
  cuba: [
    { keyword: 'cuba inox cozinha',     volume: 8100, sd: 46, cpc: 1.14 },
    { keyword: 'cuba de embutir',        volume: 5400, sd: 13, cpc: 1.04 },
    { keyword: 'cuba gourmet inox',      volume:  590, sd: 44, cpc: 1.90 },
  ],
  pastilha: [
    { keyword: 'pastilha de vidro',      volume: 6600, sd: 35, cpc: 0.90 },
    { keyword: 'pastilha de piscina',    volume: 4400, sd: 28, cpc: 1.20 },
    { keyword: 'revestimento pastilha',  volume: 2900, sd: 22, cpc: 0.75 },
  ],
  porcelanato: [
    { keyword: 'porcelanato retificado', volume: 9900, sd: 52, cpc: 1.50 },
    { keyword: 'porcelanato externo',    volume: 4400, sd: 40, cpc: 1.20 },
  ],
  torneira: [
    { keyword: 'torneira cozinha inox',  volume: 5400, sd: 42, cpc: 2.10 },
    { keyword: 'torneira monocomando',   volume: 4800, sd: 38, cpc: 1.80 },
    { keyword: 'torneira gourmet',       volume: 1900, sd: 25, cpc: 1.60 },
  ],
  revestimento: [
    { keyword: 'revestimento parede banheiro', volume: 5900, sd: 45, cpc: 1.00 },
    { keyword: 'revestimento externo fachada', volume: 3200, sd: 38, cpc: 1.15 },
  ],
  acessorio: [
    { keyword: 'acessorio banheiro inox', volume: 2400, sd: 28, cpc: 1.20 },
    { keyword: 'papeleira inox',          volume: 1800, sd: 20, cpc: 0.95 },
    { keyword: 'saboneteira inox',        volume: 1600, sd: 18, cpc: 0.90 },
  ],
  sanitario: [
    { keyword: 'vaso sanitario',          volume: 22000, sd: 58, cpc: 2.50 },
    { keyword: 'bacia sanitaria',         volume:  4400, sd: 40, cpc: 2.00 },
  ],
  outro: [
    { keyword: 'louças sanitarias',       volume: 2200, sd: 30, cpc: 1.00 },
    { keyword: 'metais sanitarios',       volume: 1800, sd: 25, cpc: 0.90 },
  ],
};

function getKeywords(categoria: string): KwInfo[] {
  return KEYWORD_MAP[categoria.toLowerCase()] ?? KEYWORD_MAP['outro'];
}

// ── Clients ────────────────────────────────────────────────────────────────
function initClients() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const sbUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!apiKey) { console.error('❌ ANTHROPIC_API_KEY ausente em .env.local');        process.exit(1); }
  if (!sbUrl)  { console.error('❌ NEXT_PUBLIC_SUPABASE_URL ausente em .env.local'); process.exit(1); }
  if (!sbKey)  { console.error('❌ SUPABASE_SERVICE_ROLE_KEY ausente em .env.local'); process.exit(1); }

  return {
    anthropic: new Anthropic({ apiKey }),
    sb: createClient(sbUrl, sbKey),
  };
}

// ── Types ──────────────────────────────────────────────────────────────────
interface Produto {
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

interface SeoOutput {
  nuvemshop_title:       string;
  nuvemshop_description: string;
  meta_title:            string;
  meta_description:      string;
  alt_text:              string;
  keywords:              string[];
  nuvemshop_copy:        { titulo: string; descricao: string };
}

// ── Helpers ────────────────────────────────────────────────────────────────
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function truncate(s: string | undefined | null, max: number): string {
  return (s ?? '').slice(0, max);
}

async function generateSeo(anthropic: Anthropic, produto: Produto): Promise<SeoOutput> {
  const keywords = getKeywords(produto.categoria);
  const kwList = keywords.map(k => `"${k.keyword}" (vol: ${k.volume}/mês, dif. SEO: ${k.sd})`).join('\n');

  const ctx = [
    `SKU: ${produto.sku}`,
    `Produto: ${produto.nome_produto}`,
    `Categoria: ${produto.categoria}`,
    produto.subcategoria    ? `Subcategoria: ${produto.subcategoria}`         : null,
    produto.cor_dominante   ? `Cor/Acabamento: ${produto.cor_dominante}`      : null,
    produto.material_aparente ? `Material: ${produto.material_aparente}`      : null,
    produto.tags?.length    ? `Tags: ${produto.tags.join(', ')}`              : null,
    produto.descricao_marketing ? `Descrição: ${produto.descricao_marketing}` : null,
  ].filter(Boolean).join('\n');

  const prompt = `${ctx}

Keywords SEO da categoria (use as de maior volume):
${kwList}

Gere SEO completo. JSON:
{
  "nuvemshop_title": "título de página — máx 255 chars — keyword principal + dimensão/acabamento + La Bella Griffe",
  "nuvemshop_description": "HTML completo — <p><ul><li> — benefícios, specs, CTA — 300-600 chars",
  "meta_title": "MÁXIMO 70 CHARS — keyword no início — Google snippet",
  "meta_description": "MÁXIMO 160 CHARS — keyword + benefício + CTA — Google snippet",
  "alt_text": "MÁXIMO 125 CHARS — descreve imagem para SEO e acessibilidade",
  "keywords": ["5 keywords mais relevantes"],
  "nuvemshop_copy": {
    "titulo": "título do card — máx 120 chars — impactante e elegante",
    "descricao": "2-3 frases — design, qualidade — máx 300 chars"
  }
}`;

  const res = await anthropic.messages.create(
    {
      model: MODEL,
      max_tokens: 1500,
      system: `Você é especialista em SEO para e-commerce brasileiro de produtos sanitários premium.
Tom La Bella Griffe: inspirador, sofisticado — NUNCA "decoração", "luxo acessível" ou "bom preço".
Responda APENAS com JSON válido.`,
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

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  const { anthropic, sb } = initClients();

  let query = sb
    .from('produtos')
    .select('sku, nome_produto, categoria, subcategoria, cor_dominante, material_aparente, tags, descricao_marketing, descricao_tecnica');

  if (!FORCE) {
    // Buscar apenas produtos SEM seo ainda
    const { data: existingSku } = await sb.from('product_seo').select('sku');
    const enrichedSkus = (existingSku ?? []).map((r: { sku: string }) => r.sku);
    if (enrichedSkus.length > 0) {
      query = query.not('sku', 'in', `(${enrichedSkus.map(s => `"${s}"`).join(',')})`);
    }
  }

  if (SKU_FILTER) query = query.eq('sku', SKU_FILTER.toUpperCase());
  if (CAT_FILTER) query = query.eq('categoria', CAT_FILTER.toLowerCase());

  const { data, error } = await query.order('sku');
  if (error) { console.error('❌ Erro ao buscar produtos:', error.message); process.exit(1); }

  const produtos = (data ?? []) as Produto[];

  if (produtos.length === 0) {
    console.log('✅ Nenhum produto para processar.');
    console.log('   Use --force para re-processar produtos existentes.');
    return;
  }

  const custTotal = produtos.length * (EST_IN * COST_IN + EST_OUT * COST_OUT);
  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║   La Bella Griffe — SEO Enrichment Script     ║');
  console.log('╚═══════════════════════════════════════════════╝');
  console.log(`\n📦 Produtos a processar : ${produtos.length}`);
  console.log(`💰 Custo estimado       : $${custTotal.toFixed(4)} USD`);
  if (DRY_RUN)    console.log('🔍 Modo: DRY-RUN (sem gravação no banco)');
  if (FORCE)      console.log('⚡ Modo: FORCE (re-processa produtos existentes)');
  if (SKU_FILTER) console.log(`🎯 Filtro SKU: ${SKU_FILTER}`);
  if (CAT_FILTER) console.log(`🎯 Filtro categoria: ${CAT_FILTER}`);

  if (ESTIMATE) {
    console.log('\n✅ Estimativa concluída. Execute sem --estimate para processar.\n');
    return;
  }

  const batches: Produto[][] = [];
  for (let i = 0; i < produtos.length; i += BATCH_SIZE) {
    batches.push(produtos.slice(i, i + BATCH_SIZE));
  }

  console.log(`\n⚙️  Processando em ${batches.length} batch(es) de até ${BATCH_SIZE}...\n`);

  let totalOk = 0;
  let totalErros = 0;

  for (let bi = 0; bi < batches.length; bi++) {
    const batch = batches[bi];
    if (bi > 0) {
      process.stdout.write(`⏳ Aguardando ${BATCH_DELAY_MS / 1000}s...\n`);
      await sleep(BATCH_DELAY_MS);
    }

    const results = await Promise.allSettled(
      batch.map(async (produto, idx) => {
        const n      = bi * BATCH_SIZE + idx + 1;
        const prefix = `[${String(n).padStart(3, ' ')}/${produtos.length}] ${produto.sku}`;
        const t0     = Date.now();

        const seo = await generateSeo(anthropic, produto);
        const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

        if (!DRY_RUN) {
          const keywords = getKeywords(produto.categoria);

          const { error: seoErr } = await sb.from('product_seo').upsert(
            {
              sku:                   produto.sku,
              nuvemshop_title:       seo.nuvemshop_title,
              nuvemshop_description: seo.nuvemshop_description,
              meta_title:            seo.meta_title,
              meta_description:      seo.meta_description,
              alt_text:              seo.alt_text,
              keywords:              seo.keywords,
              keyword_data:          keywords,
              enriched_at:           new Date().toISOString(),
              enriched_by:           'cli',
            },
            { onConflict: 'sku' },
          );
          if (seoErr) throw new Error(`product_seo: ${seoErr.message}`);

          const { error: copyErr } = await sb.from('produto_copies').upsert(
            {
              sku:            produto.sku,
              plataforma:     'nuvemshop',
              titulo:         seo.nuvemshop_copy.titulo,
              bullets:        null,
              descricao:      seo.nuvemshop_copy.descricao,
              palavras_chave: seo.keywords,
              atualizado_em:  new Date().toISOString(),
            },
            { onConflict: 'sku,plataforma' },
          );
          if (copyErr) throw new Error(`produto_copies: ${copyErr.message}`);
        }

        const dryTag = DRY_RUN ? ' [dry]' : '';
        console.log(`✅ ${prefix} → OK (${elapsed}s)${dryTag}`);
        if (DRY_RUN) {
          console.log(`   meta_title: "${seo.meta_title}"`);
          console.log(`   keywords:   ${seo.keywords.slice(0, 3).join(', ')}`);
        }
      })
    );

    for (let ri = 0; ri < results.length; ri++) {
      const result  = results[ri];
      const produto = batch[ri];
      const n       = bi * BATCH_SIZE + ri + 1;
      if (result.status === 'fulfilled') {
        totalOk++;
      } else {
        totalErros++;
        const msg = result.reason instanceof Error ? result.reason.message : String(result.reason);
        console.error(`❌ [${String(n).padStart(3, ' ')}/${produtos.length}] ${produto.sku} → ERRO: ${msg}`);
      }
    }
  }

  const custoReal = totalOk * (EST_IN * COST_IN + EST_OUT * COST_OUT);
  console.log('\n══════════════════════════════════════════════');
  console.log(`✅ Processados com sucesso : ${totalOk}`);
  console.log(`❌ Erros                  : ${totalErros}`);
  console.log(`💰 Custo estimado real    : $${custoReal.toFixed(4)} USD`);
  if (DRY_RUN) console.log('🔍 Nenhuma alteração foi gravada no banco (--dry-run)');
  console.log('══════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('\n❌ Erro fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
