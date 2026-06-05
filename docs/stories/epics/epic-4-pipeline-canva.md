# Epic 4 — Pipeline Canva Automatizado

**ID:** EPIC-4  
**Fase:** 4 (v5.0)  
**Status:** Draft  
**Owner:** Morgan (PM)  
**Data:** 2026-06-05  
**PRD Ref:** PRD-lbg-catalogo.md §13 Fase 4  
**Depende de:** EPIC-2 (agenda), EPIC-3 (integração Gabi)

---

## Epic Goal

Fechar o ciclo de produção de conteúdo: Gabi marca artes como "criado" após gerar no Canva, a agenda reflete o status em tempo real, e recursos adicionais (download ZIP de seleção, notificação WhatsApp) agilizam a operação diária.

---

## Contexto do Sistema Existente

- **lbg-next:** Agenda de conteúdo funcionando (Épico 2), Gabi integrada (Épico 3)
- **Canva MCP:** Disponível via `mcp__claude_ai_Canva__*` — permite gerar e exportar designs
- **Cloudinary:** CDN com signed URLs 1h — imagens em alta resolução disponíveis
- **Supabase:** Tabela `agenda_conteudo` com campo `status` (planejado→criado→publicado)
- **Agente Gabi:** Comandos `*criar-post`, `*buscar-produto`, `*agenda-hoje` funcionando

---

## Stories

### Story 4.1 — Marcar Arte como Criada após Canva

**Tipo:** Feature (CLI + API)  
**Executor:** `@dev`  
**Quality Gate:** `@architect`  
**Esforço:** Pequeno (2–4h)  

**Descrição:** Adicionar ao fluxo do agente Gabi o passo de marcar o item da agenda como `criado` após a arte ser gerada no Canva, atualizando o status no lbg-next automaticamente.

**Acceptance Criteria:**
- [ ] Ao completar `*criar-post {SKU}`, Gabi pergunta: "Arte criada no Canva? (s/n)"
- [ ] Se confirmado: `PATCH /api/agenda/{id}` atualiza `status → criado` e `atualizado_em`
- [ ] Comando `*marcar-criado {agenda_id}` para atualização manual
- [ ] Página `/agenda` reflete status `criado` imediatamente (sem reload manual)
- [ ] Feedback visual na agenda: badge "Criado ✓" em verde

**Quality Gate Tools:** `[api_contract_validation, status_transition_check]`

---

### Story 4.2 — Status de Artes na Página /agenda

**Tipo:** Feature (UI)  
**Executor:** `@dev`  
**Quality Gate:** `@architect`  
**Esforço:** Pequeno (2–3h)  

**Descrição:** Enriquecer a visualização da página `/agenda` com indicadores de progresso de produção por período (semana/mês).

**Acceptance Criteria:**
- [ ] Header da semana mostra: `X/Y posts criados` (progress bar)
- [ ] Filtro rápido: "Mostrar apenas pendentes" (status=planejado)
- [ ] Cards de post mostram badge de status com cores: planejado (cinza) · em_criacao (amarelo) · criado (verde) · publicado (azul)
- [ ] Botão "Marcar como publicado" no card após status=criado
- [ ] View mobile-friendly (grid responsivo)

**Quality Gate Tools:** `[accessibility_check, responsive_check]`

---

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

### Story 4.4 — Notificação WhatsApp ao Cadastrar Produto

**Tipo:** Feature (Webhook)  
**Executor:** `@dev`  
**Quality Gate:** `@architect`  
**Esforço:** Médio (4–6h)  
**Prioridade:** Baixa — implementar por último  

**Descrição:** Enviar notificação automática via WhatsApp (Evolution API ou similar) quando novo produto é cadastrado no sistema.

**Acceptance Criteria:**
- [ ] Ao `POST /api/produtos` com sucesso → trigger assíncrono de notificação
- [ ] Mensagem: "🆕 Novo produto cadastrado: {nome_produto} ({SKU}) — Categoria: {categoria}"
- [ ] Destinatário configurável via env var `WHATSAPP_NOTIFY_NUMBER`
- [ ] Falha na notificação NÃO bloqueia o cadastro do produto (fire-and-forget)
- [ ] Provider configurável via env: `WHATSAPP_PROVIDER` (evolution-api | callmebot | skip)
- [ ] `WHATSAPP_PROVIDER=skip` desativa sem error (para dev/test)
- [ ] Log de notificação em `.aiox/logs/whatsapp.log`

**Nota:** Requer escolha de provider WhatsApp Business API. Evolution API (self-hosted) ou CallMeBot (simples). Validar disponibilidade e custo antes de implementar.

**Quality Gate Tools:** `[async_error_handling, provider_validation, env_check]`

---

## Compatibilidade

- [ ] Stories 4.1 e 4.2 apenas atualizam fluxo existente (aditivas)
- [ ] Story 4.3 adiciona modo de seleção no catálogo (não altera visão padrão)
- [ ] Story 4.4 é fire-and-forget — falha não afeta fluxo principal

## Risk Mitigation

- **Risco:** WhatsApp API exige aprovação Business (4.4) — pode atrasar
- **Mitigação:** Provider `callmebot` não requer aprovação formal; flag `skip` mantém sistema funcional enquanto provider não está configurado
- **Rollback:** Todas as stories são aditivas — reverter remove apenas as novas features, sem quebrar funcionalidades existentes

## Definition of Done

- [ ] Stories 4.1 e 4.2 — Ciclo de status da agenda completo (planejado→criado→publicado)
- [ ] Story 4.3 — Download ZIP funcionando em produção
- [ ] Story 4.4 — Notificação WhatsApp ativa (ou documentada para implementação futura)
- [ ] PRD atualizado para v5.0

---

*Handoff para @sm: Criar stories 4.1 e 4.2 primeiro (dependem de EPIC-2 concluído). Story 4.3 independente. Story 4.4 apenas após 4.1–4.3 concluídas.*
