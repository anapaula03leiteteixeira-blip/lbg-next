import { NextRequest, NextResponse } from "next/server";

// GET /api/download?url=...&filename=...
// Proxy server-side para evitar CORS no download de imagens
// (GitHub raw e Cloudinary bloqueiam download direto do browser)
export async function GET(req: NextRequest) {
  const url      = req.nextUrl.searchParams.get("url");
  const filename = req.nextUrl.searchParams.get("filename") ?? "foto-produto.jpg";

  if (!url) {
    return NextResponse.json({ error: "Parâmetro 'url' obrigatório" }, { status: 400 });
  }

  // Valida que é uma URL de imagem dos nossos provedores
  const allowed = ["raw.githubusercontent.com", "cloudinary.com", "drive.google.com"];
  let isAllowed = false;
  try {
    const parsed = new URL(url);
    isAllowed = allowed.some(h => parsed.hostname.includes(h));
  } catch {
    return NextResponse.json({ error: "URL inválida" }, { status: 400 });
  }
  if (!isAllowed) {
    return NextResponse.json({ error: "Origem não permitida" }, { status: 403 });
  }

  try {
    const upstream = await fetch(url, {
      headers: { "User-Agent": "LBG-Catalogo/4.0" },
    });
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Falha ao buscar imagem (${upstream.status})` },
        { status: upstream.status },
      );
    }

    const blob        = await upstream.blob();
    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";

    return new NextResponse(blob, {
      headers: {
        "Content-Type":        contentType,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control":       "no-store",
      },
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro interno" },
      { status: 500 },
    );
  }
}
