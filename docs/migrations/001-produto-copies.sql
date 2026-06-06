-- Migration: 001-produto-copies
-- Story: 1.4 — Copies SEO por Plataforma
-- Apply via: Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS produto_copies (
  id             BIGSERIAL PRIMARY KEY,
  sku            TEXT NOT NULL,
  plataforma     TEXT NOT NULL CHECK (plataforma IN ('amazon','mercado_livre','shopee','leroy_merlin','madeira_madeira')),
  titulo         TEXT NOT NULL,
  bullets        TEXT[],
  descricao      TEXT NOT NULL,
  palavras_chave TEXT[],
  gerado_em      TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sku, plataforma)
);

CREATE INDEX IF NOT EXISTS idx_produto_copies_sku        ON produto_copies(sku);
CREATE INDEX IF NOT EXISTS idx_produto_copies_plataforma ON produto_copies(plataforma);

ALTER TABLE produto_copies ENABLE ROW LEVEL SECURITY;

-- SELECT: qualquer usuário autenticado via Supabase Auth
CREATE POLICY "copies_select" ON produto_copies
  FOR SELECT USING (auth.role() = 'authenticated');

-- INSERT/UPDATE/DELETE: service role apenas
-- (os handlers Next.js usam supabaseServer() com service_role key, que bypassa RLS)
-- O enforcement de admin/editor é feito pelo JWT check nos route handlers.
