import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseServer } from "@/lib/supabase";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const body = await req.json() as { email?: string };
  const email = (body.email ?? "").trim().toLowerCase();

  // Sempre retorna 200 — não revela se email existe (anti-enumeration)
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: true });
  }

  try {
    const sb = supabaseServer();
    const { data: usuario } = await sb
      .from("usuarios")
      .select("email")
      .eq("email", email)
      .eq("ativo", true)
      .single();

    if (usuario) {
      const token = crypto.randomUUID();
      const expiraEm = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // +1h

      await sb.from("auth_tokens").insert({
        email,
        token,
        tipo:      "reset_senha",
        expira_em: expiraEm,
      });

      const link = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;
      await resend.emails.send({
        from:    process.env.RESEND_FROM_EMAIL ?? "noreply@labellagriffe.com.br",
        to:      email,
        subject: "Redefinir senha — La Bella Griffe",
        html: `
          <p>Olá,</p>
          <p>Clique no link abaixo para redefinir sua senha. O link expira em <strong>1 hora</strong>.</p>
          <p><a href="${link}" style="background:#c084fc;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">Redefinir senha</a></p>
          <p style="color:#6b7280;font-size:0.85em">Se você não solicitou isso, ignore este e-mail.</p>
        `,
      });
    }
  } catch {
    // Silencia erros — não vazar informação
  }

  return NextResponse.json({ ok: true });
}
