import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET  = new TextEncoder().encode(process.env.NEXTAUTH_SECRET ?? "change-me");
const PUBLIC  = ["/login", "/api/auth/login"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Rotas públicas
  if (PUBLIC.some(p => pathname.startsWith(p))) return NextResponse.next();

  // Rota raiz → redireciona para catálogo
  if (pathname === "/") return NextResponse.redirect(new URL("/catalogo", req.url));

  // Verifica JWT no cookie
  const token = req.cookies.get("lbg_token")?.value;
  if (!token) return NextResponse.redirect(new URL("/login", req.url));

  try {
    await jwtVerify(token, SECRET);
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
