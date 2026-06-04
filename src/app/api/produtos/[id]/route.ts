import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

// PATCH /api/produtos/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const sb = supabaseServer();
    const { data, error } = await sb
      .from("produtos")
      .update(body)
      .eq("id", params.id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro" }, { status: 500 });
  }
}

// DELETE /api/produtos/[id]
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sb = supabaseServer();
    const { error } = await sb.from("produtos").delete().eq("id", params.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro" }, { status: 500 });
  }
}
