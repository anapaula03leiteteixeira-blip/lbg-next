import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { jwtVerify } from "jose";
import { supabaseServer } from "@/lib/supabase";

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET ?? "change-me");

async function getAuthUser(req: NextRequest): Promise<{ email: string } | null> {
  const token = req.cookies.get("lbg_token")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return { email: payload.email as string };
  } catch { return null; }
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const { senhaAtual, novaSenha, confirmarSenha } = body as Record<string, string>;

  if (!senhaAtual || !novaSenha || !confirmarSenha) {
    return NextResponse.json({ error: "Todos os campos são obrigatórios" }, { status: 400 });
  }
  if (novaSenha !== confirmarSenha) {
    return NextResponse.json({ error: "As senhas não coincidem" }, { status: 400 });
  }
  if (novaSenha.length < 8) {
    return NextResponse.json({ error: "Senha deve ter pelo menos 8 caracteres" }, { status: 400 });
  }

  const sb = supabaseServer();
  const { data: usuario } = await sb
    .from("usuarios")
    .select("password_hash")
    .eq("email", user.email)
    .single();

  if (!usuario) {
    return NextResponse.json(
      { error: "Troca de senha não disponível. Atualize a variável ADMIN_PASSWORD_HASH no servidor." },
      { status: 400 }
    );
  }

  const ok = await bcrypt.compare(senhaAtual, (usuario as { password_hash: string }).password_hash);
  if (!ok) return NextResponse.json({ error: "Senha atual incorreta" }, { status: 400 });

  const novoHash = await bcrypt.hash(novaSenha, 10);
  const { error } = await sb
    .from("usuarios")
    .update({ password_hash: novoHash })
    .eq("email", user.email);

  if (error) return NextResponse.json({ error: "Erro ao atualizar senha" }, { status: 500 });

  return NextResponse.json({ ok: true, message: "Senha alterada com sucesso" });
}
