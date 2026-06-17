# EPIC-7 — UX Galeria & Catálogo

**Projeto:** La Bella Griffe — Sistema de Catálogo  
**Status:** Em andamento  
**Prioridade:** Média — melhoria de usabilidade do fluxo principal  
**Criado:** 2026-06-17  
**Origem:** Análise UX realizada por @ux-design-expert (Uma) em 2026-06-17

---

## Objetivo

Melhorar a experiência de navegação na galeria de fotos e no catálogo de produtos com base em análise de usabilidade. Foco em: ordenação inteligente de fotos, visualização de ângulos, controles de sort no catálogo e polish de micro-interações.

---

## Stories

| Story | Título | Status | Prioridade |
|-------|--------|--------|------------|
| 7.1 | Ordenação inteligente de fotos na galeria | Draft | Alta |
| 7.2 | Labels de ângulo nos thumbnails | Draft | Alta |
| 7.3 | Ordenação de produtos no catálogo | Draft | Média |
| 7.4 | UX polish — toast, contador e botão duplicado | Draft | Baixa |

---

## Dependências

- Nenhuma dependência de outros EPICs
- Arquivo afetado principal: `src/app/catalogo/page.tsx`
- Independente — pode ser desenvolvido a qualquer momento

---

## Critérios de Encerramento do EPIC

- Todas as 4 stories com status Done
- Nenhuma regressão nas funcionalidades existentes (galeria, download, modal)
- `npm run lint` + `npm run typecheck` passando sem erros
