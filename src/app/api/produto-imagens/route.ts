import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import type { ProdutoImagem } from "@/types";

// GET /api/produto-imagens?revisao=true&sku=X
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const revisaoOnly = searchParams.get("revisao") === "true";
    const skuFilter   = searchParams.get("sku");

    const sb = supabaseServer();

    // Query 1: buscar imagens com filtros
    let imgQuery = sb
      .from("produto_imagens")
      .select("*")
      .order("criado_em", { ascending: false });

    if (revisaoOnly) imgQuery = imgQuery.eq("precisa_revisao", true);
    if (skuFilter)   imgQuery = imgQuery.eq("sku", skuFilter);

    const { data: imgs, error: imgErr } = await imgQuery;
    if (imgErr) throw imgErr;

    if (!imgs || imgs.length === 0) return NextResponse.json([]);

    // Query 2: buscar dados dos produtos para enriquecer
    const skus = [...new Set(imgs.map(i => i.sku as string))];
    const { data: prods, error: prodErr } = await sb
      .from("produtos")
      .select("sku, nome_produto, categoria, subcategoria, descricao_marketing, descricao_tecnica, tags")
      .in("sku", skus);
    if (prodErr) throw prodErr;

    // Índice por SKU para join em memória
    const prodBySku = new Map<string, Record<string, unknown>>();
    for (const p of prods ?? []) prodBySku.set(p.sku as string, p as Record<string, unknown>);

    const imagens: ProdutoImagem[] = imgs.map((row: Record<string, unknown>) => {
      const prod = prodBySku.get(row.sku as string);
      return {
        id:                  row.id,
        sku:                 row.sku,
        image_url:           row.image_url,
        angulo:              row.angulo,
        fundo:               row.fundo,
        qualidade_foto:      row.qualidade_foto,
        cor_dominante:       row.cor_dominante,
        material_aparente:   row.material_aparente,
        problemas_foto:      row.problemas_foto,
        precisa_revisao:     (row.precisa_revisao as boolean) ?? false,
        hash_sha256:         row.hash_sha256,
        arquivo_original:    row.arquivo_original,
        processado_em:       row.processado_em,
        criado_em:           row.criado_em,
        // enriquecido do join em memória
        nome_produto:        prod?.nome_produto,
        categoria:           prod?.categoria,
        subcategoria:        prod?.subcategoria,
        descricao_marketing: prod?.descricao_marketing,
        descricao_tecnica:   prod?.descricao_tecnica,
        tags:                prod?.tags,
      } as ProdutoImagem;
    });

    return NextResponse.json(imagens);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
