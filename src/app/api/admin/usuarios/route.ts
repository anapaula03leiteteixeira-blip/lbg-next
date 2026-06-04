import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseServer } from "@/lib/supabase";

// GET /api/admin/usuarios — lista todos os usuários
export async function GET() {
  try {
    const sb = supabaseServer();
    const { data, error } = await sb
      .from("usuarios")
      .select("id, email, nome, role, ativo, criado_em, ultimo_acesso")
      .order("criado_em", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro" }, { status: 500 });
  }
}

// POST /api/admin/usuarios — cria novo usuário
export async function POST(req: NextRequest) {
  try {
    const { email, nome, role, password } = await req.json();

    if (!email?.trim()) return NextResponse.json({ error: "E-mail obrigatório" }, { status: 400 });
    if (!nome?.trim())  return NextResponse.json({ error: "Nome obrigatório" },  { status: 400 });
    if (!password)      return NextResponse.json({ error: "Senha obrigatória" }, { status: 400 });
    if (!["admin","editor","viewer"].includes(role)) {
      return NextResponse.json({ error: "Role inválido" }, { status: 400 });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const sb = supabaseServer();
    const { data, error } = await sb
      .from("usuarios")
      .insert({
        email:         email.toLowerCase().trim(),
        nome:          nome.trim(),
        role,
        password_hash,
        ativo:         true,
      })
      .select("id, email, nome, role, ativo, criado_em")
      .single();

    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 409 });
      throw error;
    }
    return NextResponse.json(data, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro" }, { status: 500 });
  }
}
