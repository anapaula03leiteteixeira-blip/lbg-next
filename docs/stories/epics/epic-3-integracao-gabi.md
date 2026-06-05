# Epic 3 — Integração Gabi ↔ lbg-next

**ID:** EPIC-3  
**Fase:** 3 (v4.6)  
**Status:** Draft  
**Owner:** Morgan (PM)  
**Data:** 2026-06-05  
**PRD Ref:** PRD-lbg-catalogo.md §13 Fase 3  
**Depende de:** EPIC-1 (Story 1.1 — endpoints /api/gabi/*), EPIC-2 (Story 2.3 — /api/gabi/agenda)

---

## Epic Goal

Conectar o agente Gabi (social media La Bella Griffe) diretamente ao lbg-next como fonte primária de dados de produtos e agenda, substituindo PDFs do Google Drive e imagens locais por consultas dinâmicas à API.

---

## Contexto do Sistema Existente

- **lbg-next:** Next.js 14 em https://lbg-next.vercel.app — endpoints /api/gabi/* já disponíveis (Épico 1)
- **Agente Gabi:** v6 implementada em `C:\Users\DELL\Downloads\lbg-next` — scripts `upload-drive.js` e `gerar-legenda-docx.js`
- **Google Drive:** PDFs de produtos usados hoje por Gabi (a substituir)
- **Cloudinary:** Images com URL permanente e signed URLs (1h TTL)
- **Integração atual:** Gabi usa PDFs estáticos — sem conexão com lbg-next

---

## Stories

### Story 3.1 — Comando *buscar-produto no Agente Gabi

**Tipo:** Feature (CLI)  
**Executor:** `@dev`  
**Quality Gate:** `@architect`  
**Esforço:** Médio (4–6h)  

**Descrição:** Adicionar ao agente Gabi o comando `*buscar-produto {SKU}` que consulta `/api/gabi/produto/[sku]` no lbg-next e retorna dados formatados para uso imediato na geração de conteúdo.

**Acceptance Criteria:**
- [ ] Comando `*buscar-produto LBG100IPANEMA` retorna: nome, categoria, cor, qualidade_foto, image_url, descricao_marketing, tags
- [ ] Imagem exibida como URL Cloudinary pronta para uso no Canva ou caption
- [ ] Fallback: se produto não encontrado → mensagem clara "Produto {SKU} não encontrado no catálogo"
- [ ] Autenticação: usa token JWT da sessão Gabi (armazenado em env ou config local)
- [ ] Comando `*listar-produtos --categoria=cuba` lista produtos filtrados por categoria
- [ ] TypeScript/Node.js compatível com ambiente da Gabi

**Quality Gate Tools:** `[api_contract_validation, auth_token_check]`

---

### Story 3.2 — Comando *agenda-hoje no Agente Gabi

**Tipo:** Feature (CLI)  
**Executor:** `@dev`  
**Quality Gate:** `@architect`  
**Esforço:** Pequeno (2–4h)  

**Descrição:** Comando `*agenda-hoje` e `*agenda-semana` que consulta `/api/gabi/agenda` e exibe o planejamento de conteúdo formatado para ação imediata.

**Acceptance Criteria:**
- [ ] `*agenda-hoje` retorna posts do dia atual formatados: plataforma, tipo_post, produto (SKU + nome + imagem), legenda sugerida, status
- [ ] `*agenda-semana` retorna posts da semana atual agrupados por dia
- [ ] Posts com status `planejado` mostrados com ícone de ação pendente
- [ ] Posts com status `criado` ou `publicado` mostrados como concluídos
- [ ] Sem posts no dia → mensagem "Nenhum post planejado para hoje"
- [ ] Output formatado em Markdown para fácil leitura no terminal/chat

**Quality Gate Tools:** `[api_contract_validation, date_handling]`

---

### Story 3.3 — Substituição de PDFs por image_url Cloudinary

**Tipo:** Feature (CLI + Config)  
**Executor:** `@dev`  
**Quality Gate:** `@architect`  
**Esforço:** Pequeno (2–3h)  

**Descrição:** Atualizar o agente Gabi para usar `image_url` Cloudinary do lbg-next como fonte primária de imagens, em vez de PDFs do Google Drive.

**Acceptance Criteria:**
- [ ] Ao gerar legenda/post via `*criar-post {SKU}`, imagem vem automaticamente de `image_url` do lbg-next
- [ ] Se produto tem múltiplas fotos, Gabi recebe lista de URLs para escolher a melhor
- [ ] Comando `*fotos {SKU}` lista todas as imagens do produto com qualidade_foto e ângulo
- [ ] PDFs do Drive não são mais consultados para novos posts (apenas legado)
- [ ] Fallback documentado: se lbg-next offline → mensagem de erro claro

**Quality Gate Tools:** `[url_validation, fallback_check]`

---

## Compatibilidade

- [ ] Gabi v6 existente continua funcionando (novos comandos são aditivos)
- [ ] Scripts `upload-drive.js` e `gerar-legenda-docx.js` não são alterados
- [ ] lbg-next não requer mudanças (usa apenas endpoints já criados no Épico 1 e 2)

## Risk Mitigation

- **Risco:** Token JWT expira (8h TTL) durante uso da Gabi
- **Mitigação:** Gabi armazena token e detecta 401 → solicita re-autenticação automática
- **Rollback:** Comandos novos são aditivos — remover os arquivos reverte para comportamento anterior

## Definition of Done

- [ ] Gabi consegue `*buscar-produto {SKU}` e obter dados completos
- [ ] Gabi consegue `*agenda-hoje` e ver planejamento
- [ ] Gabi usa Cloudinary como fonte de imagens para novos posts
- [ ] PRD atualizado para v4.6

---

*Handoff para @sm: Criar stories 3.1, 3.2 e 3.3. Sequência: 3.1 → 3.2 → 3.3. Requer EPIC-1 Story 1.1 concluída.*
