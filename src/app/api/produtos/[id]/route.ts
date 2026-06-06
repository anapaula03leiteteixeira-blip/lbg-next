import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

const MASTER_KEYS = new Set([
  "nome_produto", "categoria", "subcategoria", "cor_dominante",
  "material_aparente", "tags", "descricao_marketing", "descricao_tecnica",
]);

// PATCH /api/produtos/[sku] — atualiza campos master do produto
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const sb = supabaseServer();
    const sku = params.id;

    // Extrair apenas campos master (ignora campos de foto enviados pelo form)
    const masterUpdate: Record<string, unknown> = { atualizado_em: new Date().toISOString() };
    for (const [key, val] of Object.entries(body)) {
      if (MASTER_KEYS.has(key)) masterUpdate[key] = val;
    }

    const { data, error } = await sb
      .from("produtos")
      .update(masterUpdate)
      .eq("sku", sku)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro" }, { status: 500 });
  }
}

// DELETE /api/produtos/[sku] — exclui produto e todas as imagens (CASCADE)
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sb = supabaseServer();
    const sku = params.id;

    const { error } = await sb.from("produtos").delete().eq("sku", sku);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro" }, { status: 500 });
  }
}
