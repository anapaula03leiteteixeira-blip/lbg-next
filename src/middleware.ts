import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET       = new TextEncoder().encode(process.env.NEXTAUTH_SECRET ?? "change-me");
const GABI_API_KEY = process.env.GABI_API_KEY ?? "";
const PUBLIC = [
  "/login",
  "/api/auth/login",
  "/api/auth/reset-request",
  "/api/auth/reset-confirm",
  "/api/auth/magic-link",
  "/reset-password",
];
const ADMIN_ONLY   = ["/admin", "/api/admin"];
const EDITOR_ONLY  = ["/novo", "/editar", "/revisar", "/api/upload", "/api/produtos"];
const APIKEY_ROUTES = ["/api/gabi"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC.some(p => pathname.startsWith(p))) return NextResponse.next();
  if (pathname === "/") return NextResponse.redirect(new URL("/catalogo", req.url));

  // Rotas de API externa autenticadas via X-API-Key (não requerem cookie JWT)
  if (APIKEY_ROUTES.some(r => pathname.startsWith(r))) {
    const apiKey = req.headers.get("x-api-key") ?? "";
    if (GABI_API_KEY && apiKey === GABI_API_KEY) return NextResponse.next();
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
