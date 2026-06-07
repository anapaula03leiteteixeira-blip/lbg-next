# LBG Next — Épicos do Roadmap

**Projeto:** La Bella Griffe — Sistema de Catálogo  
**Sistema em produção:** https://lbg-next.vercel.app  
**Versão atual:** v4.5  
**Última atualização:** 2026-06-06
**Versão:** v4.5 (EPIC-0 Done, EPIC-1 Done — EPIC-2 próximo)  

---

## Visão Geral do Roadmap

```
EPIC-0 (Done)   → Auth & Segurança
EPIC-1 (Done)   → API Gabi + Modelo Produto-Cêntrico
   ↓
EPIC-3 (Próximo) → Gabi acessa fotos e dados do lbg-next via CLI
   ↓
EPIC-5 (Novo)   → Enriquecimento com Ubersuggest (keywords reais)
   ↓
EPIC-4 (slim)   → Download ZIP de fotos

EPIC-2 → DESCARTADO (agenda gerenciada pela Gabi, não pelo lbg-next)
```

---

## Épicos

| ID | Nome | Fase | Status | Stories | Arquivo |
|----|------|------|--------|---------|---------|
| EPIC-0 | Auth & Segurança: Reset e Magic Link | 0 / v4.5 | **Done** | 3/3 | [epic-0-auth-seguranca.md](epics/epic-0-auth-seguranca.md) |
| EPIC-1 | API Gabi: lbg-next como Fonte de Verdade | 1 / v4.5 | **Done** | 5/5 | [epic-1-api-gabi.md](epics/epic-1-api-gabi.md) |
| EPIC-2 | Agenda de Conteúdo | — | **Descartado** | — | [epic-2-agenda-conteudo.md](epics/epic-2-agenda-conteudo.md) |
| EPIC-3 | Integração Gabi ↔ lbg-next | 2 / v4.5 | Draft | 2 | [epic-3-integracao-gabi.md](epics/epic-3-integracao-gabi.md) |
| EPIC-5 | Enriquecimento com Ubersuggest | 3 / v4.5 | Draft | 3 | [epic-5-ubersuggest.md](epics/epic-5-ubersuggest.md) |
| EPIC-4 | Download ZIP de Fotos | 4 / v4.6 | Draft | 1 | [epic-4-pipeline-canva.md](epics/epic-4-pipeline-canva.md) |

---

## Dependências

- **EPIC-0** → Done
- **EPIC-1** → Done (pré-requisito para EPIC-3)
- **EPIC-2** → Descartado
- **EPIC-3** → depende de EPIC-1 (endpoints /api/gabi/* já disponíveis)
- **EPIC-5** → depende de configuração do MCP Ubersuggest (@devops)
- **EPIC-4** → independente (pode rodar a qualquer momento)

## Sequência de Implementação

```
EPIC-3 — Gabi acessa produtos/fotos (Stories 3.1 + 3.3)
    ↓
EPIC-5 — Enriquecimento Ubersuggest (MCP → keywords → descricao_marketing + copies)
    ↓
EPIC-4 — Download ZIP (Story 4.3)
```

## Próximo Passo — EPIC-3

EPIC-1 concluído em 2026-06-06. EPIC-2 descartado (agenda gerenciada pela Gabi).

**Próximo:** Story 3.1 (`*buscar-produto`) + Story 3.3 (`*fotos`) — Gabi acessa lbg-next via CLI.

Pré-requisito operacional: configurar MCP Ubersuggest via `@devops` antes de iniciar EPIC-5.

---

## Stories Ativas

Pasta: `docs/stories/active/`  
Padrão de nome: `{epicNum}.{storyNum}.story.md`

| Story | Arquivo | Status |
|---|---|---|
| 0.1 Troca de senha | [0.1.troca-de-senha.story.md](active/0.1.troca-de-senha.story.md) | **Done** |
| 0.2 Reset de senha via email | [0.2.reset-senha-email.story.md](active/0.2.reset-senha-email.story.md) | **Done** |
| 0.3 Magic link | [0.3.magic-link.story.md](active/0.3.magic-link.story.md) | **Done** |
| 1.1 API Gabi endpoints | [1.1.api-gabi-endpoints.story.md](active/1.1.api-gabi-endpoints.story.md) | **Done** |
| 1.2 Enriquecimento marketing | [1.2.enriquecimento-descricao-marketing.story.md](active/1.2.enriquecimento-descricao-marketing.story.md) | **Done** (script pronto — execução revisada para Ubersuggest) |
| 1.4 Copies SEO | [1.4.copies-seo-plataformas.story.md](active/1.4.copies-seo-plataformas.story.md) | **Done** (script pronto — execução revisada para Ubersuggest) |
| 1.5 Refactor modelo produto-cêntrico | [1.5.refactor-produto-imagens.story.md](active/1.5.refactor-produto-imagens.story.md) | **Done** |
| 3.1 Gabi buscar-produto | — | **Próxima** |
| 3.3 Gabi fotos Cloudinary | — | **Próxima** |
