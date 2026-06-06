import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseServer } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = await req.json() as { token?: string; novaSenha?: string; confirmarSenha?: string };
  const { token, novaSenha, confirmarSenha } = body;

  if (!token || !novaSenha || !confirmarSenha) {
    return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
  }
  if (novaSenha !== confirmarSenha) {
    return NextResponse.json({ error: "As senhas não coincidem" }, { status: 400 });
  }
  if (novaSenha.length < 8) {
    return NextResponse.json({ error: "Senha deve ter pelo menos 8 caracteres" }, { status: 400 });
  }

  const sb = supabaseServer();

  const { data: tokenData } = await sb
    .from("auth_tokens")
    .select("id, email")
    .eq("token", token)
    .eq("tipo", "reset_senha")
    .eq("usado", false)
    .gt("expira_em", new Date().toISOString())
    .single();

  if (!tokenData) {
    return NextResponse.json({ error: "Link inválido ou expirado" }, { status: 400 });
  }

  const td = tokenData as { id: number; email: string };
  const novoHash = await bcrypt.hash(novaSenha, 10);

  await sb.from("usuarios").update({ password_hash: novoHash }).eq("email", td.email);
  await sb.from("auth_tokens").update({ usado: true }).eq("id", td.id);

  return NextResponse.json({ ok: true });
}
