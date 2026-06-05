import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

// GET /api/produtos — lista todos os produtos
export async function GET() {
  try {
    const sb = supabaseServer();
    const allRows: unknown[] = [];
    let offset = 0;
    const batch = 1000;

    while (true) {
      const { data, error } = await sb
        .from("produtos")
        .select("*")
        .range(offset, offset + batch - 1)
        .order("criado_em", { ascending: false });

      if (error) throw error;
      allRows.push(...(data ?? []));
      if ((data?.length ?? 0) < batch) break;
      offset += batch;
    }

    return NextResponse.json(allRows);
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

    // M4 — validar enum de categoria
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
