import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { v2 as cloudinary } from "cloudinary";
import Anthropic from "@anthropic-ai/sdk";
import skuCatalog from "@/data/sku-catalog.json";

interface CatalogEntry {
  sku: string;
  nome: string;
  categoria: string;
  tipo: string;
  tags: string[];
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD!,
  api_key:    process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_SECRET!,
  secure:     true,
});

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const form     = await req.formData();
    const file     = form.get("file") as File | null;
    const skuHint  = (form.get("sku")       as string | null) ?? "";
    const catHint  = (form.get("categoria") as string | null) ?? "";
    const nomeHint = (form.get("nome")      as string | null) ?? "";

    if (!file) return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "Arquivo muito grande (máx 10MB)" }, { status: 400 });

    const bytes      = await file.arrayBuffer();
    const buffer     = Buffer.from(bytes);
    const base64     = buffer.toString("base64");
    const hash_sha256 = createHash('sha256').update(buffer).digest('hex');

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const mediaMap: Record<string, string> = { jpg:"image/jpeg", jpeg:"image/jpeg", png:"image/png", webp:"image/webp" };
    const mediaType = (mediaMap[ext] ?? "image/jpeg") as "image/jpeg" | "image/png" | "image/webp";

    // ── 1. Classificar com Claude Vision ─────────────────────────────────────
    // Lookup SKU hint in catalog for richer context
    let catalogMatch: CatalogEntry | undefined;
    if (skuHint) {
      const hint = skuHint.toUpperCase().replace(/\s+/g, '');
      catalogMatch = (skuCatalog as CatalogEntry[]).find(p => {
        const sku = p.sku.toUpperCase();
        return sku === hint || sku.startsWith(hint) || hint.startsWith(sku);
      });
      // Also try matching by tags/name words
      if (!catalogMatch) {
        const words = skuHint.toLowerCase().split(/[\s\-_]+/).filter(w => w.length > 3);
        catalogMatch = (skuCatalog as CatalogEntry[]).find(p =>
          words.some(w => p.tags.includes(w) || p.nome.toLowerCase().includes(w) || p.sku.toLowerCase().includes(w))
        );
      }
    }

    const contextParts: string[] = [];
    if (catalogMatch) {
      contextParts.push(`SKU confirmado no catálogo LBG: ${catalogMatch.sku}`);
      contextParts.push(`Nome do produto: ${catalogMatch.nome}`);
      contextParts.push(`Categoria: ${catalogMatch.categoria}`);
    } else if (skuHint) {
      contextParts.push(`SKU informado: ${skuHint}`);
    }
    if (catHint)  contextParts.push(`Categoria informada: ${catHint}`);
    if (nomeHint) contextParts.push(`Nome informado: ${nomeHint}`);
    const context = contextParts.join("\n") || "Nenhum contexto adicional.";

    const prompt = `Você é especialista em produtos hidráulicos e de banheiro.
Analise esta foto e retorne APENAS JSON válido, sem texto adicional.

CONTEXTO:
${context}

JSON esperado:
{
  "sku": "use o informado ou deixe vazio",
  "nome_produto": "nome comercial completo",
  "categoria": "cuba|sanitario|flexivel|rejunte|acessorio|outro",
  "subcategoria": "subcategoria específica",
  "cor_dominante": "cor principal",
  "angulo": "frontal|lateral|superior|perspectiva|detalhe|conjunto|embalagem",
  "fundo": "branco|colorido|ambiente|transparente|outro",
  "qualidade_foto": "excelente|boa|regular|ruim",
  "problemas_foto": [],
  "material_aparente": "louca|aco_inox|plastico|ceramica|metal|borracha|outro",
  "tags": ["palavras-chave para busca"],
  "descricao_marketing": "frase atrativa, máx 120 chars",
  "descricao_tecnica": "descrição técnica objetiva",
  "precisa_revisao": false
}`;

    let aiResp;
    try {
      aiResp = await anthropic.messages.create({
        model:      "claude-sonnet-4-6",
        max_tokens: 1200,
        messages: [{
          role:    "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
            { type: "text",  text: prompt },
          ],
        }],
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: `[Claude Vision] ${msg}` }, { status: 502 });
    }

    let rawText = aiResp.content[0].type === "text" ? aiResp.content[0].text.trim() : "{}";
    rawText = rawText.replace(/^```(?:json)?\s*/m, "").replace(/\s*```$/m, "").trim();
    let classificacao: Record<string, unknown> = {};
    try {
      classificacao = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: `[Claude Vision] Resposta inválida (não é JSON): ${rawText.slice(0, 120)}` }, { status: 502 });
    }

    // Catálogo LBG tem prioridade máxima para SKU e categoria
    if (catalogMatch) {
      classificacao.sku       = catalogMatch.sku;
      classificacao.categoria = catalogMatch.categoria;
      if (!(classificacao.nome_produto as string | undefined)?.trim()) {
        classificacao.nome_produto = catalogMatch.nome;
      }
    } else if (skuHint) {
      classificacao.sku = skuHint;
    }
    if (catHint)  classificacao.categoria    = catHint;
    if (nomeHint) classificacao.nome_produto = nomeHint;

    // ── 2. Upload para Cloudinary ─────────────────────────────────────────────
    const cat      = (classificacao.categoria as string | undefined) ?? "outro";
    const sku      = (classificacao.sku      as string | undefined) ?? "produto";
    const angulo   = (classificacao.angulo   as string | undefined) ?? "frontal";
    const publicId = `lbg/${cat}/${sku.replace(/[^a-zA-Z0-9-_]/g, "_")}-${angulo}-${Date.now()}`;

    let uploadResult: { secure_url: string };
    try {
      uploadResult = await new Promise<{ secure_url: string }>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { public_id: publicId, overwrite: false, quality: "auto", fetch_format: "auto" },
          (err, result) => err ? reject(err) : resolve(result as { secure_url: string }),
        ).end(buffer);
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: `[Cloudinary] ${msg}` }, { status: 502 });
    }

    return NextResponse.json({
      classificacao,
      image_url:        uploadResult.secure_url,
      hash_sha256,
      arquivo_original: file.name,
    });

  } catch (e: unknown) {
    console.error("Upload/classify error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro interno" }, { status: 500 });
  }
}
