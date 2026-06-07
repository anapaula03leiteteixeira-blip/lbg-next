# Epic 4 — Download ZIP de Fotos

**ID:** EPIC-4  
**Fase:** 4 (v4.6)  
**Status:** Draft  
**Owner:** Morgan (PM)  
**Data:** 2026-06-06 (revisado)  
**Depende de:** Nenhuma (independente)  

> **Histórico:** Epic originalmente chamado "Pipeline Canva Automatizado" com 4 stories. Stories 4.1 (marcar criada), 4.2 (status /agenda) e 4.4 (WhatsApp) descartadas em 06/06/2026 — gestão de agenda é responsabilidade da Gabi. Mantida apenas Story 4.3.

---

## Epic Goal

Permitir que a Gabi (e editores) baixem múltiplas fotos do catálogo em um único ZIP para uso no Canva e outras ferramentas de criação.

---

## Contexto do Sistema Existente

- **lbg-next:** Catálogo com ~896 fotos em Cloudinary + GitHub raw
- **Proxy `/api/download`:** Já resolve CORS para Cloudinary e GitHub raw
- **Gabi:** Precisará baixar fotos em lote para criar artes

---

## Stories

### Story 4.3 — Download ZIP de Seleção de Fotos

**Tipo:** Feature (UI + API)  
**Executor:** `@dev`  
**Quality Gate:** `@architect`  
**Esforço:** Médio (4–6h)  

**Descrição:** Permitir que o usuário selecione múltiplas fotos no catálogo e faça download de todas em um único arquivo ZIP.

**Acceptance Criteria:**
- [ ] Modo de seleção ativado via botão "Selecionar fotos" no catálogo
- [ ] Checkbox visível ao hover em cada card de produto
- [ ] Contador: "X fotos selecionadas"
- [ ] Botão "Baixar seleção (ZIP)" ativo quando ≥1 foto selecionada
- [ ] `POST /api/download/zip` recebe lista de `image_url` e retorna ZIP stream
- [ ] Nome do ZIP: `lbg-fotos-{data}.zip`
- [ ] Cada arquivo no ZIP nomeado: `{SKU}-{angulo}.{ext}`
- [ ] Limite: máx 50 fotos por ZIP (com aviso se exceder)
- [ ] Proxy server-side para resolver CORS (reutiliza lógica de `/api/download`)

**Quality Gate Tools:** `[zip_integrity_check, cors_validation, size_limit_check]`

---

## Compatibilidade

- [ ] Stories 4.1 e 4.2 apenas atualizam fluxo existente (aditivas)
- [ ] Story 4.3 adiciona modo de seleção no catálogo (não altera visão padrão)

## Risk Mitigation

- **Rollback:** Todas as stories são aditivas — reverter remove apenas as novas features, sem quebrar funcionalidades existentes

## Definition of Done

- [ ] Stories 4.1 e 4.2 — Ciclo de status da agenda completo (planejado→criado→publicado)
- [ ] Story 4.3 — Download ZIP funcionando em produção
- [ ] PRD atualizado para v5.0

---

*Handoff para @sm: Criar stories 4.1 e 4.2 primeiro (dependem de EPIC-2 concluído). Story 4.3 independente. Story 4.4 apenas após 4.1–4.3 concluídas.*
