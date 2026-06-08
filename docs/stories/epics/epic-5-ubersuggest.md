# Epic 5 — Copies SEO Multi-Plataforma (Claude-Direct)

**ID:** EPIC-5  
**Fase:** 3 (v4.5 → v4.6)  
**Status:** Draft  
**Owner:** Morgan (PM)  
**Data:** 2026-06-07 (revisado — pivot de Ubersuggest para Claude-Direct)  
**Depende de:** EPIC-1 Done (script `generate-copies.ts` + tabela `produto_copies` já existem)

---

## Epic Goal

Gerar copies SEO otimizados para 5 plataformas (ML, Shopee, Amazon, Leroy Merlin, Madeira Madeira) usando Claude como engine principal de keywords + copies. Substitui a dependência do Ubersuggest MCP (OAuth bloqueante, sem API pública para ML/Shopee) por uma abordagem Claude-direct que usa os metadados do produto para gerar keywords relevantes e copies convertedores por plataforma em uma única chamada.

**Por que Claude-direct?**
- ML e Shopee não têm API pública de sugestão de keywords
- Ubersuggest MCP requer OAuth interativo — inviável em pipeline automatizada
- Claude já conhece padrões de SEO para e-commerce BR e limites de cada plataforma
- `generate-copies.ts` já existe (EPIC-1) — só precisa de upgrade de prompts

---

## Contexto do Sistema Existente

- **Script pronto:** `scripts/generate-copies.ts` — nunca executado, aguarda upgrade de prompts
- **Tabela `produto_copies`:** Schema criado (EPIC-1 Story 1.4), vazia, aguarda dados
- **~426 SKUs** em `produtos` com metadados (nome, categoria, material, cor, tags)
- **ANTHROPIC_API_KEY** configurada no `.env.local`
- **UI `/admin/copies`** já existe para visualizar o resultado

---

## Stories

### Story 5.1 — Upgrade de Prompts SEO em generate-copies.ts

**Tipo:** Research + Script  
**Executor:** `@dev`  
**Quality Gate:** `@analyst`  
**Esforço:** Pequeno (2–4h)  

**Descrição:** Usar o MCP Ubersuggest para extrair as palavras-chave de maior volume relacionadas às categorias e produtos La Bella (cubas, pastilhas, sanitários, etc.) e salvar um mapa de keywords por categoria/SKU.

**Acceptance Criteria:**
- [ ] Script `scripts/map-keywords.ts` consulta Ubersuggest via MCP para cada categoria: cuba, sanitario, pastilha, flexivel, acessorio
- [ ] Output: `src/data/keyword-map.json` com estrutura `{ categoria: string, keywords: { termo: string, volume: number, dificuldade: number }[] }[]`
- [ ] Mínimo 10 keywords por categoria, ordenadas por volume
- [ ] Flag `--sku {SKU}` para mapear keywords de um produto específico
- [ ] Log: categorias processadas, total de keywords encontradas
- [ ] TypeScript sem erros

**Quality Gate Tools:** `[data_integrity, json_schema_validation]`

---

### Story 5.2 — Enriquecimento de descricao_marketing com Keywords

**Tipo:** Script (CLI)  
**Executor:** `@dev`  
**Quality Gate:** `@qa`  
**Esforço:** Médio (4–6h)  

**Descrição:** Revisar o script `enrich-marketing.ts` para incorporar keywords do Ubersuggest no prompt do Claude, gerando descrições de marketing otimizadas para busca orgânica em vez de apenas descritivas.

**Acceptance Criteria:**
- [ ] Script lê `src/data/keyword-map.json` para obter keywords da categoria do produto
- [ ] Prompt Claude inclui: "Use naturalmente as seguintes palavras-chave de alto volume: {keywords}"
- [ ] Descrição gerada tem 2–3 frases, tom elegante, inclui ao menos 2 keywords de forma natural
- [ ] Flag `--dry-run` para preview sem gravar
- [ ] Flag `--sku {SKU}` para processar produto individual
- [ ] Flag `--categoria {cat}` para processar todos os produtos de uma categoria
- [ ] Rate limit respeitado: máx 10 req/min Anthropic
- [ ] Log: `[N/426] SKU → OK (keywords usadas: cuba embutir, cuba sobrepor) | ERRO`
- [ ] Custo estimado exibido antes de executar (`--estimate`)

**Quality Gate Tools:** `[keyword_inclusion_check, rate_limit_validation, cost_estimation]`

---

### Story 5.3 — Copies SEO enriquecidos com Keywords Ubersuggest

**Tipo:** Script (CLI)  
**Executor:** `@dev`  
**Quality Gate:** `@qa`  
**Esforço:** Médio (4–6h)  

**Descrição:** Revisar o script `generate-copies.ts` para usar keywords do Ubersuggest como input primário na geração de copies por plataforma, garantindo que títulos e descrições contenham os termos de maior volume para cada categoria.

**Acceptance Criteria:**
- [ ] Script lê `src/data/keyword-map.json` e `descricao_marketing` do produto como inputs texto-only (sem reenviar imagem)
- [ ] Cada plataforma recebe prompt especializado com keywords relevantes:
  - Amazon: keywords no início do título (algoritmo A9)
  - Shopee: keywords repetidas + emojis
  - Leroy Merlin / MadeiraMadeira: foco em especificações técnicas com keywords
  - Mercado Livre: atributos + marca + keywords
- [ ] Limits de caracteres por plataforma respeitados e validados antes de salvar
- [ ] Flag `--dry-run`, `--sku`, `--plataforma`, `--estimate`
- [ ] Grava em `produto_copies` via Supabase (UPSERT por `sku + plataforma`)
- [ ] Log: `[N/2130] LBG100IPANEMA × amazon → OK (título: 195 chars, 3 keywords)`

**Quality Gate Tools:** `[char_limit_validation, keyword_density_check, upsert_integrity]`

---

## Compatibilidade

- [ ] Scripts são aditivos — não alteram dados existentes salvo via flag explícito
- [ ] `produto_copies` usa UPSERT — re-execução é segura
- [ ] `keyword-map.json` é gerado localmente, não vai para banco

## Risk Mitigation

- **Risco:** Ubersuggest MCP sem dados suficientes para categorias nichadas
- **Mitigação:** Script com fallback para keywords genéricas da categoria se Ubersuggest retornar < 5 resultados
- **Rollback:** Scripts não destrutivos — falha em UPDATE não afeta produto

## Definition of Done

- [ ] `keyword-map.json` gerado com keywords reais para todas as categorias La Bella
- [ ] `descricao_marketing` enriquecida para todos os 426 SKUs
- [ ] `produto_copies` populado: 426 × 5 = 2.130 copies com keywords reais
- [ ] PRD atualizado para v4.5

---

*Handoff para @sm: Criar stories 5.1 → 5.2 → 5.3 nessa sequência. Pré-requisito: MCP Ubersuggest configurado.*
