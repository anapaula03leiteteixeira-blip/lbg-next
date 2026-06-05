import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { supabaseServer } from "@/lib/supabase";

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET ?? "change-me");

async function isAuthorized(req: NextRequest): Promise<boolean> {
  const apiKey = req.headers.get("x-api-key");
  if (apiKey && apiKey === process.env.GABI_API_KEY) return true;

  const token = req.cookies.get("lbg_token")?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, SECRET);
    return true;
  } catch {
    return false;
  }
}

// GET /api/gabi/produto/[sku]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sku: string }> },
) {
  if (!await isAuthorized(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const { sku } = await params;

    const sb = supabaseServer();
    const { data, error } = await sb
      .from("produtos")
      .select("*")
      .eq("sku", sku)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (e: unknown) {
    const msg = e instanceof Error
      ? e.message
      : (e as Record<string, unknown>)?.message as string ?? JSON.stringify(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
