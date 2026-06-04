import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { supabaseServer } from "@/lib/supabase";

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET ?? "change-me");

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "E-mail e senha obrigatórios" }, { status: 400 });
  }

  // ── 1. Busca usuário no Supabase ──────────────────────────────
  let user: { email: string; nome: string; role: string; password_hash: string; id: number } | null = null;

  try {
    const sb = supabaseServer();
    const { data } = await sb
      .from("usuarios")
      .select("id, email, nome, role, password_hash, ativo")
      .eq("email", email.toLowerCase().trim())
      .eq("ativo", true)
      .single();

    if (data) user = data as { email: string; nome: string; role: string; password_hash: string; id: number };
  } catch {
    // Supabase não disponível — fallback para env vars
  }

  // ── 2. Fallback: env vars (transição) ─────────────────────────
  if (!user) {
    const envHash = process.env.ADMIN_PASSWORD_HASH ?? "";
    const envEmail = process.env.ADMIN_EMAIL ?? "admin@labella.com";
    if (email.toLowerCase().trim() === envEmail.toLowerCase() && envHash) {
      user = {
        id: 0,
        email:         envEmail,
        nome:          process.env.ADMIN_NAME ?? "Admin",
        role:          "admin",
        password_hash: envHash,
      };
    }
  }

  if (!user) {
    return NextResponse.json({ error: "E-mail ou senha incorretos" }, { status: 401 });
  }

  // ── 3. Verifica senha ─────────────────────────────────────────
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return NextResponse.json({ error: "E-mail ou senha incorretos" }, { status: 401 });
  }

  // ── 4. Atualiza último acesso ─────────────────────────────────
  if (user.id > 0) {
    try {
      await supabaseServer()
        .from("usuarios")
        .update({ ultimo_acesso: new Date().toISOString() })
        .eq("id", user.id);
    } catch { /* silencia */ }
  }

  // ── 5. Gera JWT com role ──────────────────────────────────────
  const token = await new SignJWT({
    email: user.email,
    name:  user.nome,
    role:  user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("8h")
    .sign(SECRET);

  const res = NextResponse.json({ ok: true, role: user.role });
  res.cookies.set("lbg_token", token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   8 * 60 * 60,
    path:     "/",
  });
  return res;
}
