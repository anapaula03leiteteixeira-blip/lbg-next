import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// ── CLI args ───────────────────────────────────────────────────────────────
const args        = process.argv.slice(2);
const DRY_RUN     = args.includes("--dry-run");
const FORCE       = args.includes("--force");
const ESTIMATE    = args.includes("--estimate");
const skuIdx      = args.indexOf("--sku");
const SKU_FILTER  = skuIdx  !== -1 ? args[skuIdx  + 1] ?? null : null;
const platIdx     = args.indexOf("--plataforma");
const PLAT_FILTER = platIdx !== -1 ? args[platIdx + 1] ?? null : null;

// ── Constants ──────────────────────────────────────────────────────────────
const PLATAFORMAS = ["amazon", "mercado_livre", "shopee", "leroy_merlin", "madeira_madeira"] as const;
type Plataforma   = typeof PLATAFORMAS[number];

// Batch = 10 produtos (50 req simultâneas: 10 × 5 plataformas)
const BATCH_PRODUTOS   = 10;
const BATCH_DELAY_MS   = 55_000; // ~60 req/min

// Custo estimado (texto-only): $3/1M input + $15/1M output
const COST_IN  = 3  / 1_000_000;
const COST_OUT = 15 / 1_000_000;
const EST_IN   = 400;
const EST_OUT  = 300;

const COPY_LIMITS: Record<Plataforma, { titulo: number; bullets?: { count: number; chars: number }; descricao: number }> = {
  amazon:          { titulo: 200, bullets: { count: 5,  chars: 255 }, descricao: 2000 },
  mercado_livre:   { titulo: 60,                                       descricao: 4000 },
  shopee:          { titulo: 58,                                       descricao: 3000 },
  leroy_merlin:    { titulo: 120, bullets: { count: 10, chars: 200 }, descricao: 280  },
  madeira_madeira: { titulo: 120,                                      descricao: 2000 },
};

// ── Clients ────────────────────────────────────────────────────────────────
function initClients() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const sbUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!apiKey) { console.error("❌ ANTHROPIC_API_KEY ausente"); process.exit(1); }
  if (!sbUrl)  { console.error("❌ NEXT_PUBLIC_SUPABASE_URL ausente"); process.exit(1); }
  if (!sbKey)  { console.error("❌ SUPABASE_SERVICE_ROLE_KEY ausente"); process.exit(1); }

  return { anthropic: new Anthropic({ apiKey }), sb: createClient(sbUrl, sbKey) };
}

// ── Tipos ──────────────────────────────────────────────────────────────────
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

interface CopyRaw {
  titulo?: string;
  bullets?: string[];
  descricao?: string;
  palavras_chave?: string[];
  ficha_tecnica_hints?: string[];
  backend_keywords?: string;
}

// ── Prompts ────────────────────────────────────────────────────────────────
function contextoBase(p: ProdutoDB): string {
  return [
    `Marca: La Bella Griffe — louças e metais sanitários de origem italiana. Fabricados com porcelana vitrificada de alta resistência. Posicionamento: qualidade premium a preço acessível. Garantia de fábrica. Distribuição nacional.`,
    `Produto: ${p.nome_produto}`,
    `Categoria: ${p.categoria}`,
    p.subcategoria      ? `Subcategoria: ${p.subcategoria}`        : null,
    p.cor_dominante     ? `Cor/Acabamento: ${p.cor_dominante}`     : null,
    p.material_aparente ? `Material: ${p.material_aparente}`       : null,
    p.tags?.length      ? `Tags: ${p.tags.join(", ")}`             : null,
    p.descricao_marketing ? `Descrição marketing: ${p.descricao_marketing}` : null,
    p.descricao_tecnica ? `Descrição técnica: ${p.descricao_tecnica}` : null,
  ].filter(Boolean).join("\n");
}

function buildPrompt(plat: Plataforma, p: ProdutoDB): string {
  const ctx = contextoBase(p);
  switch (plat) {
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

// ── Gerar 1 copy ───────────────────────────────────────────────────────────
async function gerarCopy(anthropic: Anthropic, plat: Plataforma, p: ProdutoDB): Promise<CopyRaw> {
  const res = await anthropic.messages.create(
    {
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      system: "Você é um especialista em SEO para e-commerce brasileiro com foco em produtos de banheiro (cubas, torneiras, pastilhas, acessórios sanitários). Gere copies que maximizem visibilidade nas buscas E convertam vendas. Responda APENAS com JSON válido, sem texto adicional.",
      messages: [{ role: "user", content: [{ type: "text", text: buildPrompt(plat, p) }] }],
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

// ── Helpers ────────────────────────────────────────────────────────────────
function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

const PLATAFORMA_LABEL: Record<Plataforma, string> = {
  amazon: "Amazon", mercado_livre: "Mercado Livre",
  shopee: "Shopee", leroy_merlin: "Leroy Merlin", madeira_madeira: "MadeiraMadeira",
};

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  const { anthropic, sb } = initClients();

  // Validar --plataforma
  if (PLAT_FILTER && !PLATAFORMAS.includes(PLAT_FILTER as Plataforma)) {
    console.error(`❌ Plataforma inválida: "${PLAT_FILTER}". Use: ${PLATAFORMAS.join(", ")}`);
    process.exit(1);
  }
  const plataformas = PLAT_FILTER ? [PLAT_FILTER as Plataforma] : [...PLATAFORMAS];

  // Buscar produtos elegíveis
  let query = sb
    .from("produtos")
    .select("sku, nome_produto, categoria, subcategoria, cor_dominante, material_aparente, tags, descricao_marketing, descricao_tecnica")
    .not("nome_produto", "is", null);

  if (SKU_FILTER) query = query.eq("sku", SKU_FILTER);

  const { data, error } = await query.order("sku");
  if (error) { console.error("❌ Erro Supabase:", error.message); process.exit(1); }

  const produtos = (data ?? []) as ProdutoDB[];

  if (produtos.length === 0) {
    console.log("✅ Nenhum produto elegível (sem nome_produto).");
    return;
  }

  // Verificar copies existentes se não --force
  let produtosParaProcessar = produtos;
  if (!FORCE) {
    const { data: existentes } = await sb
      .from("produto_copies")
      .select("sku, plataforma");

    const jaExistem = new Set((existentes ?? []).map(e => `${e.sku}|${e.plataforma}`));
    const pares: { produto: ProdutoDB; plat: Plataforma }[] = [];
    for (const p of produtos) {
      for (const plat of plataformas) {
        if (!jaExistem.has(`${p.sku}|${plat}`)) {
          pares.push({ produto: p, plat });
        }
      }
    }

    if (pares.length === 0) {
      console.log("✅ Todos os copies já existem. Use --force para re-gerar.");
      return;
    }

    // Adaptar para o loop abaixo
    const totalCopies = pares.length;
    const custTotal   = totalCopies * (EST_IN * COST_IN + EST_OUT * COST_OUT);

    console.log("\n╔══════════════════════════════════════════════╗");
    console.log("║  La Bella Griffe — Generate Copies Script    ║");
    console.log("╚══════════════════════════════════════════════╝");
    console.log(`\n📦 Produtos         : ${produtos.length}`);
    console.log(`🏪 Plataformas      : ${plataformas.map(p => PLATAFORMA_LABEL[p]).join(", ")}`);
    console.log(`📝 Copies a gerar   : ${totalCopies} (novos)`);
    console.log(`💰 Custo estimado   : $${custTotal.toFixed(4)} USD`);
    if (DRY_RUN) console.log("🔍 Modo: DRY-RUN (sem gravação no banco)");
    if (ESTIMATE) { console.log("\n✅ Estimativa concluída. Execute sem --estimate para processar.\n"); return; }

    console.log("");

    // Processar pares em batches de 50
    let totalOk = 0, totalErros = 0;
    const batches: typeof pares[] = [];
    for (let i = 0; i < pares.length; i += 50) batches.push(pares.slice(i, i + 50));

    for (let bi = 0; bi < batches.length; bi++) {
      const batch = batches[bi];
      if (bi > 0) { process.stdout.write(`⏳ Aguardando ${BATCH_DELAY_MS / 1000}s (rate limit)...\n`); await sleep(BATCH_DELAY_MS); }

      const results = await Promise.allSettled(
        batch.map(async ({ produto: p, plat }, idx) => {
          const n      = bi * 50 + idx + 1;
          const prefix = `[${String(n).padStart(4, " ")}/${totalCopies}] ${p.sku} × ${PLATAFORMA_LABEL[plat]}`;
          const t0     = Date.now();
          const raw    = await gerarCopy(anthropic, plat, p);
          const lim    = COPY_LIMITS[plat];
          const titulo = truncar(raw.titulo, lim.titulo);
          const descricao = truncar(raw.descricao, lim.descricao);
          const bullets = lim.bullets
            ? (raw.bullets ?? []).slice(0, lim.bullets.count).map(b => b.slice(0, lim.bullets!.chars))
            : null;
          const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

          if (!DRY_RUN) {
            const { error: uErr } = await sb.from("produto_copies").upsert(
              { sku: p.sku, plataforma: plat, titulo, bullets, descricao, palavras_chave: raw.palavras_chave ?? [], atualizado_em: new Date().toISOString() },
              { onConflict: "sku,plataforma" },
            );
            if (uErr) throw new Error(uErr.message);
          }

          console.log(`✅ ${prefix} → OK (${elapsed}s) título: ${titulo.length}/${lim.titulo}${DRY_RUN ? " [dry]" : ""}`);
        })
      );

      for (let ri = 0; ri < results.length; ri++) {
        if (results[ri].status === "fulfilled") totalOk++;
        else {
          totalErros++;
          const { produto: p, plat } = batch[ri];
          const msg = (results[ri] as PromiseRejectedResult).reason instanceof Error
            ? (results[ri] as PromiseRejectedResult).reason.message
            : String((results[ri] as PromiseRejectedResult).reason);
          console.error(`❌ ${p.sku} × ${PLATAFORMA_LABEL[plat]} → ERRO: ${msg}`);
        }
      }
    }

    const custoReal = totalOk * (EST_IN * COST_IN + EST_OUT * COST_OUT);
    console.log("\n══════════════════════════════════════════════");
    console.log(`✅ Gerados com sucesso : ${totalOk}`);
    console.log(`❌ Erros              : ${totalErros}`);
    console.log(`💰 Custo estimado real: $${custoReal.toFixed(4)} USD`);
    if (DRY_RUN) console.log("🔍 Nenhuma alteração foi gravada (--dry-run)");
    console.log("══════════════════════════════════════════════\n");
    return;
  }

  // Modo --force: processar todos os produtos × plataformas
  const totalCopies = produtosParaProcessar.length * plataformas.length;
  const custTotal   = totalCopies * (EST_IN * COST_IN + EST_OUT * COST_OUT);

  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║  La Bella Griffe — Generate Copies Script    ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log(`\n📦 Produtos         : ${produtosParaProcessar.length}`);
  console.log(`🏪 Plataformas      : ${plataformas.map(p => PLATAFORMA_LABEL[p]).join(", ")}`);
  console.log(`📝 Total copies     : ${totalCopies} (--force: re-gera todos)`);
  console.log(`💰 Custo estimado   : $${custTotal.toFixed(4)} USD`);
  if (DRY_RUN) console.log("🔍 Modo: DRY-RUN (sem gravação no banco)");
  if (ESTIMATE) { console.log("\n✅ Estimativa concluída. Execute sem --estimate para processar.\n"); return; }
  console.log("");

  let totalOk = 0, totalErros = 0;

  const batches: ProdutoDB[][] = [];
  for (let i = 0; i < produtosParaProcessar.length; i += BATCH_PRODUTOS) {
    batches.push(produtosParaProcessar.slice(i, i + BATCH_PRODUTOS));
  }

  let copiesProcessados = 0;

  for (let bi = 0; bi < batches.length; bi++) {
    const batch = batches[bi];
    if (bi > 0) { process.stdout.write(`⏳ Aguardando ${BATCH_DELAY_MS / 1000}s (rate limit)...\n`); await sleep(BATCH_DELAY_MS); }

    const pares = batch.flatMap(p => plataformas.map(plat => ({ produto: p, plat })));

    const results = await Promise.allSettled(
      pares.map(async ({ produto: p, plat }, idx) => {
        const n      = copiesProcessados + idx + 1;
        const prefix = `[${String(n).padStart(4, " ")}/${totalCopies}] ${p.sku} × ${PLATAFORMA_LABEL[plat]}`;
        const t0     = Date.now();
        const raw    = await gerarCopy(anthropic, plat, p);
        const lim    = COPY_LIMITS[plat];
        const titulo = truncar(raw.titulo, lim.titulo);
        const descricao = truncar(raw.descricao, lim.descricao);
        const bullets = lim.bullets
          ? (raw.bullets ?? []).slice(0, lim.bullets.count).map(b => b.slice(0, lim.bullets!.chars))
          : null;
        const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

        if (!DRY_RUN) {
          const { error: uErr } = await sb.from("produto_copies").upsert(
            { sku: p.sku, plataforma: plat, titulo, bullets, descricao, palavras_chave: raw.palavras_chave ?? [], atualizado_em: new Date().toISOString() },
            { onConflict: "sku,plataforma" },
          );
          if (uErr) throw new Error(uErr.message);
        }

        console.log(`✅ ${prefix} → OK (${elapsed}s) título: ${titulo.length}/${lim.titulo}${DRY_RUN ? " [dry]" : ""}`);
      })
    );

    copiesProcessados += pares.length;

    for (let ri = 0; ri < results.length; ri++) {
      if (results[ri].status === "fulfilled") totalOk++;
      else {
        totalErros++;
        const { produto: p, plat } = pares[ri];
        const msg = (results[ri] as PromiseRejectedResult).reason instanceof Error
          ? (results[ri] as PromiseRejectedResult).reason.message
          : String((results[ri] as PromiseRejectedResult).reason);
        console.error(`❌ ${p.sku} × ${PLATAFORMA_LABEL[plat]} → ERRO: ${msg}`);
      }
    }
  }

  const custoReal = totalOk * (EST_IN * COST_IN + EST_OUT * COST_OUT);
  console.log("\n══════════════════════════════════════════════");
  console.log(`✅ Gerados com sucesso : ${totalOk}`);
  console.log(`❌ Erros              : ${totalErros}`);
  console.log(`💰 Custo estimado real: $${custoReal.toFixed(4)} USD`);
  if (DRY_RUN) console.log("🔍 Nenhuma alteração foi gravada (--dry-run)");
  console.log("══════════════════════════════════════════════\n");
}

main().catch(err => {
  console.error("\n❌ Erro fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
