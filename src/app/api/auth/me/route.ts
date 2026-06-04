import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET ?? "change-me");

export async function GET(req: NextRequest) {
  const token = req.cookies.get("lbg_token")?.value;
  if (!token) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const { payload } = await jwtVerify(token, SECRET);
    return NextResponse.json({
      email: payload.email,
      name:  payload.name,
      role:  payload.role ?? "viewer",
    });
  } catch {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }
}
