import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET ?? "change-me");

function getUsers() {
  try {
    const raw = process.env.ADMIN_USERS;
    if (raw) return JSON.parse(raw) as { email: string; password: string; name: string }[];
  } catch {}
  return [{
    email:    process.env.ADMIN_EMAIL         ?? "admin@labella.com",
    password: process.env.ADMIN_PASSWORD_HASH ?? "",
    name:     process.env.ADMIN_NAME          ?? "Admin",
  }];
}

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  const users = getUsers();
  const user  = users.find(u => u.email === email);

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return NextResponse.json({ error: "E-mail ou senha incorretos" }, { status: 401 });
  }

  const token = await new SignJWT({ email: user.email, name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("8h")
    .sign(SECRET);

  const res = NextResponse.json({ ok: true });
  res.cookies.set("lbg_token", token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   8 * 60 * 60,
    path:     "/",
  });
  return res;
}
