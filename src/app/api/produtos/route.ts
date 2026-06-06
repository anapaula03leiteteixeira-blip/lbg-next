import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import type { ProdutoImagem, Produto } from "@/types";

const QUAL_ORDER: Record<string, number> = { excelente: 0, boa: 1, regular: 2, ruim: 3 };

const CATEGORIAS_VALIDAS = ["cuba","sanitario","pastilha","flexivel","rejunte","acessorio","outro"];

// GET /api/produtos — lista produtos (1 por SKU) com imagens embutidas
export async function GET() {
  try {
    const sb = supabaseServer();

    // Busca paralela: produtos master + todas as imagens
    const [{ data: prods, error: prodErr }, { data: imgs, error: imgErr }] = await Promise.all([
      sb.from("produtos").select("*").order("criado_em", { ascending: false }),
      sb.from("produto_imagens").select("*"),
    ]);

    if (prodErr) throw prodErr;
    if (imgErr)  throw imgErr;

    // Agrupar imagens por SKU
    const imgsBySku = new Map<string, ProdutoImagem[]>();
    for (const img of imgs ?? []) {
      const list = imgsBySku.get(img.sku as string) ?? [];
      list.push(img as ProdutoImagem);
      imgsBySku.set(img.sku as string, list);
    }

    // Montar resposta com imagens enriquecidas
    const produtos: Produto[] = (prods ?? []).map(p => {
      const rawImagens = imgsBySku.get(p.sku as string) ?? [];

      // Enriquecer cada imagem com dados do produto
      const imagens: ProdutoImagem[] = rawImagens.map(img => ({
        ...img,
        nome_produto:        p.nome_produto,
        categoria:           p.categoria,
        subcategoria:        p.subcategoria,
        descricao_marketing: p.descricao_marketing,
        descricao_tecnica:   p.descricao_tecnica,
        tags:                p.tags,
      }));

      // Melhor imagem para campos derivados
      const sorted = [...imagens].sort((a, b) =>
        (QUAL_ORDER[a.qualidade_foto ?? "ruim"] ?? 9) - (QUAL_ORDER[b.qualidade_foto ?? "ruim"] ?? 9),
      );
      const best = sorted[0];

      return {
        sku:                 p.sku,
        nome_produto:        p.nome_produto,
        categoria:           p.categoria,
        subcategoria:        p.subcategoria,
        cor_dominante:       p.cor_dominante,
        material_aparente:   p.material_aparente,
        tags:                p.tags,
        descricao_marketing: p.descricao_marketing,
        descricao_tecnica:   p.descricao_tecnica,
        criado_em:           p.criado_em,
        atualizado_em:       p.atualizado_em,
        // Derivados da melhor imagem
        image_url:           best?.image_url,
        qualidade_foto:      best?.qualidade_foto,
        precisa_revisao:     imagens.some(i => i.precisa_revisao),
        imagens,
      } as Produto;
    });

    return NextResponse.json(produtos);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/produtos — upsert produto master + insert imagem
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.sku?.trim())          return NextResponse.json({ error: "SKU obrigatório" },  { status: 400 });
    if (!body.nome_produto?.trim()) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });

    if (body.categoria && !CATEGORIAS_VALIDAS.includes(body.categoria)) {
      return NextResponse.json(
        { error: `Categoria inválida: "${body.categoria}". Use: ${CATEGORIAS_VALIDAS.join(", ")}` },
        { status: 400 },
      );
    }

    const sb = supabaseServer();
    const now = new Date().toISOString();

    // 1. Upsert produto master (1 por SKU)
    const masterData = {
      sku:                 body.sku,
      nome_produto:        body.nome_produto,
      categoria:           body.categoria,
      subcategoria:        body.subcategoria,
      cor_dominante:       body.cor_dominante,
      material_aparente:   body.material_aparente,
      tags:                body.tags,
      descricao_marketing: body.descricao_marketing,
      descricao_tecnica:   body.descricao_tecnica,
      atualizado_em:       now,
    };

    const { error: masterErr } = await sb
      .from("produtos")
      .upsert(masterData, { onConflict: "sku" });
    if (masterErr) throw masterErr;

    // 2. Insert imagem (se houver image_url)
    const photoData = {
      sku:               body.sku,
      image_url:         body.image_url,
      angulo:            body.angulo,
      fundo:             body.fundo,
      qualidade_foto:    body.qualidade_foto,
      cor_dominante:     body.cor_dominante,
      material_aparente: body.material_aparente,
      problemas_foto:    body.problemas_foto,
      precisa_revisao:   body.precisa_revisao ?? false,
      hash_sha256:       body.hash_sha256,
      arquivo_original:  body.arquivo_original,
      processado_em:     body.processado_em ?? now,
    };

    const { data: imagem, error: imgErr } = await sb
      .from("produto_imagens")
      .insert(photoData)
      .select("id, qualidade_foto, image_url, precisa_revisao")
      .single();
    if (imgErr) throw imgErr;

    return NextResponse.json({
      ...masterData,
      image_url:       imagem?.image_url,
      qualidade_foto:  imagem?.qualidade_foto,
      precisa_revisao: imagem?.precisa_revisao,
      imagem_id:       imagem?.id,
    }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
