import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

// GET /api/copies?sku={sku}               → todos os copies do produto
// GET /api/copies?sku={sku}&plataforma=X  → copy específico ou 404
// GET /api/copies                         → lista SKUs com contagem de plataformas (para /admin/copies)
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const sku        = searchParams.get("sku");
  const plataforma = searchParams.get("plataforma");
  const sb         = supabaseServer();

  // Sem sku → lista agrupada para a página admin
  if (!sku) {
    const { data, error } = await sb
      .from("produto_copies")
      .select("sku, plataforma")
      .order("sku");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Agrupar por SKU
    const map = new Map<string, string[]>();
    for (const row of data ?? []) {
      const list = map.get(row.sku) ?? [];
      list.push(row.plataforma);
      map.set(row.sku, list);
    }
    const result = Array.from(map.entries()).map(([s, plataformas]) => ({ sku: s, plataformas }));
    return NextResponse.json(result);
  }

  // Com sku → copies desse produto
  let query = sb
    .from("produto_copies")
    .select("*")
    .eq("sku", sku)
    .order("plataforma");

  if (plataforma) query = query.eq("plataforma", plataforma);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length) return NextResponse.json(null, { status: 404 });

  return NextResponse.json(plataforma ? data[0] : data);
}
