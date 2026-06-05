import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { signCloudinaryUrl } from "@/lib/cloudinary-sign";

// L1 NOTE: select("*") mantido — SELECT explícito requer confirmar schema via migration file.
// L3: enriquecer cada linha com image_url_signed (URL assinada com 1h de expiração).

const CLOUDINARY_HOST = 'res.cloudinary.com';

interface ProdutoRow {
  image_url?: string | null;
  [key: string]: unknown;
}

// GET /api/produtos — lista todos os produtos
export async function GET() {
  try {
    const sb = supabaseServer();
    const allRows: ProdutoRow[] = [];
    let offset = 0;
    const batch = 1000;

    while (true) {
      const { data, error } = await sb
        .from("produtos")
        .select("*")
        .range(offset, offset + batch - 1)
        .order("criado_em", { ascending: false });

      if (error) throw error;
      allRows.push(...((data ?? []) as unknown as ProdutoRow[]));
      if ((data?.length ?? 0) < batch) break;
      offset += batch;
    }

    // L3 — URL assinada com expiração (CDN rejeita após 1h)
    const enriched = allRows.map(row => {
      const url = row.image_url;
      if (!url || !url.includes(CLOUDINARY_HOST)) return row;
      return { ...row, image_url_signed: signCloudinaryUrl(url) };
    });

    return NextResponse.json(enriched);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/produtos — cria novo produto
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.sku?.trim())          return NextResponse.json({ error: "SKU obrigatório" },  { status: 400 });
    if (!body.nome_produto?.trim()) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });

    // M4 — validar enum de categoria na borda da API
    const CATEGORIAS_VALIDAS = ['cuba','sanitario','pastilha','flexivel','rejunte','acessorio','outro'];
    if (body.categoria && !CATEGORIAS_VALIDAS.includes(body.categoria)) {
      return NextResponse.json({ error: `Categoria inválida: "${body.categoria}". Use: ${CATEGORIAS_VALIDAS.join(', ')}` }, { status: 400 });
    }

    const sb = supabaseServer();
    const { data, error } = await sb
      .from("produtos")
      .insert({ ...body, processado_em: new Date().toISOString() })
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
