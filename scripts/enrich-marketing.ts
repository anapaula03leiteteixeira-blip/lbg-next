import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// ── CLI args ───────────────────────────────────────────────────────────────
const args       = process.argv.slice(2);
const DRY_RUN    = args.includes("--dry-run");
const FORCE      = args.includes("--force");
const ESTIMATE   = args.includes("--estimate");
const skuIdx     = args.indexOf("--sku");
const SKU_FILTER = skuIdx !== -1 ? args[skuIdx + 1] ?? null : null;

// ── Constants ──────────────────────────────────────────────────────────────
const BATCH_SIZE     = 10;
const BATCH_DELAY_MS = 6_000;
const MODEL          = "claude-sonnet-4-6";
const MAX_TOKENS     = 200;

// Custo estimado Claude Sonnet 4.6: $3/1M input + $15/1M output
const COST_IN  = 3  / 1_000_000;
const COST_OUT = 15 / 1_000_000;
const EST_IN   = 800;   // tokens input estimados por imagem (vision)
const EST_OUT  = 100;   // tokens output estimados por resposta

const PROMPT = `Você é um copywriter especializado em produtos hidráulicos e banheiros premium da La Bella Griffe.
Analise esta imagem de produto e escreva uma descrição de marketing em português.
Requisitos:
- 1 a 3 frases
- Tom: elegante, confiante, foco no design e qualidade visual
- Máximo 200 caracteres no total
- Não inclua preço, SKU, código de produto ou marcas concorrentes
Responda APENAS com o texto da descrição, sem aspas, sem prefixo, sem explicação.`;

// ── Clients ────────────────────────────────────────────────────────────────
function initClients() {
  const apiKey     = process.env.ANTHROPIC_API_KEY;
  const sbUrl      = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey      = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!apiKey)  { console.error("❌ ANTHROPIC_API_KEY ausente em .env.local");       process.exit(1); }
  if (!sbUrl)   { console.error("❌ NEXT_PUBLIC_SUPABASE_URL ausente em .env.local"); process.exit(1); }
  if (!sbKey)   { console.error("❌ SUPABASE_SERVICE_ROLE_KEY ausente em .env.local"); process.exit(1); }

  return {
    anthropic: new Anthropic({ apiKey }),
    sb: createClient(sbUrl, sbKey),
  };
}

// ── Types ──────────────────────────────────────────────────────────────────
interface Produto {
  sku: string;
  nome_produto: string;
  image_url: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchImageBase64(imageUrl: string): Promise<{ data: string; mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" }> {
  const res = await fetch(imageUrl, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} ao buscar imagem`);
  const ct = (res.headers.get("content-type") ?? "image/jpeg").split(";")[0].trim();
  const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
  const mediaType  = validTypes.includes(ct as typeof validTypes[number])
    ? (ct as typeof validTypes[number])
    : "image/jpeg";
  const buf  = await res.arrayBuffer();
  const data = Buffer.from(buf).toString("base64");
  return { data, mediaType };
}

async function gerarDescricao(anthropic: Anthropic, imageUrl: string): Promise<string> {
  const { data, mediaType } = await fetchImageBase64(imageUrl);

  const response = await anthropic.messages.create(
    {
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data } },
          { type: "text",  text: PROMPT },
        ],
      }],
    },
    { signal: AbortSignal.timeout(30_000) },
  );

  const first = response.content[0];
  if (!first || first.type !== "text") throw new Error("Resposta vazia do modelo");
  return first.text.trim().slice(0, 200);
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  const { anthropic, sb } = initClients();

  // Buscar produtos elegíveis
  let query = sb
    .from("produtos")
    .select("sku, nome_produto, image_url")
    .not("image_url", "is", null)
    .neq("image_url", "");

  if (!FORCE) {
    query = query.or("descricao_marketing.is.null,descricao_marketing.eq.");
  }
  if (SKU_FILTER) {
    query = query.eq("sku", SKU_FILTER);
  }

  const { data, error } = await query.order("sku");
  if (error) { console.error("❌ Erro ao buscar produtos:", error.message); process.exit(1); }

  const produtos = (data ?? []) as Produto[];

  if (produtos.length === 0) {
    console.log("✅ Nenhum produto para processar (todos já têm descricao_marketing ou sem imagem).");
    console.log("   Use --force para re-processar produtos existentes.");
    return;
  }

  // Cabeçalho com estimativa de custo
  const custTotal = produtos.length * (EST_IN * COST_IN + EST_OUT * COST_OUT);
  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║   La Bella Griffe — Enrich Marketing Script  ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log(`\n📦 Produtos a processar : ${produtos.length}`);
  console.log(`💰 Custo estimado       : $${custTotal.toFixed(4)} USD`);
  console.log(`   (${EST_IN} tokens input + ${EST_OUT} output × ${produtos.length} imgs)`);
  if (DRY_RUN)    console.log("🔍 Modo: DRY-RUN (sem gravação no banco)");
  if (FORCE)      console.log("⚡ Modo: FORCE (inclui produtos com descrição)");
  if (SKU_FILTER) console.log(`🎯 Filtro: SKU = ${SKU_FILTER}`);

  if (ESTIMATE) {
    console.log("\n✅ Estimativa concluída. Execute sem --estimate para processar.\n");
    return;
  }

  const batches: Produto[][] = [];
  for (let i = 0; i < produtos.length; i += BATCH_SIZE) {
    batches.push(produtos.slice(i, i + BATCH_SIZE));
  }

  console.log(`\n⚙️  Processando em ${batches.length} batch(es) de até ${BATCH_SIZE} produtos...\n`);

  let totalOk    = 0;
  let totalErros = 0;

  for (let bi = 0; bi < batches.length; bi++) {
    const batch = batches[bi];

    if (bi > 0) {
      process.stdout.write(`⏳ Aguardando ${BATCH_DELAY_MS / 1000}s (rate limit)...\n`);
      await sleep(BATCH_DELAY_MS);
    }

    const results = await Promise.allSettled(
      batch.map(async (produto, idx) => {
        const n      = bi * BATCH_SIZE + idx + 1;
        const prefix = `[${String(n).padStart(3, " ")}/${produtos.length}] ${produto.sku}`;
        const t0     = Date.now();

        const descricao = await gerarDescricao(anthropic, produto.image_url);
        const elapsed   = ((Date.now() - t0) / 1000).toFixed(1);

        if (!DRY_RUN) {
          const { error: updateErr } = await sb
            .from("produtos")
            .update({ descricao_marketing: descricao })
            .eq("sku", produto.sku);
          if (updateErr) throw new Error(`Supabase UPDATE: ${updateErr.message}`);
        }

        const dryTag = DRY_RUN ? " [dry]" : "";
        console.log(`✅ ${prefix} → OK (${elapsed}s)${dryTag}`);
        if (DRY_RUN) console.log(`   "${descricao}"`);
      })
    );

    for (let ri = 0; ri < results.length; ri++) {
      const result  = results[ri];
      const produto = batch[ri];
      const n       = bi * BATCH_SIZE + ri + 1;

      if (result.status === "fulfilled") {
        totalOk++;
      } else {
        totalErros++;
        const msg = result.reason instanceof Error
          ? result.reason.message
          : String(result.reason);
        console.error(`❌ [${String(n).padStart(3, " ")}/${produtos.length}] ${produto.sku} → ERRO: ${msg}`);
      }
    }
  }

  // Log final
  const custoReal = totalOk * (EST_IN * COST_IN + EST_OUT * COST_OUT);
  console.log("\n══════════════════════════════════════════════");
  console.log(`✅ Processados com sucesso : ${totalOk}`);
  console.log(`❌ Erros                  : ${totalErros}`);
  console.log(`💰 Custo estimado real    : $${custoReal.toFixed(4)} USD`);
  if (DRY_RUN) console.log("🔍 Nenhuma alteração foi gravada no banco (--dry-run)");
  console.log("══════════════════════════════════════════════\n");
}

main().catch(err => {
  console.error("\n❌ Erro fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
