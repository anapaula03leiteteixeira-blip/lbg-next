# PRD — La Bella Griffe: Sistema de Catálogo de Produtos

**Versão:** 3.0
**Data:** 2026-06-03
**Status:** Em produção (v3 Next.js)
**Owner:** Ana Paula Teixeira (anapaula03.leiteteixeira@gmail.com)

---

## 1. Visão Geral

Sistema web interno para **catalogar, consultar e gerenciar fotos de produtos hidráulicos** da La Bella Griffe (cubas, sanitários, flexíveis, rejunte, acessórios). Substitui o processo manual de organização de fotos em pastas e planilhas Excel.

**URL em produção:** https://lbg-next.vercel.app

---

## 2. Histórico de Versões

| Versão | Stack | Status | Data |
|--------|-------|--------|------|
| v1 — organizer.py | Python CLI + Claude Vision | Concluído | 2026-06-03 |
| v2 — Streamlit | Python + Supabase + Cloudinary | Substituído | 2026-06-03 |
| v3 — Next.js | Next.js 14 + TypeScript + Tailwind | **Em produção** | 2026-06-03 |

---

## 3. Problema

- Fotos de produtos armazenadas em pastas locais desorganizadas (sem padrão de nomenclatura)
- Sem forma rápida de buscar um produto por SKU, cor ou categoria
- A Gabi (designer) e funcionários não tinham acesso centralizado às fotos
- Cadastro de novos produtos era manual, sem metadados estruturados
- Impossível saber a qualidade das fotos sem abrir uma a uma
- Sistema anterior (Streamlit) sem autenticação, sem edição de registros

---

## 4. Solução (v3 — Next.js)

Aplicativo web com autenticação por login e 4 páginas:

| Rota | Funcionalidade |
|------|---------------|
| `/login` | Autenticação por email + senha (bcrypt + JWT) |
| `/catalogo` | Galeria com filtros, busca, modal de detalhe, skeleton loading |
| `/novo` | Upload de foto → Claude Vision → revisão → salva no Supabase + Cloudinary |
| `/editar` | Buscar produto por SKU, editar campos, excluir com confirmação |
| `/relatorio` | Métricas, gráficos por categoria/qualidade, lista de revisão |

---

## 5. Usuários

| Persona | Email | Acesso |
|---------|-------|--------|
| Ana Paula (admin) | anapaula03.leiteteixeira@gmail.com | Full |
| Gabi (designer) | a definir | Leitura + Upload |
| Funcionários | a definir | Leitura + Upload |

**Senha padrão admin:** `LBG@2026` (alterar após primeiro acesso)

---

## 6. Stack Técnica (v3)

| Camada | Tecnologia | Plano | Custo |
|--------|-----------|-------|-------|
| Framework | Next.js 14 (App Router) | — | — |
| Linguagem | TypeScript 5 | — | — |
| Estilos | Tailwind CSS 3 | — | — |
| Ícones | Lucide React | — | — |
| Auth | NextAuth.js 4 + bcrypt | — | — |
| Banco de dados | Supabase (PostgreSQL) | Free tier | Gratuito |
| Imagens | Cloudinary CDN | Free (25GB) | Gratuito |
| IA | Claude Sonnet 4.6 (Anthropic) | Pay-per-use | ~$0.01/foto |
| Hosting | Vercel | Hobby (free) | Gratuito |
| Repositório | GitHub | Public | Gratuito |

**Repositório:** https://github.com/anapaula03leiteteixeira-blip/lbg-next
**Deploy:** Automático a cada push na branch `main`

---

## 7. Arquitetura

```
lbg-next/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/login/     → autenticação com bcrypt
│   │   │   ├── auth/signout/   → logout
│   │   │   ├── produtos/       → CRUD Supabase
│   │   │   └── upload/         → Cloudinary + Claude Vision
│   │   ├── catalogo/           → galeria de produtos
│   │   ├── novo/               → cadastro com IA
│   │   ├── editar/             → edição e exclusão
│   │   ├── relatorio/          → métricas e gráficos
│   │   └── login/              → tela de autenticação
│   ├── components/layout/      → Sidebar + AppLayout
│   ├── lib/
│   │   ├── auth.ts             → NextAuth config + usuários
│   │   └── supabase.ts         → clients anon + service role
│   ├── middleware.ts            → proteção de rotas por JWT
│   └── types/index.ts          → Produto, FiltrosProduto, ClassificacaoIA
```

---

## 8. Tabela `produtos` (Supabase)

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
| descricao_marketing | TEXT | Frase para catálogo (gerada por IA) |
| descricao_tecnica | TEXT | Especificações técnicas |
| precisa_revisao | BOOLEAN | Flag de revisão manual |
| image_url | TEXT | URL Cloudinary ou GitHub |
| hash_sha256 | TEXT | Hash do arquivo |
| arquivo_original | TEXT | Nome original |
| processado_em | TIMESTAMPTZ | Data do processamento |
| criado_em | TIMESTAMPTZ | Data de inserção |

**Supabase Project ID:** `fjzcypjldbxkcumydyzp`

---

## 9. Fluxo de Cadastro de Novo Produto

```
Funcionário acessa /novo (requer login)
  ↓
Upload da foto (JPG/PNG/WebP, máx 10MB)
  ↓
(Opcional) Informa SKU e categoria
  ↓
Clica "Analisar com IA"
  ↓
API Route: /api/upload
  ├── Claude Sonnet 4.6 classifica a imagem
  └── Retorna JSON com todos os campos
  ↓
Campos preenchidos automaticamente no formulário
  ↓
Funcionário revisa e corrige
  ↓
Clica "Salvar"
  ↓
/api/upload:
  ├── Upload para Cloudinary (CDN, URL permanente)
  └── INSERT no Supabase via service role key
  ↓
Produto aparece no catálogo instantaneamente
```

---

## 10. Catálogo Inicial Migrado

Processado em 03/06/2026 via script `organizer.py` (Python + Claude Vision):

| Métrica | Valor |
|---------|-------|
| Total de fotos | 435 |
| SKUs únicos | ~85 |
| Com SKU identificado | 426 (98%) |
| Para revisão manual | 18 (4%) |
| Imagens hospedadas | GitHub raw (13.4 MB) |

---

## 11. Variáveis de Ambiente (Vercel)

| Variável | Descrição |
|----------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública (browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave secreta (server-side) |
| `CLOUDINARY_CLOUD` | `dvlxblssx` |
| `CLOUDINARY_API_KEY` | API Key do Cloudinary |
| `CLOUDINARY_SECRET` | API Secret do Cloudinary |
| `ANTHROPIC_API_KEY` | Chave da API Anthropic |
| `NEXTAUTH_SECRET` | Secret JWT (32 bytes base64) |
| `NEXTAUTH_URL` | `https://lbg-next.vercel.app` |
| `ADMIN_EMAIL` | Email do admin |
| `ADMIN_PASSWORD_HASH` | Hash bcrypt da senha |
| `ADMIN_NAME` | Nome exibido |

Para adicionar múltiplos usuários:
```
ADMIN_USERS=[{"email":"gabi@...","password":"$2a$10$...","name":"Gabi"}]
```

---

## 12. Bugs Corrigidos na v3

| Bug | Arquivo | Correção |
|-----|---------|----------|
| `file.name.rsplit` (método Python inexistente em JS) | `api/upload/route.ts` | Trocado por `file.name.split(".").pop()` |
| Modelo `claude-opus-4-5` (inválido) | `api/upload/route.ts` | Atualizado para `claude-sonnet-4-6` |

---

## 13. Roadmap

| Prioridade | Feature | Esforço |
|-----------|---------|---------|
| Alta | Adicionar Gabi e funcionários como usuários | Baixo |
| Alta | Alterar senha padrão do admin | Baixo |
| Média | Upload de múltiplas fotos de uma vez | Médio |
| Média | Página de detalhe com todas as fotos do mesmo SKU | Médio |
| Média | Download de foto em alta resolução | Baixo |
| Baixa | Notificação por WhatsApp ao cadastrar produto | Médio |
| Baixa | App mobile com câmera direta | Alto |

---

*Documento atualizado em 03/06/2026 — La Bella Griffe Catálogo v3.0 (Next.js)*
