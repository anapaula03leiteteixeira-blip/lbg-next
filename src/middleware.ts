import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET       = new TextEncoder().encode(process.env.NEXTAUTH_SECRET ?? "change-me");
const PUBLIC       = ["/login", "/api/auth/login"];
const ADMIN_ONLY   = ["/admin", "/api/admin"];
const EDITOR_ONLY  = ["/novo", "/editar", "/revisar", "/api/upload", "/api/produtos"];
const AUTH_ONLY    = ["/api/gabi"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC.some(p => pathname.startsWith(p))) return NextResponse.next();
  if (pathname === "/") return NextResponse.redirect(new URL("/catalogo", req.url));

  const token = req.cookies.get("lbg_token")?.value;
  if (!token) return NextResponse.redirect(new URL("/login", req.url));

  let role = "viewer";
  try {
    const { payload } = await jwtVerify(token, SECRET);
    role = (payload.role as string) ?? "viewer";
  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // /admin → só admin
  if (ADMIN_ONLY.some(r => pathname.startsWith(r)) && role !== "admin") {
    return NextResponse.redirect(new URL("/catalogo", req.url));
  }

  // rotas de edição → admin ou editor
  if (EDITOR_ONLY.some(r => pathname.startsWith(r)) && role === "viewer") {
    return NextResponse.redirect(new URL("/catalogo", req.url));
  }

  // AUTH_ONLY → qualquer role autenticada (token já validado acima)
  if (AUTH_ONLY.some(r => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
