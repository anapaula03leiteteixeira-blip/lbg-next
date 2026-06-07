# Epic 1 — Catálogo como Fonte de Verdade: Marketing + E-commerce

**ID:** EPIC-1  
**Fase:** 1 (v4.5)  
**Status:** Done  
**Owner:** Morgan (PM)  
**Data:** 2026-06-05 → Concluído 2026-06-06  
**PRD Ref:** PRD-lbg-catalogo.md §13 Fase 1  

---

## Epic Goal

Transformar o lbg-next na **fonte de verdade de produto** para dois públicos distintos:

1. **Time de Marketing / Gabi:** endpoints otimizados para consulta de produtos com descrições de marketing e agenda de conteúdo
2. **Time de E-commerce:** copies SEO gerados por IA para cada plataforma (Amazon, Mercado Livre, Shopee, Leroy Merlin, MadeiraMadeira), prontos para upload nos marketplaces

O catálogo centraliza foto, dados técnicos e copies — eliminando retrabalho manual e garantindo consistência de marca em todos os canais.

---

## Contexto do Sistema Existente

- **Stack:** Next.js 14 + TypeScript + Supabase + Cloudinary + Anthropic (Claude Sonnet 4.6)
- **Banco:** Modelo produto-cêntrico (Story 1.5): `produtos` (1 row/SKU, ~426 SKUs) + `produto_imagens` (N fotos/SKU), `usuarios` com RLS
- **Auth:** JWT customizado (jose) — role: admin/editor/viewer
- **Middleware:** Edge Runtime com proteção por role
- **URL produção:** https://lbg-next.vercel.app

**Padrões existentes a seguir:**
- Route handlers em `src/app/api/{recurso}/route.ts`
- Auth via cookie `lbg_token` → `jose.jwtVerify`
- Supabase via `lib/supabase.ts` (anon + service role)
- TypeScript estrito — sem `any`

---

## Stories

### Story 1.1 — Endpoints API Gabi (lista + detalhe)

**Tipo:** Feature (API)  
**Executor:** `@dev`  
**Quality Gate:** `@architect`  
**Esforço:** Pequeno (2–4h)  

**Descrição:** Criar dois endpoints RESTful otimizados para o agente Gabi consultar produtos:

- `GET /api/gabi/produtos` — lista com filtros (categoria, sku, qualidade_foto)
- `GET /api/gabi/produto/[sku]` — detalhe completo de um SKU específico

**Acceptance Criteria:**
- [ ] `GET /api/gabi/produtos?categoria=cuba` retorna array de produtos com campos: sku, nome_produto, categoria, cor_dominante, qualidade_foto, image_url, descricao_marketing, tags
- [ ] `GET /api/gabi/produto/[sku]` retorna produto completo ou 404 se inexistente
- [ ] Filtros suportados: `categoria`, `qualidade_foto`, `precisa_revisao`, `limit`, `offset`
- [ ] Autenticação: token JWT válido obrigatório (qualquer role)
- [ ] Response time < 500ms para lista de até 100 produtos
- [ ] TypeScript compilando sem erros (`npm run typecheck`)
- [ ] ESLint sem erros (`npm run lint`)

**Quality Gate Tools:** `[api_contract_validation, auth_check, typescript_strict]`

---

### Story 1.2 — Enriquecimento em Lote: descricao_marketing

**Tipo:** Feature (CLI + IA)  
**Executor:** `@dev`  
**Quality Gate:** `@architect`  
**Esforço:** Médio (4–8h)  

**Descrição:** Script CLI que processa os 435 produtos com `descricao_marketing` vazia ou fraca, enviando cada imagem para Claude Vision gerar uma frase de marketing persuasiva (~2 frases), e atualiza o banco via Supabase.

**Acceptance Criteria:**
- [ ] Script `scripts/enrich-marketing.ts` executável via `npx ts-node scripts/enrich-marketing.ts`
- [ ] Processa produtos em batches de 10 (evitar rate limit Anthropic)
- [ ] Flag `--dry-run` para preview sem gravar no banco
- [ ] Flag `--force` para re-processar mesmo produtos com descrição existente
- [ ] Flag `--sku {SKU}` para processar produto individual
- [ ] Log de progresso: `[N/435] SKU: LBG100IPANEMA → OK | ERRO`
- [ ] Log final: total processados, erros, custo estimado Anthropic
- [ ] Descrições geradas têm 1–3 frases, tom elegante, foco no diferencial visual
- [ ] Não sobrescreve `descricao_tecnica` — apenas `descricao_marketing`
- [ ] Rate limit: máx 10 req/min para API Anthropic (respeitando tier gratuito)
- [ ] TypeScript compilando sem erros

**Quality Gate Tools:** `[rate_limit_check, cost_estimation, data_integrity]`

---

### Story 1.3 — Gestão de Acesso Humano ✅ Done

**Tipo:** Operação (Imediato — sem código)  
**Executor:** Ana Paula (manual)  
**Quality Gate:** —  
**Esforço:** Mínimo (15 min)  
**Status:** Done (2026-06-05)

**Descrição:** Trocar a senha padrão do admin e cadastrar funcionários humanos relevantes via `/admin`.

> **Nota sobre Gabi:** Gabi é um agente de IA e **não precisa de registro em `usuarios`**. Ela autentica via `X-API-Key` (header `GABI_API_KEY`) — sem usuário, sem senha, sem entrada no banco. A redação original ("cadastrar Gabi com role editor") estava incorreta.

**Acceptance Criteria:**
- [x] Senha de `anapaula03.leiteteixeira@gmail.com` trocada (não mais `LBG@2026`)
- [x] Funcionários humanos cadastrados com role `viewer` ou `editor` conforme necessário
- [x] Todos os novos usuários conseguem fazer login com sucesso

**Concluído em:** 2026-06-05 por Ana Paula em https://lbg-next.vercel.app/admin

---

## Compatibilidade

- [ ] APIs existentes (`/api/produtos`, `/api/upload`) permanecem inalteradas
- [ ] Nenhuma mudança no schema do banco (apenas UPDATE de dados existentes)
- [ ] Middleware de proteção não é alterado

## Risk Mitigation

- **Risco:** Script de enriquecimento consumir crédito Anthropic excessivo
- **Mitigação:** Flag `--dry-run` obrigatório em primeiro uso; estimativa de custo exibida antes de executar
- **Rollback:** Script não destrutivo — falha em UPDATE não afeta produto (dados anteriores preservados)

### Story 1.4 — Copies SEO por Plataforma de E-commerce

**Tipo:** Feature (DB + IA + UI)  
**Executor:** `@dev`  
**Quality Gate:** `@architect`  
**Esforço:** Grande (8–14h)  

**Descrição:** Gerar e armazenar copies SEO otimizados para cada marketplace, usando Claude Vision com prompts especializados por plataforma. Cada plataforma tem formato, limite de caracteres e critérios de ranqueamento próprios.

**Especificações por Plataforma:**

| Plataforma | Título (chars) | Bullets | Descrição | SEO Focus |
|-----------|--------------|---------|-----------|-----------|
| Amazon | 200 | 5 bullets (255 chars cada) | HTML permitido | Palavras-chave no início do título |
| Mercado Livre | 60 | Não usa | 4.000 chars texto | Atributos do produto + marca |
| Shopee | 120 | Não usa | 3.000 chars | Emojis permitidos, palavras-chave repetidas |
| Leroy Merlin | 100 | 10 características | 1.000 chars técnica | Especificações técnicas + aplicação |
| MadeiraMadeira | 150 | Não usa | 2.000 chars | Dimensões + material + ambiente |

**Schema — nova tabela `produto_copies`:**
```sql
CREATE TABLE produto_copies (
  id            BIGSERIAL PRIMARY KEY,
  sku           TEXT NOT NULL,
  plataforma    TEXT NOT NULL CHECK (plataforma IN ('amazon','mercado_livre','shopee','leroy_merlin','madeira_madeira')),
  titulo        TEXT NOT NULL,
  bullets       TEXT[],        -- NULL para plataformas sem bullets
  descricao     TEXT NOT NULL,
  palavras_chave TEXT[],       -- backend keywords / tags SEO
  gerado_em     TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sku, plataforma)
);
```

**Acceptance Criteria:**
- [ ] Tabela `produto_copies` criada no Supabase com RLS (leitura: autenticado; escrita: admin/editor)
- [ ] Script `scripts/generate-copies.ts` gera copies para todos os 435 produtos × 5 plataformas
- [ ] Flag `--plataforma amazon` para processar apenas uma plataforma
- [ ] Flag `--sku {SKU}` para processar produto individual
- [ ] Flag `--dry-run` mostra output sem gravar no banco
- [ ] Cada copy respeita limites de caracteres da plataforma (validado antes de salvar)
- [ ] Título Amazon: palavras-chave de maior volume no início
- [ ] Bullets Amazon: cada bullet começa com benefício/feature em maiúscula
- [ ] Shopee: inclui 3–5 emojis relevantes no título e descrição
- [ ] Leroy Merlin / MadeiraMadeira: foco em especificações técnicas (material, dimensões, acabamento)
- [ ] Log: `[N/2175] LBG100IPANEMA × amazon → OK (título: 198 chars)`
- [ ] Custo estimado Anthropic exibido antes de executar (flag `--estimate`)
- [ ] Página `/admin/copies` lista copies por produto, com opção de editar manualmente
- [ ] `GET /api/copies?sku={SKU}` retorna todos os copies do produto
- [ ] `GET /api/copies?sku={SKU}&plataforma=amazon` retorna copy específico
- [ ] `PATCH /api/copies/{id}` permite edição manual (admin/editor)
- [ ] TypeScript compilando sem erros, ESLint sem erros

**Quality Gate Tools:** `[char_limit_validation, schema_validation, cost_estimation, rls_test]`

---

### Story 1.5 — Refactor: Modelo Produto-Cêntrico ✅ Done

**Tipo:** Refactor (DB + API)  
**Executor:** `@dev`  
**Quality Gate:** `@qa` + `@architect`  
**Esforço:** Grande (8–12h)  
**Status:** Done (2026-06-06)

**Descrição:** Migração do modelo foto-cêntrico (1 linha/foto em `produtos`) para produto-cêntrico (1 linha/SKU em `produtos` + N fotos em `produto_imagens`). Motivação: custo excessivo em `generate-copies.ts` que iterava 896 fotos em vez de 426 SKUs.

**O que foi entregue:**
- [x] Tabela `produto_imagens` criada com FK `sku → produtos ON DELETE CASCADE`
- [x] Tabela `produtos` refatorada: 1 row/SKU com campos derivados (`image_url`, `qualidade_foto`, `precisa_revisao` da melhor foto)
- [x] Smart PATCH handler: separa `PHOTO_KEYS` e `MASTER_KEYS`, atualiza tabela correta
- [x] `GET /api/produtos` retorna produtos com `imagens[]` embutidas via join em memória
- [x] `GET /api/produto-imagens` usa two-query join (sem PostgREST relation embedding)
- [x] `/relatorio` métricas corrigidas para agregar de `imagens[]`
- [x] `/editar` removidos campos foto-nível do formulário (SKU read-only)
- [x] `material_aparente = "vidro"` adicionado em 4 lugares (type, 2 UIs, prompt IA)
- [x] Migration `003-material-vidro-pastilhas.sql` corrigiu pastilhas de vidro com material "outro"
- [x] Commit `f2083cc` (Story 1.5) + `4e384a3` (material vidro) pushados para origin/main

**Backlog pós-deploy (não bloqueante):**
- Auth nos endpoints `PATCH/DELETE /api/produtos/[sku]` (ampliado pelo CASCADE)
- Drop `produtos_legacy` após 48h de validação
- Índice `idx_produto_imagens_criado_em` antes de ~5.000 fotos
- Paginação em `GET /api/produtos` antes de ~2.000 SKUs

---

## Definition of Done

- [x] Stories 1.1 e 1.2 implementadas (API Gabi + enriquecimento marketing)
- [x] Story 1.3 executada por Ana Paula (usuários criados, senha trocada)
- [x] Story 1.4 implementada (tabela copies + script + página admin + endpoints)
- [x] Story 1.5 implementada (modelo produto-cêntrico, duas tabelas, material vidro)
- [x] lint e typecheck passando
- [x] PRD atualizado para v4.5
- [ ] 426 produtos com `descricao_marketing` enriquecida (Story 1.2 — pendente execução do script)
- [ ] 426 × 5 = 2.130 copies SEO gerados e armazenados (Story 1.4 — pendente execução do script)

---

*Handoff para @sm: Criar stories 1.1, 1.2 e 1.4 com template padrão. Story 1.3 é operacional (sem código). Sequência recomendada: 1.3 (imediato, sem código) → 1.1 → 1.4 → 1.2.*
