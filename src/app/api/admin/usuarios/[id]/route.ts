import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseServer } from "@/lib/supabase";

// PATCH /api/admin/usuarios/[id] — atualiza usuário
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if (body.nome  !== undefined) updates.nome  = body.nome.trim();
    if (body.role  !== undefined) updates.role  = body.role;
    if (body.ativo !== undefined) updates.ativo = body.ativo;

    // Hash nova senha apenas se fornecida
    if (body.password) {
      updates.password_hash = await bcrypt.hash(body.password, 10);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nenhum campo para atualizar" }, { status: 400 });
    }

    const sb = supabaseServer();
    const { data, error } = await sb
      .from("usuarios")
      .update(updates)
      .eq("id", params.id)
      .select("id, email, nome, role, ativo, criado_em, ultimo_acesso")
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro" }, { status: 500 });
  }
}

// DELETE /api/admin/usuarios/[id] — exclui usuário
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sb = supabaseServer();
    const { error } = await sb.from("usuarios").delete().eq("id", params.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro" }, { status: 500 });
  }
}
