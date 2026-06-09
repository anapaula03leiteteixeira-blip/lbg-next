-- Migration: SEO metadata table + nuvemshop platform support
-- Apply via Supabase Dashboard > SQL Editor

-- 1. Tabela de metadados SEO (complementa produto_copies para Nuvemshop/SEO on-page)
CREATE TABLE IF NOT EXISTS product_seo (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku              text NOT NULL REFERENCES produtos(sku) ON DELETE CASCADE,
  -- Nuvemshop / SEO on-page
  nuvemshop_title       text,          -- título principal da página
  nuvemshop_description text,          -- descrição HTML completa
  meta_title            text,          -- max 70 chars (Google snippet)
  meta_description      text,          -- max 160 chars (Google snippet)
  alt_text              text,          -- max 125 chars (acessibilidade + SEO imagem)
  keywords              text[],        -- keywords SEO usadas na geração
  keyword_data          jsonb,         -- dados brutos do Ubersuggest (vol, sd, cpc)
  -- Metadata
  enriched_at      timestamptz DEFAULT now(),
  enriched_by      text DEFAULT 'cli',  -- 'cli' | 'api'
  UNIQUE(sku)
);

CREATE INDEX IF NOT EXISTS idx_product_seo_sku ON product_seo(sku);

-- RLS: leitura pública, escrita apenas via service role
ALTER TABLE product_seo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_seo_select_public"
  ON product_seo FOR SELECT
  USING (true);

-- Nota: INSERT/UPDATE/DELETE via service role key (bypass RLS)
-- Nuvemshop como plataforma em produto_copies é tratado como text — nenhuma migration necessária
-- (coluna plataforma é text, não enum — INSERT com 'nuvemshop' funciona diretamente)
