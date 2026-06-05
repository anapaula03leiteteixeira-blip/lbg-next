# LBG Next — Épicos do Roadmap

**Projeto:** La Bella Griffe — Sistema de Catálogo  
**Sistema em produção:** https://lbg-next.vercel.app  
**Versão atual:** v4.4  
**Última atualização:** 2026-06-05  

---

## Visão Geral do Roadmap

```
EPIC-1 (Fase 1 / v4.5)   → API Gabi + Enriquecimento
   ↓
EPIC-2 (Fase 2 / v4.5)   → Agenda de Conteúdo
   ↓
EPIC-3 (Fase 3 / v4.6)   → Integração Gabi ↔ lbg-next
   ↓
EPIC-4 (Fase 4 / v5.0)   → Pipeline Canva + ZIP + WhatsApp
```

---

## Épicos

| ID | Nome | Fase | Status | Stories | Arquivo |
|----|------|------|--------|---------|---------|
| EPIC-1 | API Gabi: lbg-next como Fonte de Verdade | 1 / v4.5 | Draft | 3 | [epic-1-api-gabi.md](epics/epic-1-api-gabi.md) |
| EPIC-2 | Agenda de Conteúdo | 2 / v4.5 | Draft | 3 | [epic-2-agenda-conteudo.md](epics/epic-2-agenda-conteudo.md) |
| EPIC-3 | Integração Gabi ↔ lbg-next | 3 / v4.6 | Draft | 3 | [epic-3-integracao-gabi.md](epics/epic-3-integracao-gabi.md) |
| EPIC-4 | Pipeline Canva Automatizado | 4 / v5.0 | Draft | 4 | [epic-4-pipeline-canva.md](epics/epic-4-pipeline-canva.md) |

---

## Dependências

- **EPIC-1** → independente (pré-requisito para todos)
- **EPIC-2** → depende de EPIC-1 (Story 1.3: Gabi cadastrada)
- **EPIC-3** → depende de EPIC-1 (Story 1.1: endpoints /api/gabi/*)
- **EPIC-4** → depende de EPIC-2 e EPIC-3

---

## Sequência de Implementação — EPIC-1

```
Story 1.3 (Ana Paula — manual, /admin — sem código)
    ↓
Story 1.1 (API Gabi — endpoints de consulta)
    ↓
Story 1.2 (Enriquecimento — Claude Vision → descricao_marketing)
    ↓ (Story 1.4 depende de 1.2 — usa descricao_marketing como input texto-only)
Story 1.4 (Copies SEO — texto-only, ~6× mais barato que Vision)
```

**Lógica da sequência:**
- Story 1.2 envia a **imagem** ao Claude Vision (1 chamada/produto) → grava `descricao_marketing`
- Story 1.4 usa `descricao_marketing` como input **textual** → 5 copies/produto sem reenviar imagem
- Custo Story 1.4 texto-only: ~$12 vs. ~$72 se fosse Vision — 6× economia

## Próximo Passo Imediato (sem código)

**Story 1.3 — Operacional (15 min):**
1. Acessar https://lbg-next.vercel.app/admin
2. Trocar senha do admin (não usar mais `LBG@2026`)
3. Cadastrar Gabi com role `editor`
4. Cadastrar demais funcionários necessários

---

## Stories Ativas

Pasta: `docs/stories/active/`  
Padrão de nome: `{epicNum}.{storyNum}.story.md`

*Nenhuma story ativa no momento — aguardando @sm criar a partir dos épicos.*
