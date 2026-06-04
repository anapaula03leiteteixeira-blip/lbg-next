# PRD — La Bella Griffe: Sistema de Catálogo de Produtos

**Versão:** 4.0
**Data:** 2026-06-03
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
| **v4 — Next.js** | **Multi-foto, revisão, admin de usuários** | **Em produção** | 2026-06-03 |

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
| `/catalogo` | Todos | Galeria filtrável com modal multi-foto |
| `/novo` | Admin, Editor | Upload + Claude Vision → Supabase + Cloudinary |
| `/editar` | Admin, Editor | Buscar produto, editar campos, excluir |
| `/revisar` | Admin, Editor | Fila de revisão com 4 ações por foto |
| `/relatorio` | Todos | Métricas, gráficos, exportação CSV |
| `/admin` | Admin | Gestão de usuários e permissões |

### 4.2 Modal Multi-Foto (Galeria)

Ao clicar em um produto no catálogo:
- Foto principal grande com setas ← → para navegar
- Thumbnails clicáveis de **todas as fotos do mesmo SKU** (ordenadas por qualidade)
- Contador `X / N` no canto da foto
- Teclado: ← → para navegar, Esc para fechar
- Cada foto mostra: ângulo, qualidade, fundo, problemas detectados
- Botão "Revisar esta foto" nas fotos marcadas `precisa_revisao = true`
- Dados do produto (SKU, nome, categoria, tags, descrição) à direita

### 4.3 Fila de Revisão (`/revisar`)

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

### 4.4 Administração de Usuários (`/admin`)

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
│   │   ├── auth/login/         → POST: autentica, gera JWT com role
│   │   ├── auth/me/            → GET: retorna usuário autenticado
│   │   ├── auth/signout/       → POST: remove cookie JWT
│   │   ├── admin/usuarios/     → GET: lista | POST: cria usuário
│   │   ├── admin/usuarios/[id] → PATCH: edita | DELETE: exclui
│   │   ├── produtos/           → GET: lista | POST: cria produto
│   │   ├── produtos/[id]/      → PATCH: edita | DELETE: exclui
│   │   └── upload/             → POST: Cloudinary + Claude Vision
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
│   └── supabase.ts             → clients anon + service role
├── middleware.ts               → proteção de rotas por JWT e role
└── types/index.ts              → Produto, Usuario, Role, AuthUser, etc.
```

---

## 7. Banco de Dados (Supabase)

### Tabela `produtos`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | BIGSERIAL PK | ID auto-incremento |
| sku | TEXT NOT NULL | Código do produto |
| nome_produto | TEXT NOT NULL | Nome comercial |
| categoria | TEXT | cuba/sanitario/flexivel/rejunte/acessorio/outro |
| subcategoria | TEXT | Detalhe da categoria |
| cor_dominante | TEXT | Cor principal |
| angulo | TEXT | frontal/lateral/superior/perspectiva/detalhe/conjunto/embalagem |
| fundo | TEXT | branco/colorido/ambiente/transparente/outro |
| qualidade_foto | TEXT | excelente/boa/regular/ruim |
| material_aparente | TEXT | louca/aco_inox/plastico/ceramica/metal/borracha/outro |
| tags | TEXT[] | Palavras-chave para busca |
| problemas_foto | TEXT[] | Defeitos detectados pela IA |
| descricao_marketing | TEXT | Frase para catálogo |
| descricao_tecnica | TEXT | Especificações técnicas |
| precisa_revisao | BOOLEAN | Flag de revisão pendente |
| image_url | TEXT | URL Cloudinary ou GitHub raw |
| hash_sha256 | TEXT | Hash SHA-256 do arquivo |
| arquivo_original | TEXT | Nome original do arquivo |
| processado_em | TIMESTAMPTZ | Data de processamento pela IA |
| criado_em | TIMESTAMPTZ | Data de inserção no banco |

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

**RLS:** ambas as tabelas têm Row Level Security ativo. `usuarios` bloqueia acesso anon — apenas service role key (server-side) pode ler/escrever.

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

```
Editor acessa /novo (requer login com role editor ou admin)
  ↓
Upload da foto (JPG/PNG/WebP, máx 10MB)
  ↓
(Opcional) informa SKU e categoria
  ↓
Clica "Analisar com IA"
  ↓
POST /api/upload:
  1. Claude Sonnet 4.6 classifica a imagem via Vision API
  2. Upload para Cloudinary (CDN, URL permanente)
  Retorna: { classificacao, image_url }
  ↓
Formulário preenchido automaticamente
  ↓
Editor revisa e corrige
  ↓
POST /api/produtos → INSERT no Supabase
  ↓
Produto aparece no catálogo instantaneamente
```

---

## 10. Catálogo Inicial

Processado em 03/06/2026 via `organizer.py` (Python + Claude Vision):

| Métrica | Valor |
|---------|-------|
| Total de fotos | 435 |
| SKUs únicos | ~85 |
| Com imagem | 435/435 (100%) |
| Para revisão | 18 |
| Imagens hospedadas | GitHub raw (13.4 MB) |
| Banco | Supabase (`produtos`) |

---

## 11. Bugs Corrigidos

| Bug | Arquivo | Versão |
|-----|---------|--------|
| `file.name.rsplit` (método Python, não existe em JS) | `api/upload/route.ts` | v3→v4 |
| Modelo `claude-opus-4-5` (ID inválido) | `api/upload/route.ts` | v3→v4 |

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

---

## 13. Roadmap

| Prioridade | Feature | Esforço |
|-----------|---------|---------|
| Alta | Adicionar Gabi e funcionários via `/admin` | Imediato |
| Alta | Trocar senha padrão `LBG@2026` | Imediato |
| Média | Página de detalhe com todas as fotos de um SKU | Médio |
| Média | Upload de múltiplas fotos de uma vez | Médio |
| Média | Download ZIP de seleção de fotos | Médio |
| Baixa | Notificação WhatsApp ao cadastrar produto | Médio |
| Baixa | App mobile com câmera direta | Alto |

---

*Atualizado em 03/06/2026 — v4.0 | Next.js 14 + Supabase + Cloudinary + Anthropic*
