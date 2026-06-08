import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { supabaseServer } from "@/lib/supabase";
import type { Categoria, Qualidade, ProdutoGabi } from "@/types";

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET ?? "change-me");

const CATEGORIAS: Categoria[] = ["cuba", "sanitario", "flexivel", "rejunte", "acessorio", "pastilha", "outro"];
const QUALIDADES: Qualidade[] = ["excelente", "boa", "regular", "ruim"];
const QUAL_ORDER: Record<string, number> = { excelente: 0, boa: 1, regular: 2, ruim: 3 };

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

// GET /api/gabi/produtos
export async function GET(req: NextRequest) {
  if (!await isAuthorized(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const { searchParams } = req.nextUrl;

    const categoriaParam = searchParams.get("categoria");
    const qualidadeParam = searchParams.get("qualidade_foto");
    const precisaRevisao = searchParams.get("precisa_revisao");
    const qParam         = searchParams.get("q");
    const limitParam     = searchParams.get("limit");
    const offsetParam    = searchParams.get("offset");
    const pageParam      = searchParams.get("page");

    const limit  = Math.min(Math.max(parseInt(limitParam ?? "50", 10) || 50, 1), 200);
    // ?page= é alias de offset para compatibilidade com Pix Agent (ProductData contract)
    const offset = pageParam
      ? (Math.max(parseInt(pageParam, 10) || 1, 1) - 1) * limit
      : Math.max(parseInt(offsetParam ?? "0", 10) || 0, 0);

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

    // Buscar produtos master com filtro de categoria
    let prodQuery = sb
      .from("produtos")
      .select("sku, nome_produto, categoria, cor_dominante, descricao_marketing, tags")
      .range(offset, offset + limit - 1)
      .order("criado_em", { ascending: false });

    if (categoriaParam) prodQuery = prodQuery.eq("categoria", categoriaParam);
    if (qParam) prodQuery = prodQuery.ilike("nome_produto", `%${qParam}%`);

    const { data: prods, error: prodErr } = await prodQuery;
    if (prodErr) throw prodErr;

    const skus = (prods ?? []).map(p => p.sku as string);
    if (skus.length === 0) return NextResponse.json([]);

    // Buscar melhor imagem por SKU
    let imgQuery = sb
      .from("produto_imagens")
      .select("sku, image_url, qualidade_foto, precisa_revisao")
      .in("sku", skus);

    if (qualidadeParam) imgQuery = imgQuery.eq("qualidade_foto", qualidadeParam);
    if (precisaRevisao !== null) imgQuery = imgQuery.eq("precisa_revisao", precisaRevisao === "true");

    const { data: imgs, error: imgErr } = await imgQuery;
    if (imgErr) throw imgErr;

    // Agrupar imagens por SKU e escolher a melhor
    const bestImgBySku = new Map<string, { image_url: string | null; qualidade_foto: string | null; precisa_revisao: boolean }>();
    for (const img of imgs ?? []) {
      const sku = img.sku as string;
      const curr = bestImgBySku.get(sku);
      if (
        !curr ||
        (QUAL_ORDER[img.qualidade_foto as string ?? "ruim"] ?? 9) <
        (QUAL_ORDER[curr.qualidade_foto ?? "ruim"] ?? 9)
      ) {
        bestImgBySku.set(sku, {
          image_url:       img.image_url as string | null,
          qualidade_foto:  img.qualidade_foto as string | null,
          precisa_revisao: (img.precisa_revisao as boolean) ?? false,
        });
      }
    }

    // Filtrar SKUs sem imagens (se filtros de qualidade/revisão foram aplicados)
    const hasFotoFilter = qualidadeParam || precisaRevisao !== null;
    const produtos: ProdutoGabi[] = (prods ?? [])
      .filter(p => !hasFotoFilter || bestImgBySku.has(p.sku as string))
      .map(p => {
        const img = bestImgBySku.get(p.sku as string);
        return {
          sku:                 p.sku as string,
          nome_produto:        p.nome_produto as string,
          categoria:           p.categoria as Categoria,
          cor_dominante:       p.cor_dominante as string | undefined,
          qualidade_foto:      img?.qualidade_foto as Qualidade | undefined,
          image_url:           img?.image_url ?? undefined,
          descricao_marketing: (p.descricao_marketing as string | null) ?? null,
          tags:                p.tags as string[] | undefined,
        };
      });

    return NextResponse.json(produtos);
  } catch (e: unknown) {
    const msg = e instanceof Error
      ? e.message
      : (e as Record<string, unknown>)?.message as string ?? JSON.stringify(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
