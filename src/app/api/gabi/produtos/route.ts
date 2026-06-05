import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { supabaseServer } from "@/lib/supabase";
import type { Categoria, Qualidade, ProdutoGabi } from "@/types";

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET ?? "change-me");

const CATEGORIAS: Categoria[] = ["cuba", "sanitario", "flexivel", "rejunte", "acessorio", "pastilha", "outro"];
const QUALIDADES: Qualidade[] = ["excelente", "boa", "regular", "ruim"];

async function isAuthorized(req: NextRequest): Promise<boolean> {
  // Aceita API key via header (para agentes de IA)
  const apiKey = req.headers.get("x-api-key");
  if (apiKey && apiKey === process.env.GABI_API_KEY) return true;

  // Aceita JWT cookie (para usuários via browser)
  const token = req.cookies.get("lbg_token")?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, SECRET);
    return true;
  } catch {
    return false;
  }
}

// GET /api/gabi/produtos
export async function GET(req: NextRequest) {
  if (!await isAuthorized(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const { searchParams } = req.nextUrl;

    const categoriaParam    = searchParams.get("categoria");
    const qualidadeParam    = searchParams.get("qualidade_foto");
    const precisaRevisao    = searchParams.get("precisa_revisao");
    const limitParam        = searchParams.get("limit");
    const offsetParam       = searchParams.get("offset");

    // Validar e normalizar limit/offset
    const limit  = Math.min(Math.max(parseInt(limitParam  ?? "50",  10) || 50,  1), 200);
    const offset = Math.max(parseInt(offsetParam ?? "0", 10) || 0, 0);

    // Validar enums se fornecidos
    if (categoriaParam && !CATEGORIAS.includes(categoriaParam as Categoria)) {
      return NextResponse.json(
        { error: `Categoria inválida: "${categoriaParam}". Use: ${CATEGORIAS.join(", ")}` },
        { status: 400 },
      );
    }
    if (qualidadeParam && !QUALIDADES.includes(qualidadeParam as Qualidade)) {
      return NextResponse.json(
        { error: `qualidade_foto inválida: "${qualidadeParam}". Use: ${QUALIDADES.join(", ")}` },
        { status: 400 },
      );
    }

    const sb = supabaseServer();
    let query = sb
      .from("produtos")
      .select("sku,nome_produto,categoria,cor_dominante,qualidade_foto,image_url,descricao_marketing,tags")
      .range(offset, offset + limit - 1)
      .order("criado_em", { ascending: false });

    if (categoriaParam) query = query.eq("categoria", categoriaParam);
    if (qualidadeParam) query = query.eq("qualidade_foto", qualidadeParam);
    if (precisaRevisao !== null) query = query.eq("precisa_revisao", precisaRevisao === "true");

    const { data, error } = await query;
    if (error) throw error;

    // Garantir que descricao_marketing nula seja retornada como null (não omitida)
    const produtos: ProdutoGabi[] = (data ?? []).map(p => ({
      ...p,
      descricao_marketing: p.descricao_marketing ?? null,
    }));

    return NextResponse.json(produtos);
  } catch (e: unknown) {
    const msg = e instanceof Error
      ? e.message
      : (e as Record<string, unknown>)?.message as string ?? JSON.stringify(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
