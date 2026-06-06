import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

const MASTER_KEYS = new Set([
  "nome_produto", "categoria", "subcategoria", "cor_dominante",
  "material_aparente", "tags", "descricao_marketing", "descricao_tecnica",
]);
const PHOTO_KEYS = new Set([
  "sku", "image_url", "angulo", "fundo", "qualidade_foto",
  "cor_dominante", "material_aparente", "problemas_foto",
  "precisa_revisao", "hash_sha256", "arquivo_original",
]);

// PATCH /api/produto-imagens/[id]
// Atualiza campos de foto e, se houver campos master + sku, faz upsert no produto
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const sb = supabaseServer();
    const id = parseInt(params.id, 10);
    if (isNaN(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

    const photoUpdate: Record<string, unknown> = {};
    const masterUpdate: Record<string, unknown> = {};

    for (const [key, val] of Object.entries(body)) {
      if (PHOTO_KEYS.has(key))  photoUpdate[key] = val;
      if (MASTER_KEYS.has(key)) masterUpdate[key] = val;
    }

    // Se veio sku E campos master → upsert no produto master primeiro
    if (body.sku && Object.keys(masterUpdate).length > 0) {
      const { error: masterErr } = await sb
        .from("produtos")
        .upsert(
          { sku: body.sku, ...masterUpdate, atualizado_em: new Date().toISOString() },
          { onConflict: "sku" },
        );
      if (masterErr) throw masterErr;
    }

    // Atualizar a imagem
    if (Object.keys(photoUpdate).length === 0) {
      return NextResponse.json({ ok: true });
    }

    const { data, error } = await sb
      .from("produto_imagens")
      .update(photoUpdate)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Enriquecer resposta com dados do produto
    const { data: prod } = await sb
      .from("produtos")
      .select("nome_produto, categoria, subcategoria, descricao_marketing, descricao_tecnica, tags")
      .eq("sku", data.sku)
      .single();

    return NextResponse.json({ ...data, ...(prod ?? {}) });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro" }, { status: 500 });
  }
}

// DELETE /api/produto-imagens/[id]
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sb = supabaseServer();
    const id = parseInt(params.id, 10);
    if (isNaN(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

    const { error } = await sb.from("produto_imagens").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro" }, { status: 500 });
  }
}
