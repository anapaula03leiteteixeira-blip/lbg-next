# PRD — La Bella Griffe: Sistema de Catálogo de Produtos

**Versão:** 4.6 (rev 2)
**Data:** 2026-06-08
**Status:** Em produção
**Owner:** Ana Paula Teixeira (anapaula03.leiteteixeira@gmail.com)
**URL:** https://lbg-next.vercel.app

---

## 1. Visão Geral

Sistema web interno para **catalogar, consultar e gerenciar fotos de produtos hidráulicos** da La Bella Griffe (cubas, sanitários, flexíveis, rejunte, acessórios). Substitui o processo manual de organização em pastas e planilhas Excel.

Usuários autenticados por email + senha com três perfis de acesso (admin, editor, viewer).

---

## 2. Histórico de Versões

| Versão | Entrega | Status | Data |
|--------|---------|--------|------|
| v1 — `organizer.py` | Script Python CLI + Claude Vision em lote | Concluído | 2026-06-03 |
| v2 — Streamlit | App Python + Supabase + Cloudinary | Substituído | 2026-06-03 |
| v3 — Next.js | App web com auth, galeria, upload IA | Substituído | 2026-06-03 |
| v4 — Next.js | Multi-foto, revisão, admin de usuários | Substituído | 2026-06-03 |
| v4.1 — Next.js | Download de fotos no carrossel | Substituído | 2026-06-04 |
| v4.2 — Next.js | Upload em lote ZIP + dedup + catálogo LBG + melhorias catálogo | Substituído | 2026-06-05 |
| v4.3 — Next.js | Correções UI: pastilha em todos os dropdowns, botão lote destacado, modal What's New, brand redesign (Playfair Display + paleta La Bella) | Substituído | 2026-06-05 |
| v4.4 — Next.js | Sprint QA completo (H1–M5 + L1–L3): 10 bugs corrigidos no pipeline de upload. Multi-foto queue em Novo Produto. Instruções de uso em lote e individual. Correção CSS keyframes fadeUp. | Substituído | 2026-06-05 |
| v4.5 — Next.js | EPIC-1 completo: API Gabi (endpoints /api/gabi/*), enriquecimento descricao_marketing, copies SEO 5 plataformas, refactor modelo produto-cêntrico (produtos + produto_imagens), material "vidro" adicionado. | Em produção | 2026-06-06 |
| **v4.6 — Next.js** | **EPIC-5 Story 5.1: upgrade de prompts SEO (contexto de marca, prompts por plataforma, COPY_LIMITS corretos, fix 422 guard, todos os 129 SKUs elegíveis). Story 5.2: batch generation em execução (645 copies × 5 plataformas).** | **Em produção** | 2026-06-08 |

---

## 3. Problema

- Fotos armazenadas em pastas locais sem padrão, inacessíveis remotamente
- Sem busca rápida por SKU, cor, categoria ou qualidade
- Gabi (designer) e funcionários sem acesso centralizado
- Cadastro de novos produtos manual, sem metadados
- Impossível saber qualidade das fotos sem abrir individualmente
- Fotos com classificação incerta não tinham workflow de resolução
- Sem controle de quem acessa ou edita o sistema

---

## 4. Funcionalidades (v4)

### 4.1 Páginas e Rotas

| Rota | Perfis | Funcionalidade |
|------|--------|---------------|
| `/login` | Público | Autenticação por email + senha |
| `/catalogo` | Todos | Galeria filtrável com modal multi-foto, visual de vitrine |
| `/novo` | Admin, Editor | Upload individual + Claude Vision → Supabase + Cloudinary |
| `/novo/bulk` | Admin, Editor | Upload em lote via ZIP com dedup e catálogo LBG |
| `/editar` | Admin, Editor | Buscar produto, editar campos, excluir |
| `/revisar` | Admin, Editor | Fila de revisão com 4 ações por foto |
| `/relatorio` | Todos | Métricas, gráficos, exportação CSV |
| `/admin` | Admin | Gestão de usuários e permissões |

### 4.2 Upload em Lote via ZIP (`/novo/bulk`) — v4.2

Importação de múltiplas fotos de uma vez, com detecção automática de duplicatas e identificação de SKU.

**Fluxo:**
1. Usuário arrasta ou seleciona um arquivo `.zip` (máx 200MB)
2. Sistema extrai imagens client-side (JSZip), filtra `__MACOSX`, `._*` e subpastas > 1 nível
3. Para cada imagem: computa SHA-256, busca hashes existentes no banco, identifica SKU pela pasta/nome do arquivo
4. Lookup no catálogo LBG (`src/data/sku-catalog.json`) confirma o SKU com nome e categoria
5. Preview em grade com badge de status e SKU/nome identificado
6. Usuário seleciona fotos e clica "Importar"
7. Cada foto: `POST /api/upload` (Claude Vision + Cloudinary) → `POST /api/produtos` (Supabase)
8. Tela de conclusão com contagem e log de erros detalhado expandível

**Detecção de duplicatas:**
| Badge | Critério |
|-------|----------|
| 🔴 Duplicado | SHA-256 idêntico a foto já no banco OU mesma foto dentro do ZIP |
| 🟡 Verificar | `arquivo_original` (relativePath) coincide com registro existente |
| 🟢 Novo | Sem correspondência — selecionado por padrão |

**Catálogo LBG (`src/data/sku-catalog.json`):**
- 60+ SKUs com nome, categoria, tipo e tags
- Categorias: cuba, sanitario, pastilha (vidro e cerâmica), acessorio, flexivel
- Lookup: match exato → prefixo → palavras em tags/nome
- Match no catálogo: SKU e categoria do catálogo têm prioridade máxima sobre a IA

**Log de erros:**
- Erros identificados por etapa: `[Claude Vision]`, `[Cloudinary]`, `[Salvar DB]`
- Painel expandível na tela de conclusão com arquivo e mensagem
- Botão "Copiar log" para debug e suporte

### 4.3 Multi-Foto Queue em Novo Produto (`/novo`) — v4.4

Upload de múltiplas fotos do mesmo produto em uma única sessão, sem precisar repetir SKU e nome.

**Fluxo:**
1. Editor arrasta ou seleciona N fotos de uma vez na zona de upload
2. Todas as fotos entram em uma fila com thumbnails indicadores
3. SKU, nome e categoria informados uma vez → reutilizados em todas as fotos
4. A IA classifica cada foto individualmente (ângulo, qualidade, material, fundo)
5. Após salvar uma foto, o sistema avança automaticamente para a próxima (1,2s)
6. Botão "Pular" disponível para ignorar qualquer foto da fila

**Indicadores de progresso:**
- Barra com thumbnails: cinza = aguardando · azul = foto atual · verde com ✓ = salva
- Contador "Foto X de Y · N restantes"
- Contador "✅ N salvas" atualizado em tempo real

---

### 4.4 Download de Fotos

Disponível no modal do produto, em dois pontos de acesso:

| Local | Detalhe |
|-------|---------|
| Canto inferior direito da foto | Botão ⬇ "Baixar" sempre visível sobre o carrossel |
| Header do modal | Botão "Baixar foto" acessível sem rolar |

**Comportamento:**
- Baixa sempre a foto **ativa** no carrossel no momento do clique
- Nome automático gerado: `{SKU}-{angulo}.{ext}` (ex: `LBG100IPANEMA-frontal.jpg`)
- Proxy server-side `/api/download` resolve bloqueio de CORS para GitHub raw e Cloudinary
- Estado visual "Baixando..." durante o fetch
- Botão não aparece quando a foto não tem `image_url`

**Segurança do proxy:** valida que a URL de origem pertence aos domínios autorizados (`raw.githubusercontent.com`, `cloudinary.com`, `drive.google.com`). URLs externas retornam 403.

### 4.5 Painéis de Instruções — v4.4

Ambas as páginas de cadastro possuem painel colapsável "Como funciona":

| Página | Conteúdo |
|--------|----------|
| `/novo` | 3 etapas (upload → IA → revisar) + dica multi-ângulo + link para lote |
| `/novo/bulk` | 4 etapas (organizar → zipar → revisar → importar) + estrutura ZIP recomendada + legenda de badges |

---

### 4.6 Modal Multi-Foto (Galeria)

Ao clicar em um produto no catálogo:
- Foto principal grande com setas ← → para navegar
- Thumbnails clicáveis de **todas as fotos do mesmo SKU** (ordenadas por qualidade)
- Contador `X / N` no canto da foto
- Teclado: ← → para navegar, Esc para fechar
- Cada foto mostra: ângulo, qualidade, fundo, problemas detectados
- Botão "Revisar esta foto" nas fotos marcadas `precisa_revisao = true`
- Dados do produto (SKU, nome, categoria, tags, descrição) à direita

### 4.7 Fila de Revisão (`/revisar`)

Fotos marcadas como `precisa_revisao = true` entram na fila. Para cada foto:

| Ação | Efeito |
|------|--------|
| 🔗 Atribuir | Vincula ao SKU de outro produto existente |
| ↺ Reclassificar | Formulário completo para editar todos os campos |
| ✓ Aprovar | Remove o flag `precisa_revisao`, mantém metadados |
| ✕ Excluir | Remove da fila e do banco (com confirmação) |

- Paginação: 6 fotos por página
- Do catálogo: clique no card "Revisão" redireciona para `/revisar`
- Do modal: botão "Revisar esta foto" leva diretamente para o item

### 4.8 Administração de Usuários (`/admin`)

Exclusivo do perfil admin:

- Listagem de todos os usuários (nome, email, perfil, status, último acesso)
- Criar usuário: nome, email, senha, perfil
- Editar usuário: nome, perfil, nova senha (opcional)
- Ativar / Desativar (bloqueio imediato de acesso)
- Excluir com confirmação
- Tabela visual de permissões por perfil

---

## 5. Perfis de Acesso (Roles)

| Funcionalidade | Admin | Editor | Visualizador |
|----------------|-------|--------|--------------|
| Ver catálogo e relatório | ✅ | ✅ | ✅ |
| Buscar e filtrar produtos | ✅ | ✅ | ✅ |
| Abrir modal multi-foto | ✅ | ✅ | ✅ |
| Exportar CSV | ✅ | ✅ | ✅ |
| Cadastrar novo produto | ✅ | ✅ | ❌ |
| Editar produto existente | ✅ | ✅ | ❌ |
| Revisar e atribuir fotos | ✅ | ✅ | ❌ |
| Gerenciar usuários | ✅ | ❌ | ❌ |

**Implementação:** JWT assinado com `role` embutido → middleware verifica na borda (Edge Runtime). Rotas bloqueadas redirecionam para `/catalogo`.

---

## 6. Arquitetura

### Stack

| Camada | Tecnologia | Plano | Custo |
|--------|-----------|-------|-------|
| Framework | Next.js 14 (App Router) | — | — |
| Linguagem | TypeScript 5 | — | — |
| Estilos | Tailwind CSS 3 + CSS global | — | — |
| Ícones | Lucide React | — | — |
| Auth | JWT customizado (jose) + bcrypt | — | — |
| Banco de dados | Supabase (PostgreSQL) | Free | Gratuito |
| Imagens existentes | GitHub raw files | — | Gratuito |
| Imagens novas | Cloudinary CDN | Free (25GB) | Gratuito |
| IA | Claude Sonnet 4.6 | Pay-per-use | ~$0.01/foto |
| Hosting | Vercel | Hobby | Gratuito |
| Repositório | GitHub | Public | Gratuito |

### Estrutura de Arquivos

```
src/
├── app/
│   ├── api/
│   │   ├── download/           → GET: proxy de download (resolve CORS)
│   │   ├── auth/login/         → POST: autentica, gera JWT com role
│   │   ├── auth/me/            → GET: retorna usuário autenticado
│   │   ├── auth/signout/       → POST: remove cookie JWT
│   │   ├── admin/usuarios/     → GET: lista | POST: cria usuário
│   │   ├── admin/usuarios/[id] → PATCH: edita | DELETE: exclui
│   │   ├── produtos/           → GET: lista com imagens[] | POST: cria produto master
│   │   ├── produtos/[sku]/     → PATCH: edita master+foto | DELETE: cascata todas as fotos
│   │   ├── produto-imagens/    → GET: lista fotos com join produtos
│   │   ├── gabi/produtos/      → GET: lista otimizada para agente Gabi
│   │   ├── gabi/produto/[sku]/ → GET: detalhe completo por SKU
│   │   ├── copies/             → GET: lista copies | PATCH: edita copy
│   │   └── upload/             → POST: Cloudinary + Claude Vision → produto_imagens
│   ├── admin/                  → gestão de usuários (admin only)
│   ├── catalogo/               → galeria com modal multi-foto
│   ├── editar/                 → edição de produto
│   ├── login/                  → tela de autenticação
│   ├── novo/                   → cadastro com IA
│   ├── relatorio/              → métricas e gráficos
│   └── revisar/                → fila de revisão
├── components/layout/
│   ├── Sidebar.tsx             → menu filtrado por role + nome/role no footer
│   └── AppLayout.tsx           → wrapper de layout
├── lib/
│   ├── auth.ts                 → NextAuth config (legado, não usado)
│   ├── supabase.ts             → clients anon + service role
│   ├── cloudinary.ts           → config compartilhada Cloudinary + assertConfigured()
│   ├── cloudinary-sign.ts      → gera URLs assinadas com expiração (1h)
│   └── rate-limit.ts           → janela deslizante 10 req/min por IP
├── middleware.ts               → proteção de rotas por JWT e role
└── types/index.ts              → Produto, Usuario, Role, AuthUser, etc.
```

---

## 7. Banco de Dados (Supabase)

> **Modelo produto-cêntrico** (Story 1.5, v4.5): dois níveis — `produtos` (1 row/SKU) e `produto_imagens` (N fotos/SKU). Anterior: 1 row/foto em `produtos` (legado em `produtos_legacy`).

### Tabela `produtos` (master — 1 row/SKU)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| sku | TEXT PK | Código do produto (chave primária) |
| nome_produto | TEXT NOT NULL | Nome comercial |
| categoria | TEXT | cuba/sanitario/pastilha/flexivel/rejunte/acessorio/outro |
| subcategoria | TEXT | Detalhe da categoria |
| cor_dominante | TEXT | Cor principal |
| material_aparente | TEXT | louca/aco_inox/plastico/ceramica/metal/borracha/**vidro**/outro |
| tags | TEXT[] | Palavras-chave para busca |
| descricao_marketing | TEXT | Frase para catálogo |
| descricao_tecnica | TEXT | Especificações técnicas |
| criado_em | TIMESTAMPTZ | Data de inserção no banco |
| atualizado_em | TIMESTAMPTZ | Última atualização |
| — | — | **Campos derivados** (retornados pela API via join com melhor foto) |
| image_url | TEXT (derivado) | URL da foto com melhor qualidade |
| qualidade_foto | TEXT (derivado) | Qualidade da melhor foto |
| precisa_revisao | BOOLEAN (derivado) | `true` se qualquer foto precisa revisão |

**Critério de "melhor foto":** `QUAL_ORDER = {excelente:0, boa:1, regular:2, ruim:3}` — foto com menor score é a principal.

### Tabela `produto_imagens` (fotos — N rows/SKU)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | BIGSERIAL PK | ID auto-incremento |
| sku | TEXT NOT NULL → FK `produtos.sku` ON DELETE CASCADE | Produto ao qual a foto pertence |
| image_url | TEXT | URL Cloudinary ou GitHub raw |
| angulo | TEXT | frontal/lateral/superior/perspectiva/detalhe/conjunto/embalagem |
| fundo | TEXT | branco/colorido/ambiente/transparente/outro |
| qualidade_foto | TEXT | excelente/boa/regular/ruim |
| cor_dominante | TEXT | Cor principal (pode diferir entre fotos) |
| material_aparente | TEXT | louca/aco_inox/plastico/ceramica/metal/borracha/**vidro**/outro |
| problemas_foto | TEXT[] | Defeitos detectados pela IA |
| precisa_revisao | BOOLEAN | Flag de revisão pendente |
| hash_sha256 | TEXT | Hash SHA-256 do arquivo |
| arquivo_original | TEXT | Nome original do arquivo |
| processado_em | TIMESTAMPTZ | Data de processamento pela IA |
| criado_em | TIMESTAMPTZ | Data de inserção no banco |

### Tabela `produto_copies` (copies SEO — N rows/SKU × plataforma)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | BIGSERIAL PK | ID auto-incremento |
| sku | TEXT NOT NULL | SKU do produto (sem FK explícita — join manual) |
| plataforma | TEXT | amazon / mercado_livre / shopee / leroy_merlin / madeira_madeira |
| titulo | TEXT NOT NULL | Título SEO para a plataforma |
| bullets | TEXT[] | Lista de benefícios (usado em Amazon) |
| descricao | TEXT NOT NULL | Descrição completa formatada |
| palavras_chave | TEXT[] | Keywords SEO extraídas |
| gerado_em | TIMESTAMPTZ | Data de geração pelo Claude |
| atualizado_em | TIMESTAMPTZ | Última edição manual |

**RLS:** ativo. **UI:** `/admin/copies` para visualização e edição manual.

### Tabela `auth_tokens` (tokens temporários de auth)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | BIGSERIAL PK | ID auto-incremento |
| email | TEXT | E-mail do destinatário |
| token | TEXT UNIQUE | Token UUID aleatório |
| tipo | TEXT | `reset_senha` / `magic_link` |
| expira_em | TIMESTAMPTZ | Validade do token |
| usado | BOOLEAN | Se já foi consumido |
| criado_em | TIMESTAMPTZ | Data de criação |

**RLS:** ativo desde 08/06/2026 (migration `enable_rls_auth_tokens`). Policy restritiva bloqueia `anon` e `authenticated` — apenas `service_role` tem acesso (server-side via `supabaseServer()`).

### Tabela `usuarios`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | BIGSERIAL PK | ID auto-incremento |
| email | TEXT UNIQUE | E-mail (chave de login) |
| nome | TEXT | Nome exibido |
| role | TEXT | admin / editor / viewer |
| password_hash | TEXT | Bcrypt hash (rounds=10) |
| ativo | BOOLEAN | Se falso, login bloqueado |
| criado_em | TIMESTAMPTZ | Data de criação |
| ultimo_acesso | TIMESTAMPTZ | Atualizado a cada login |

**RLS:** todas as tabelas com RLS ativo. `usuarios` e `auth_tokens` bloqueiam acesso anon/authenticated — apenas service role key (server-side) pode ler/escrever. `auth_tokens` teve RLS habilitado em 08/06/2026 via migration `enable_rls_auth_tokens`.

**Supabase Project ID:** `fjzcypjldbxkcumydyzp`

---

## 8. Autenticação e Segurança

### Fluxo de Login

```
POST /api/auth/login
  ↓
Busca usuário em usuarios (service role key)
  ↓ (fallback se tabela indisponível)
Verifica env ADMIN_EMAIL + ADMIN_PASSWORD_HASH
  ↓
bcrypt.compare(password, hash)
  ↓ (ok)
Atualiza ultimo_acesso no Supabase
  ↓
SignJWT({ email, name, role }, expires: 8h)
  ↓
Set-Cookie: lbg_token (httpOnly, secure, sameSite=lax)
```

### Proteção de Rotas (Middleware — Edge Runtime)

```
Request → middleware.ts
  ├─ Rota pública (/login, /api/auth/login)? → passa direto
  ├─ Sem cookie lbg_token? → redireciona /login
  ├─ JWT inválido ou expirado? → redireciona /login
  ├─ /admin ou /api/admin + role ≠ admin? → redireciona /catalogo
  └─ /novo, /editar, /revisar + role = viewer? → redireciona /catalogo
```

### Variáveis de Ambiente (Vercel)

| Variável | Descrição |
|----------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL pública do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública (browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave secreta (server-side, bypass RLS) |
| `CLOUDINARY_CLOUD` | `dvlxblssx` |
| `CLOUDINARY_API_KEY` | API Key do Cloudinary |
| `CLOUDINARY_SECRET` | API Secret do Cloudinary |
| `ANTHROPIC_API_KEY` | Chave da API Anthropic (Claude Vision) |
| `NEXTAUTH_SECRET` | Secret JWT (32 bytes base64) |
| `NEXTAUTH_URL` | `https://lbg-next.vercel.app` |
| `ADMIN_EMAIL` | Fallback de admin (env var) |
| `ADMIN_PASSWORD_HASH` | Hash bcrypt do fallback |
| `ADMIN_NAME` | Nome do fallback |

---

## 9. Fluxo de Cadastro de Novo Produto

### Upload Individual (`/novo`)

```
Editor acessa /novo → upload foto (JPG/PNG/WebP, máx 10MB)
  ↓ (opcional) informa SKU e categoria
POST /api/upload:
  1. Computa SHA-256 do buffer (server-side)
  2. Claude Sonnet 4.6 classifica via Vision API
  3. Upload para Cloudinary (CDN, URL permanente)
  Retorna: { classificacao, image_url, hash_sha256, arquivo_original }
  ↓
Formulário preenchido automaticamente → editor revisa
  ↓
POST /api/produtos → INSERT Supabase (inclui hash_sha256 e arquivo_original)
  ↓
Produto no catálogo instantaneamente
```

### Upload em Lote (`/novo/bulk`)

```
Editor arrasta ZIP (máx 200MB) → extração client-side (JSZip)
  ↓
Fetch paralelo: /api/produtos/hashes + /api/sku-catalog
  ↓
Para cada imagem: SHA-256 → dedup → lookup catálogo LBG → preview
  ↓
Usuário seleciona (duplicatas desmarcadas) → clica "Importar"
  ↓
Para cada selecionada:
  POST /api/upload → classificação IA + Cloudinary
  POST /api/produtos → INSERT Supabase
  ↓
Conclusão com sumário (salvos/pulados/erros) + log expandível de erros
```

---

## 10. Catálogo Inicial

Processado em 03/06/2026 via `organizer.py` (Python + Claude Vision). Migrado para modelo produto-cêntrico em 06/06/2026 (Story 1.5):

| Métrica | Valor |
|---------|-------|
| Total de fotos | ~896 (em `produto_imagens`) |
| SKUs únicos | ~426 (em `produtos`) |
| Para revisão | varia — flag por foto em `produto_imagens` |
| Imagens hospedadas | GitHub raw (catálogo original) + Cloudinary (novas) |
| Banco | Supabase (`produtos` + `produto_imagens`) |

---

## 11. Bugs Corrigidos

| Bug | Arquivo | Versão |
|-----|---------|--------|
| `"pastilha"` ausente em `CATEGORIAS` de `/novo`, `/editar`, `/revisar` — dropdown sem a categoria | `novo/page.tsx`, `editar/page.tsx`, `revisar/page.tsx` | v4.2→v4.3 |
| Botão "Importar em Lote" pouco visível (btn-outline) → alterado para btn-gold | `novo/page.tsx` | v4.2→v4.3 |
| Texto do usuário no footer da sidebar invisível (cor #1c1917 em fundo escuro) | `components/layout/Sidebar.tsx` | v4.2→v4.3 |
| `file.name.rsplit` (método Python, não existe em JS) | `api/upload/route.ts` | v3→v4 |
| Modelo `claude-opus-4-5` (ID inválido) | `api/upload/route.ts` | v3→v4 |
| Bulk import sem SKU (skuHint não passado ao `/api/upload`) | `novo/bulk/page.tsx` | v4.1→v4.2 |
| `"pastilha"` ausente no `Categoria` type → produtos com categoria inválida | `types/index.ts` | v4.1→v4.2 |
| `"pastilha"` ausente no array `CATEGORIAS` do catálogo → filtro invisível | `catalogo/page.tsx` | v4.1→v4.2 |
| Detecção de duplicatas silenciosamente desativada (erro do endpoint engolido) | `novo/bulk/page.tsx` | v4.1→v4.2 |
| `arquivo_original` usava só filename → falsos positivos de duplicata | `novo/bulk/page.tsx` | v4.1→v4.2 |
| `POST /api/produtos` acessível por qualquer role autenticado | `middleware.ts` | v4.1→v4.2 |
| Thumbnails em branco sem `onError` fallback | `catalogo/page.tsx` | v4.1→v4.2 |
| Memory leak: `URL.createObjectURL` nunca revogado | `novo/bulk/page.tsx` | v4.1→v4.2 |
| Sem limite de tamanho de ZIP | `novo/bulk/page.tsx` | v4.1→v4.2 |
| **Sprint 1 — Alta prioridade** | | |
| H1: `"pastilha"` ausente no enum do prompt Claude Vision → IA nunca classificava como pastilha | `api/upload/route.ts` | v4.3→v4.4 |
| H2: Sem bounds check em `aiResp.content[0]` → crash se modelo retornasse array vazio | `api/upload/route.ts` | v4.3→v4.4 |
| **Sprint 1 — Média prioridade** | | |
| M1: Sem validação de extensão antes de processar buffer → formatos inválidos chegavam à IA | `api/upload/route.ts` | v4.3→v4.4 |
| M2: `arquivo_original` sempre `file.name` (ignorava nome real do ZIP) → falsos positivos de dedup | `api/upload/route.ts` | v4.3→v4.4 |
| M3: Sem timeout na chamada Anthropic → requisições podiam ficar penduradas indefinidamente | `api/upload/route.ts` | v4.3→v4.4 |
| M4: `POST /api/produtos` não validava enum de categoria → valores inválidos entravam no banco | `api/produtos/route.ts` | v4.3→v4.4 |
| **Sprint 2 — Média prioridade** | | |
| M5: Sem rate limiting no endpoint de upload → possível abuso da API Anthropic | `api/upload/route.ts`, `lib/rate-limit.ts` | v4.3→v4.4 |
| **Bugs de qualidade — Baixa prioridade** | | |
| L2: Credenciais Cloudinary/Anthropic validadas apenas em runtime → crash tardio sem mensagem clara | `api/upload/route.ts`, `lib/cloudinary.ts` | v4.3→v4.4 |
| L3: URLs de imagem Cloudinary permanentes e públicas → adicionado suporte a signed URLs (1h TTL) | `lib/cloudinary-sign.ts` | v4.3→v4.4 |
| **Hotfixes pós-deploy** | | |
| `@keyframes fadeUp` ausente em `globals.css` → cards do catálogo ficavam com `opacity:0` permanentemente | `app/globals.css` | v4.3→v4.4 |
| `cloudinary.ts` lançava `throw` em nível de módulo → cold start de `GET /api/produtos` falhava, catálogo vazio | `lib/cloudinary.ts`, `api/produtos/route.ts` | v4.3→v4.4 |
| `Array.isArray` guard ausente no frontend → se API retornasse objeto de erro, `.filter()` crashava silenciosamente | `app/catalogo/page.tsx` | v4.3→v4.4 |

---

## 12. Decisões Técnicas

| Decisão | Motivo |
|---------|--------|
| JWT customizado em vez de NextAuth | Controle total do payload (role), sem dependência de OAuth |
| Middleware no Edge Runtime | Proteção na borda sem cold start, mais rápido |
| `usuarios` com RLS block_anon | Service role apenas server-side — nunca exposto ao browser |
| Fallback env vars no login | Transição segura sem downtime ao migrar para Supabase |
| GitHub para imagens existentes | 435 fotos já comprimidas (13.4 MB), sem custo adicional |
| Cloudinary para novas fotos | CDN profissional, transformações automáticas (resize, WebP) |
| Claude Sonnet em vez de Opus | 5x mais barato, qualidade equivalente para classificação de imagens |
| Rate limiting in-process (Map) | Zero deps externas, best-effort no Vercel (por lambda); suficiente para projeto interno |
| Cloudinary config em módulo compartilhado | Cada route.ts é um lambda separado no Vercel — config em `lib/cloudinary.ts` garante disponibilidade |
| Cloudinary signed URLs com `expires_at` | CDN rejeita URL após timestamp — controle de acesso real sem migrar para `type:authenticated` |
| `throw` fora de handlers → validação dentro do handler | `throw` em nível de módulo quebra cold start de qualquer rota que importe o módulo |
| Agenda de conteúdo fora do lbg-next | Gabi gerencia o calendário no próprio agente — lbg-next é fonte de dados, não de gestão de agenda |
| Ubersuggest descartado → Claude-Direct | Keywords do site La Bella relevantes, mas dependência externa. Claude gera copies SEO direto dos metadados com qualidade equivalente e zero custo extra |
| RLS em `auth_tokens` (08/06/2026) | Tabela exposta ao anon desde criação (EPIC-0). Corrigido com policy restritiva + `service_role` bypass. Sem impacto operacional pois toda leitura/escrita já usava `supabaseServer()` |

---

## 13. Roadmap

### Fase 0 — Qualidade e Correções (v4.3–v4.4 — Concluído)

| Prioridade | Feature | Esforço | Status |
|-----------|---------|---------|--------|
| Alta | Pastilha em todos os dropdowns de categoria | Pequeno | **Concluído v4.3** |
| Alta | Botão "Importar em Lote" destacado (btn-gold) | Mínimo | **Concluído v4.3** |
| Alta | Modal What's New ao entrar no sistema | Pequeno | **Concluído v4.3** |
| Alta | Brand redesign: Playfair Display + paleta La Bella | Pequeno | **Concluído v4.3** |
| Alta | Sprint QA completo: H1–H2 (upload), M1–M5 (segurança), L1–L3 (qualidade) | Médio | **Concluído v4.4** |
| Alta | Multi-foto queue em Novo Produto (arrastar N fotos de uma vez) | Pequeno | **Concluído v4.4** |
| Média | Painéis de instruções colapsáveis em `/novo` e `/novo/bulk` | Pequeno | **Concluído v4.4** |
| Alta | Hotfix: `@keyframes fadeUp` faltante — catálogo em grade vazio | Mínimo | **Concluído v4.4** |

### Fase 1 — lbg-next como Fonte de Verdade para Gabi (v4.5) ✅ Done

| Prioridade | Feature | Esforço | Status |
|-----------|---------|---------|--------|
| Alta | Endpoint `/api/gabi/produtos` com filtros otimizados para Gabi | Pequeno | **Concluído v4.5** |
| Alta | Endpoint `/api/gabi/produto/[sku]` — detalhe completo por SKU | Pequeno | **Concluído v4.5** |
| Média | Enriquecer `descricao_marketing` dos produtos (Claude Vision em lote) | Médio | **Concluído v4.5** (script pronto, execução pendente) |
| Alta | Copies SEO 5 plataformas (`produto_copies` + admin UI + endpoints) | Grande | **Concluído v4.6** (EPIC-5 Story 5.1: prompts upgraded, 126 copies gerados na 1ª rodada; Story 5.2: batch completo em execução) |
| Média | Gestão de acesso humano via `/admin` | Imediato | **Concluído v4.5** |
| Alta | Refactor modelo produto-cêntrico (`produtos` + `produto_imagens`) | Grande | **Concluído v4.5** |
| Alta | Material "vidro" + migration pastilhas | Pequeno | **Concluído v4.5** |

### Fase 2 — Agenda de Conteúdo → DESCARTADA (06/06/2026)

> Decisão: Gabi gerencia o calendário de postagens no próprio agente. lbg-next é **fonte de dados**, não de gestão de agenda. Construir tabela e UI de agenda aqui seria duplicação de responsabilidade.

### Fase 2 (rev) — Integração Gabi ↔ lbg-next (EPIC-3 / v4.5)

| Prioridade | Feature | Esforço | Status |
|-----------|---------|---------|--------|
| Alta | `*buscar-produto {SKU}` no agente Gabi → dados completos do produto | Médio | Pendente |
| Alta | `*fotos {SKU}` → Cloudinary como fonte primária de imagens para artes | Pequeno | Pendente |

### Fase 3 — Copies SEO Multi-Plataforma Claude-Direct (EPIC-5 / v4.6)

> **Decisão 08/06/2026:** Ubersuggest descartado. Claude gera copies SEO diretamente a partir dos metadados do produto (nome, categoria, material, cor, tags, descrição). Sem dependência de keyword tool externa.

| Prioridade | Feature | Esforço | Status |
|-----------|---------|---------|--------|
| Alta | Story 5.1 — Upgrade prompts SEO: contexto de marca, prompts por plataforma (ML/Shopee/Amazon/Leroy/Madeira), COPY_LIMITS corretos, fix guard 422, todos 129 SKUs elegíveis | Médio | **Concluído v4.6** |
| Alta | Story 5.2 — Batch generation: 129 SKUs × 5 plataformas = 645 copies, batch 8 paralelos, max_tokens Amazon 1800 | Médio | **Ready** (pendente execução) |
| Média | Story 5.3 — Validação manual de amostra: 10 SKUs revisados, ajustes de prompt se necessário | Pequeno | Pendente |

### Fase 3 — Copies SEO no Detalhe do Produto (EPIC-6 / v4.7)

> **EPIC-6 — UX: Fluidez & Integração SEO** — criado em 08/06/2026.

| Prioridade | Feature | Esforço | Status |
|-----------|---------|---------|--------|
| Média | Story 6.1 — Login com campo de e-mail unificado: `email` compartilhado entre senha / magic link / reset | Pequeno | **Ready for Review** |
| Alta | Story 6.2 — Copies SEO visíveis no modal de detalhe do produto (`/catalogo`) | Médio | **Ready** |

### Fase 4 — Download ZIP (EPIC-4 / v4.x)

| Prioridade | Feature | Esforço | Status |
|-----------|---------|---------|--------|
| Média | Download ZIP de seleção de fotos do catálogo | Médio | Pendente |

---

## 14. Segurança — Histórico de Correções

| Data | Ação | Tabela | Detalhe |
|------|------|--------|---------|
| 08/06/2026 | RLS habilitado | `auth_tokens` | Migration `enable_rls_auth_tokens`: policy restritiva bloqueia `anon`/`authenticated`; `service_role` mantém acesso completo |

---

*Atualizado em 08/06/2026 — v4.6 rev 2 | Next.js 14 + Supabase + Cloudinary + Anthropic*
