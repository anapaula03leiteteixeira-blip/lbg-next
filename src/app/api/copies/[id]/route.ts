import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { getAuthUser } from "@/lib/get-auth-user";

// PATCH /api/copies/[id] — edição manual (admin/editor)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (user.role === "viewer") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const id   = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const body = await req.json() as Record<string, unknown>;

  if ("sku" in body || "plataforma" in body) {
    return NextResponse.json({ error: "Não é permitido alterar sku ou plataforma" }, { status: 400 });
  }

  const allowed = ["titulo", "bullets", "descricao", "palavras_chave"] as const;
  const update: Record<string, unknown> = { atualizado_em: new Date().toISOString() };
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  if (Object.keys(update).length === 1) {
    return NextResponse.json({ error: "Nenhum campo válido para atualizar" }, { status: 400 });
  }

  const sb = supabaseServer();
  const { data, error } = await sb
    .from("produto_copies")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data)  return NextResponse.json({ error: "Copy não encontrado" }, { status: 404 });

  return NextResponse.json(data);
}
