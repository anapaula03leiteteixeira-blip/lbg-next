# Epic 3 — Integração Gabi ↔ lbg-next

**ID:** EPIC-3  
**Fase:** 2 (v4.5) — promovido de Fase 3  
**Status:** Draft  
**Owner:** Morgan (PM)  
**Data:** 2026-06-06 (revisado)  
**PRD Ref:** PRD-lbg-catalogo.md §13 Fase 2  
**Depende de:** EPIC-1 (endpoints /api/gabi/* já disponíveis — sem outras dependências)

---

## Epic Goal

Conectar o agente Gabi (social media La Bella Griffe) diretamente ao lbg-next como **fonte primária de dados de produtos e imagens**, substituindo PDFs do Google Drive por consultas dinâmicas à API. Gabi gerencia o calendário e a execução no próprio lado — lbg-next fornece os dados.

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
- [ ] lbg-next não requer mudanças (usa apenas endpoints já criados no EPIC-1)

## Risk Mitigation

- **Risco:** Token JWT expira (8h TTL) durante uso da Gabi
- **Mitigação:** Gabi armazena token e detecta 401 → solicita re-autenticação automática
- **Rollback:** Comandos novos são aditivos — remover os arquivos reverte para comportamento anterior

## Definition of Done

- [ ] Gabi consegue `*buscar-produto {SKU}` e obter dados completos (nome, cor, qualidade, image_url, descricao_marketing, tags)
- [ ] Gabi usa `image_url` Cloudinary como fonte primária de imagens para novos posts
- [ ] Gabi consegue `*fotos {SKU}` para ver todas as fotos do produto com ângulo e qualidade
- [ ] PRD atualizado para v4.5

---

*Handoff para @sm: Criar stories 3.1 e 3.3. Sequência: 3.1 → 3.3. EPIC-1 já concluído — endpoints disponíveis.*
