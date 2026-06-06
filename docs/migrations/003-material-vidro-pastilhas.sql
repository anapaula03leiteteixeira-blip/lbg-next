-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 003: Adicionar material 'vidro' e corrigir pastilhas de vidro
-- Execute no Supabase: SQL Editor → New Query → Run
-- ═══════════════════════════════════════════════════════════════════════════
-- CONTEXTO:
--   Pastilhas de vidro foram classificadas com material_aparente = 'outro'
--   porque 'vidro' não existia como opção no enum do Claude Vision.
--   Esta migration corrige o dado histórico nas duas tabelas.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── PRÉ-VISUALIZAÇÃO (rode antes para confirmar o escopo) ─────────────────
-- Quantos registros serão afetados em produtos:
-- SELECT COUNT(*) FROM produtos WHERE categoria = 'pastilha' AND material_aparente = 'outro';
--
-- Quantos registros serão afetados em produto_imagens:
-- SELECT COUNT(*) FROM produto_imagens WHERE material_aparente = 'outro'
--   AND sku IN (SELECT sku FROM produtos WHERE categoria = 'pastilha');
--
-- Lista dos SKUs afetados:
-- SELECT sku, nome_produto, material_aparente FROM produtos
--   WHERE categoria = 'pastilha' AND material_aparente = 'outro';
-- ─────────────────────────────────────────────────────────────────────────

-- ── FASE 1: Corrigir produto_imagens (fotos individuais) ──────────────────

UPDATE produto_imagens
SET material_aparente = 'vidro'
WHERE material_aparente = 'outro'
  AND sku IN (
    SELECT sku FROM produtos WHERE categoria = 'pastilha'
  );

-- ── FASE 2: Corrigir produtos master ──────────────────────────────────────

UPDATE produtos
SET    material_aparente = 'vidro',
       atualizado_em     = NOW()
WHERE  categoria          = 'pastilha'
  AND  material_aparente  = 'outro';

-- ── VERIFICAÇÃO ───────────────────────────────────────────────────────────
-- Execute após para confirmar:
--
--   SELECT COUNT(*) FROM produtos
--     WHERE categoria = 'pastilha' AND material_aparente = 'vidro';
--   -- Deve ser igual à contagem do SELECT inicial
--
--   SELECT COUNT(*) FROM produtos
--     WHERE categoria = 'pastilha' AND material_aparente = 'outro';
--   -- Deve ser 0
