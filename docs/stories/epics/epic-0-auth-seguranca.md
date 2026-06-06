# Epic 0 — Auth & Segurança: Reset e Magic Link

**ID:** EPIC-0
**Fase:** 0 (pré-requisito — v4.5)
**Status:** Draft
**Owner:** Morgan (PM)
**Data:** 2026-06-05
**PRD Ref:** Usabilidade — solicitado por Ana Paula

---

## Epic Goal

Melhorar a experiência de autenticação do sistema lbg-next para usuários humanos e agentes, permitindo:

1. **Troca de senha** para usuários logados (sem depender de admin)
2. **Reset de senha por email** para quem esqueceu a senha
3. **Magic link** para login sem senha — link enviado por email, válido por 15 min

O sistema atual tem auth sólido (JWT customizado + bcrypt), mas sem mecanismo de recuperação de acesso. Isso cria dependência da Ana Paula para qualquer reset manual.

---

## Contexto do Sistema Existente

- **Auth:** JWT customizado via `jose` — cookie `lbg_token` (httpOnly, 8h)
- **Senhas:** `bcryptjs` — hash armazenado em `usuarios.password_hash`
- **Tabela usuarios:** `id, email, nome, role, password_hash, ativo, ultimo_acesso`
- **Login:** `POST /api/auth/login` — email + senha → JWT
- **Rotas:** `/api/auth/login`, `/api/auth/me`, `/api/auth/signout`
- **Email:** NÃO configurado — nova dependência `resend` (npm)

**Padrões existentes a seguir:**
- `supabaseServer()` em todas as API routes
- `jwtVerify` de `jose` para verificação
- `SignJWT` de `jose` para geração
- TypeScript estrito — sem `any`

---

## Nova Infraestrutura Necessária

### Dependência: Resend (email transacional)
```bash
npm install resend
```
- Env: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- Free tier: 3.000 emails/mês — suficiente para o uso atual

### Nova tabela: `auth_tokens`
```sql
CREATE TABLE auth_tokens (
  id          BIGSERIAL PRIMARY KEY,
  email       TEXT NOT NULL,
  token       TEXT NOT NULL UNIQUE,
  tipo        TEXT NOT NULL CHECK (tipo IN ('reset_senha', 'magic_link')),
  expira_em   TIMESTAMPTZ NOT NULL,
  usado       BOOLEAN DEFAULT FALSE,
  criado_em   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON auth_tokens (token);
CREATE INDEX ON auth_tokens (email, tipo, usado);
```
Compartilhada entre Stories 0.2 e 0.3 — criada em Story 0.2.

---

## Stories

### Story 0.1 — Troca de Senha (usuário logado)
**Esforço:** Pequeno (2–3h) | Sem email | Sem nova tabela
- `PATCH /api/auth/change-password` — valida senha atual + salva nova
- Modal ou página `/perfil` com form: senha atual / nova senha / confirmar

### Story 0.2 — Reset de Senha via Email
**Esforço:** Médio (4–6h) | Requer Resend + `auth_tokens`
- `POST /api/auth/reset-request` — gera token, envia email com link
- `POST /api/auth/reset-confirm` — valida token + salva nova senha
- Nova página `/reset-password?token=...`
- Modificação em `/login`: link "Esqueci minha senha"

### Story 0.3 — Magic Link (login sem senha)
**Esforço:** Médio (3–5h) | Requer Story 0.2 (Resend + `auth_tokens` já criados)
- `POST /api/auth/magic-link` — gera token, envia email
- `GET /api/auth/magic-link?token=...` — valida + emite JWT + redirect
- Modificação em `/login`: botão "Entrar sem senha"

---

## Sequência de Implementação

```
Story 0.1 (sem deps — pode ser feita a qualquer momento)
    ↓
Story 0.2 (instala Resend + cria auth_tokens)
    ↓
Story 0.3 (reutiliza Resend + auth_tokens da 0.2)
```

## Definition of Done

- [ ] Usuário logado consegue trocar própria senha sem depender de admin
- [ ] Usuário esqueceu a senha → recebe email → define nova senha
- [ ] Usuário pode logar apenas com email → recebe link → acesso direto
- [ ] Tokens expiram e são marcados como `usado` após uso
- [ ] Nenhum token reutilizável
- [ ] lint e typecheck passando
