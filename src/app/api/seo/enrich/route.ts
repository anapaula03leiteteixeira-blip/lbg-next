import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { generateSeoCopy } from '@/lib/seo/copy-generator';
import { getKeywordsForCategoria } from '@/lib/seo/keyword-map';

function isAuthorized(req: NextRequest): boolean {
  const apiKey = req.headers.get('x-api-key');
  return !!apiKey && apiKey === process.env.GABI_API_KEY;
}

interface EnrichBody {
  product_id?: string;
  sku?:        string;
}

// POST /api/seo/enrich — gera SEO copy para um produto
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  let body: EnrichBody;
  try {
    body = await req.json() as EnrichBody;
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const sku = (body.sku ?? body.product_id ?? '').trim().toUpperCase();
  if (!sku) {
    return NextResponse.json({ error: 'sku obrigatório' }, { status: 400 });
  }

  const sb = supabaseServer();

  const { data: produto, error: prodErr } = await sb
    .from('produtos')
    .select('sku, nome_produto, categoria, subcategoria, cor_dominante, material_aparente, tags, descricao_marketing, descricao_tecnica')
    .eq('sku', sku)
    .single();

  if (prodErr || !produto) {
    return NextResponse.json({ error: 'Produto não encontrado', sku }, { status: 404 });
  }

  try {
    const keywords = getKeywordsForCategoria(produto.categoria as string);
    const seoOutput = await generateSeoCopy(produto, keywords);

    const { error: upsertErr } = await sb
      .from('product_seo')
      .upsert(
        {
          sku,
          nuvemshop_title:       seoOutput.nuvemshop_title,
          nuvemshop_description: seoOutput.nuvemshop_description,
          meta_title:            seoOutput.meta_title,
          meta_description:      seoOutput.meta_description,
          alt_text:              seoOutput.alt_text,
          keywords:              seoOutput.keywords,
          keyword_data:          keywords.map(k => ({ keyword: k.keyword, volume: k.volume, sd: k.sd, cpc: k.cpc })),
          enriched_at:           new Date().toISOString(),
          enriched_by:           'api',
        },
        { onConflict: 'sku' },
      );

    if (upsertErr) throw new Error(`Supabase product_seo: ${upsertErr.message}`);

    const { error: copyErr } = await sb
      .from('produto_copies')
      .upsert(
        {
          sku,
          plataforma:     'nuvemshop',
          titulo:         seoOutput.nuvemshop_copy.titulo,
          bullets:        null,
          descricao:      seoOutput.nuvemshop_copy.descricao,
          palavras_chave: seoOutput.keywords,
          atualizado_em:  new Date().toISOString(),
        },
        { onConflict: 'sku,plataforma' },
      );

    if (copyErr) throw new Error(`Supabase produto_copies: ${copyErr.message}`);

    return NextResponse.json({
      sku,
      seo: {
        nuvemshop_title:       seoOutput.nuvemshop_title,
        nuvemshop_description: seoOutput.nuvemshop_description,
        meta_title:            seoOutput.meta_title,
        meta_description:      seoOutput.meta_description,
        alt_text:              seoOutput.alt_text,
        keywords:              seoOutput.keywords,
      },
      nuvemshop_copy: seoOutput.nuvemshop_copy,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
