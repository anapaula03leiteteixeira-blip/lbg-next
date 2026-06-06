-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 002: Modelo Produto-Cêntrico
-- Story 1.5 — Refactor Modelo de Dados
-- Execute no Supabase: SQL Editor → New Query → Run
-- ═══════════════════════════════════════════════════════════════════════════
-- ATENÇÃO: Esta migration:
--   1. Cria produto_imagens e migra todas as fotos atuais
--   2. Cria tabela products master (1 por SKU)
--   3. Renomeia: produtos → produtos_legacy, master → produtos
--   4. produtos_legacy fica como BACKUP — apagar manualmente após validação
-- ═══════════════════════════════════════════════════════════════════════════

-- ── FASE 1: Criar tabela de fotos ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS produto_imagens (
  id               BIGSERIAL PRIMARY KEY,
  sku              TEXT NOT NULL,
  image_url        TEXT,
  angulo           TEXT,
  fundo            TEXT,
  qualidade_foto   TEXT,
  cor_dominante    TEXT,
  material_aparente TEXT,
  problemas_foto   TEXT[],
  precisa_revisao  BOOLEAN NOT NULL DEFAULT FALSE,
  hash_sha256      TEXT UNIQUE,
  arquivo_original TEXT,
  processado_em    TIMESTAMPTZ,
  criado_em        TIMESTAMPTZ DEFAULT NOW()
);
-- CHECK constraints omitidos intencionalmente: dados legados têm valores fora do enum
-- (ex: angulo='ambiente' classificado incorretamente pelo Claude Vision).
-- A validação de enum fica no TypeScript (src/types/index.ts).

CREATE INDEX IF NOT EXISTS idx_produto_imagens_sku
  ON produto_imagens(sku);

CREATE INDEX IF NOT EXISTS idx_produto_imagens_revisao
  ON produto_imagens(precisa_revisao)
  WHERE precisa_revisao = TRUE;

ALTER TABLE produto_imagens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pi_all" ON produto_imagens FOR ALL USING (true);

-- ── FASE 2: Migrar fotos atuais ───────────────────────────────────────────

INSERT INTO produto_imagens (
  id, sku, image_url, angulo, fundo, qualidade_foto,
  cor_dominante, material_aparente, problemas_foto,
  precisa_revisao, hash_sha256, arquivo_original,
  processado_em, criado_em
)
SELECT DISTINCT ON (COALESCE(hash_sha256, id::text))
  id,
  sku,
  image_url,
  angulo,
  fundo,
  qualidade_foto,
  cor_dominante,
  material_aparente,
  problemas_foto,
  COALESCE(precisa_revisao, FALSE),
  hash_sha256,
  arquivo_original,
  processado_em,
  COALESCE(criado_em, NOW())
FROM produtos
ORDER BY COALESCE(hash_sha256, id::text), id ASC;
-- DISTINCT ON (hash) mantém 1 foto por hash, descartando duplicatas legadas.
-- Fotos sem hash (NULL) nunca colidem (PostgreSQL trata NULL como distinto).

-- Ajustar sequence para continuar após o último id migrado
SELECT setval(
  'produto_imagens_id_seq',
  COALESCE((SELECT MAX(id) FROM produto_imagens), 0) + 1
);

-- ── FASE 3: Criar tabela master (1 por SKU) ───────────────────────────────

CREATE TABLE produtos_master AS
SELECT DISTINCT ON (sku)
  sku,
  nome_produto,
  categoria,
  subcategoria,
  cor_dominante,
  material_aparente,
  tags,
  descricao_marketing,
  descricao_tecnica,
  COALESCE(criado_em, NOW()) AS criado_em,
  NOW()                      AS atualizado_em
FROM produtos
ORDER BY sku, criado_em ASC NULLS LAST;

-- Constraints do master
ALTER TABLE produtos_master ADD PRIMARY KEY (sku);
ALTER TABLE produtos_master ALTER COLUMN nome_produto SET NOT NULL;
ALTER TABLE produtos_master ALTER COLUMN categoria    SET NOT NULL;

ALTER TABLE produtos_master ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_all" ON produtos_master FOR ALL USING (true);

-- ── FASE 4: FK fotos → master ─────────────────────────────────────────────
-- Verificar antes se há SKUs em produto_imagens sem correspondente no master
-- (não deve haver, mas é seguro checar):
-- SELECT DISTINCT sku FROM produto_imagens
-- WHERE sku NOT IN (SELECT sku FROM produtos_master);

ALTER TABLE produto_imagens
  ADD CONSTRAINT fk_imagem_sku
  FOREIGN KEY (sku) REFERENCES produtos_master(sku)
  ON DELETE CASCADE;

-- ── FASE 5: Renomear tabelas ──────────────────────────────────────────────

ALTER TABLE produtos        RENAME TO produtos_legacy;
ALTER TABLE produtos_master RENAME TO produtos;

-- ── FASE 6: Índices na nova produtos ──────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_produtos_categoria
  ON produtos(categoria);

-- ── VERIFICAÇÃO ───────────────────────────────────────────────────────────
-- Execute para confirmar:
--
--   SELECT COUNT(*) AS total_skus FROM produtos;
--   SELECT COUNT(DISTINCT sku) AS skus_unicos FROM produtos;
--   -- As duas devem ser iguais
--
--   SELECT COUNT(*) AS total_fotos FROM produto_imagens;
--   -- Deve ser igual ao total original de produtos_legacy
--
--   SELECT COUNT(*) FROM produtos_legacy;
--   -- Deve ser igual ao total_fotos acima
--
-- ── LIMPEZA (somente após validação completa em produção) ─────────────────
-- DROP TABLE produtos_legacy;
