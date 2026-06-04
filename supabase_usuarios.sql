-- ═══════════════════════════════════════════════════════════════
-- La Bella Griffe — Tabela de Usuários com Roles
-- Execute no Supabase: SQL Editor → New Query → Run
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS usuarios (
  id            BIGSERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  nome          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'viewer'
                  CHECK (role IN ('admin','editor','viewer')),
  password_hash TEXT NOT NULL,
  ativo         BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em     TIMESTAMPTZ DEFAULT NOW(),
  ultimo_acesso TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_role  ON usuarios(role);

-- Apenas service_role key pode acessar (API server-side)
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "block_anon" ON usuarios USING (false);

-- ── Migrar admin atual ──────────────────────────────────────────
-- Senha padrão: LBG@2026
INSERT INTO usuarios (email, nome, role, password_hash)
VALUES (
  'anapaula03.leiteteixeira@gmail.com',
  'Ana Paula',
  'admin',
  '$2a$10$.zuVS2D3kh4mH19gU8buh.8EQEnPOwg5jYf2N7k7JVWdaV7.JKg3m'
)
ON CONFLICT (email) DO NOTHING;
