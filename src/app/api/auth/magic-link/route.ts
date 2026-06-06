import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { Resend } from "resend";
import { supabaseServer } from "@/lib/supabase";

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET ?? "change-me");

// ── POST: gerar e enviar magic link ──────────────────────────────────────────
export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const body  = await req.json() as { email?: string };
  const email = (body.email ?? "").trim().toLowerCase();

  // Sempre retorna 200 — não revela se email existe
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: true });
  }

  try {
    const sb = supabaseServer();
    const { data: usuario } = await sb
      .from("usuarios")
      .select("email, nome")
      .eq("email", email)
      .eq("ativo", true)
      .single();

    if (usuario) {
      const token    = crypto.randomUUID();
      const expiraEm = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // +15min

      await sb.from("auth_tokens").insert({
        email,
        token,
        tipo:      "magic_link",
        expira_em: expiraEm,
      });

      const link = `${process.env.NEXTAUTH_URL}/api/auth/magic-link?token=${token}`;
      await resend.emails.send({
        from:    process.env.RESEND_FROM_EMAIL ?? "noreply@labellagriffe.com.br",
        to:      email,
        subject: "Seu link de acesso — La Bella Griffe",
        html: `
          <p>Olá,</p>
          <p>Clique no link abaixo para acessar o sistema. O link expira em <strong>15 minutos</strong>.</p>
          <p><a href="${link}" style="background:#c084fc;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">Acessar agora</a></p>
          <p style="color:#6b7280;font-size:0.85em">Se você não solicitou isso, ignore este e-mail.</p>
        `,
      });
    }
  } catch {
    // Silencia — não vazar informação
  }

  return NextResponse.json({ ok: true });
}

// ── GET: validar token e fazer login ────────────────────────────────────────
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const loginUrl = new URL("/login?error=magic_link_invalido", process.env.NEXTAUTH_URL ?? req.url);

  if (!token) return NextResponse.redirect(loginUrl);

  const sb = supabaseServer();

  const { data: tokenData } = await sb
    .from("auth_tokens")
    .select("id, email")
    .eq("token", token)
    .eq("tipo", "magic_link")
    .eq("usado", false)
    .gt("expira_em", new Date().toISOString())
    .single();

  if (!tokenData) return NextResponse.redirect(loginUrl);

  const td = tokenData as { id: number; email: string };

  // Marcar como usado ANTES de gerar JWT (evitar race condition)
  await sb.from("auth_tokens").update({ usado: true }).eq("id", td.id);

  const { data: usuario } = await sb
    .from("usuarios")
    .select("email, nome, role")
    .eq("email", td.email)
    .single();

  if (!usuario) return NextResponse.redirect(loginUrl);

  const u = usuario as { email: string; nome: string; role: string };

  const jwtToken = await new SignJWT({ email: u.email, name: u.nome, role: u.role })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("8h")
    .sign(SECRET);

  const catalogoUrl = new URL("/catalogo", process.env.NEXTAUTH_URL ?? req.url);
  const response    = NextResponse.redirect(catalogoUrl);

  response.cookies.set("lbg_token", jwtToken, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   8 * 60 * 60,
    path:     "/",
  });

  return response;
}
