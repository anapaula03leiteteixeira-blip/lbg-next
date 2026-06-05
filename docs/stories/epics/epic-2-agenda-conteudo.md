# Epic 2 — Agenda de Conteúdo

**ID:** EPIC-2  
**Fase:** 2 (v4.5)  
**Status:** Draft  
**Owner:** Morgan (PM)  
**Data:** 2026-06-05  
**PRD Ref:** PRD-lbg-catalogo.md §13 Fase 2  
**Depende de:** EPIC-1 (Story 1.3 — Gabi cadastrada no sistema)

---

## Epic Goal

Criar um módulo de planejamento de conteúdo semanal/mensal dentro do lbg-next, permitindo que Ana Paula agende posts por produto/SKU, e que a Gabi consulte via endpoint o que produzir em cada data.

---

## Contexto do Sistema Existente

- **Stack:** Next.js 14 + TypeScript + Supabase + Cloudinary
- **Padrões:** Route handlers em `src/app/api/`, pages em `src/app/`, Tailwind CSS
- **Roles:** Admin planeja agenda; Editor/Viewer consultam
- **Supabase:** Projeto `fjzcypjldbxkcumydyzp`, RLS ativo em todas as tabelas

---

## Stories

### Story 2.1 — Tabela agenda_conteudo no Supabase

**Tipo:** Database  
**Executor:** `@data-engineer`  
**Quality Gate:** `@dev`  
**Esforço:** Pequeno (1–2h)  

**Descrição:** Criar tabela `agenda_conteudo` no Supabase com RLS apropriado para o fluxo de planejamento de conteúdo.

**Schema proposto:**
```sql
CREATE TABLE agenda_conteudo (
  id          BIGSERIAL PRIMARY KEY,
  data_post   DATE NOT NULL,
  sku         TEXT NOT NULL,
  plataforma  TEXT NOT NULL CHECK (plataforma IN ('instagram', 'facebook', 'whatsapp', 'outro')),
  tipo_post   TEXT NOT NULL CHECK (tipo_post IN ('foto', 'carrossel', 'reels', 'story')),
  legenda     TEXT,
  status      TEXT NOT NULL DEFAULT 'planejado' CHECK (status IN ('planejado', 'em_criacao', 'criado', 'publicado')),
  observacoes TEXT,
  criado_por  TEXT NOT NULL,
  criado_em   TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);
```

**Acceptance Criteria:**
- [ ] Tabela `agenda_conteudo` criada no Supabase
- [ ] RLS ativo: qualquer usuário autenticado pode SELECT; apenas admin/editor podem INSERT/UPDATE/DELETE
- [ ] Foreign key implícita: `sku` deve existir em `produtos` (via CHECK na aplicação, não FK rígida para flexibilidade)
- [ ] Índice em `data_post` para queries por período
- [ ] Índice em `sku` para queries por produto
- [ ] Migration SQL documentada em `docs/migrations/002-agenda-conteudo.sql`

**Quality Gate Tools:** `[schema_validation, rls_test, index_check]`

---

### Story 2.2 — Página /agenda (Planejamento)

**Tipo:** Feature (UI + API)  
**Executor:** `@dev`  
**Quality Gate:** `@architect`  
**Esforço:** Médio (6–10h)  

**Descrição:** Criar a página `/agenda` com visão semanal/mensal para planejamento de conteúdo. Admin e Editor podem criar, editar e atualizar status dos posts planejados.

**Acceptance Criteria:**
- [ ] Rota `/agenda` acessível a admin e editor (viewer → redirect `/catalogo`)
- [ ] Visão mensal: grid de calendário com posts por dia
- [ ] Visão semanal: lista detalhada da semana atual
- [ ] Formulário de criação: data, SKU (com autocomplete dos produtos), plataforma, tipo_post, legenda, observações
- [ ] SKU selecionado mostra thumbnail do produto
- [ ] Status pode ser atualizado inline: planejado → em_criacao → criado → publicado
- [ ] Filtro por plataforma (instagram, facebook, etc.)
- [ ] `GET /api/agenda` retorna lista com filtros: `data_inicio`, `data_fim`, `sku`, `status`, `plataforma`
- [ ] `POST /api/agenda` cria novo item (admin/editor)
- [ ] `PATCH /api/agenda/[id]` atualiza status ou campos (admin/editor)
- [ ] `DELETE /api/agenda/[id]` exclui item (admin only)
- [ ] TypeScript sem erros, ESLint sem erros

**Quality Gate Tools:** `[api_contract_validation, role_check, typescript_strict]`

---

### Story 2.3 — Endpoint /api/gabi/agenda

**Tipo:** Feature (API)  
**Executor:** `@dev`  
**Quality Gate:** `@architect`  
**Esforço:** Pequeno (2–3h)  

**Descrição:** Endpoint otimizado para o agente Gabi consultar o que produzir em cada data, com dados enriquecidos do produto (nome, imagem, descrição de marketing).

**Acceptance Criteria:**
- [ ] `GET /api/gabi/agenda?data=2026-06-10` retorna posts planejados para a data com dados do produto: sku, nome_produto, image_url, descricao_marketing, plataforma, tipo_post, legenda, status
- [ ] `GET /api/gabi/agenda?semana=2026-W24` retorna posts da semana (formato ISO 8601)
- [ ] Resposta inclui join automático com tabela `produtos`
- [ ] Autenticação JWT obrigatória (qualquer role)
- [ ] Response time < 300ms

**Quality Gate Tools:** `[api_contract_validation, join_query_optimization]`

---

## Compatibilidade

- [ ] Nenhuma rota ou API existente é modificada
- [ ] Nova tabela isolada — sem impacto em `produtos` ou `usuarios`
- [ ] Sidebar atualizada para incluir link `/agenda` para admin/editor

## Risk Mitigation

- **Risco:** Schema da agenda mudar conforme Gabi usa e dá feedback
- **Mitigação:** Campos `observacoes` e `tipo_post` flexíveis; schema simples extensível
- **Rollback:** `DROP TABLE agenda_conteudo` remove tudo sem impacto nas demais tabelas

## Definition of Done

- [ ] Migration 002 aplicada no Supabase
- [ ] Página `/agenda` funcionando em produção
- [ ] Endpoints `/api/agenda` e `/api/gabi/agenda` respondendo
- [ ] Gabi consegue consultar agenda via endpoint
- [ ] PRD atualizado para v4.5

---

*Handoff para @sm: Criar stories 2.1, 2.2 e 2.3. Sequência obrigatória: 2.1 → 2.2 → 2.3.*
