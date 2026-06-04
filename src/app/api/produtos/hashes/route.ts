import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET() {
  try {
    const sb = supabaseServer();
    const allRows: Array<{ hash_sha256: string | null; arquivo_original: string | null }> = [];
    let offset = 0;
    const batch = 1000;

    while (true) {
      const { data, error } = await sb
        .from('produtos')
        .select('hash_sha256, arquivo_original')
        .range(offset, offset + batch - 1);

      if (error) throw error;
      allRows.push(...(data ?? []));
      if ((data?.length ?? 0) < batch) break;
      offset += batch;
    }

    return NextResponse.json(allRows);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
