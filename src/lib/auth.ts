import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

// Usuários internos — em produção, armazene no Supabase.
// Para começar, defina via variável de ambiente:
// ADMIN_USERS=[{"email":"gabi@labella.com","password":"hash_bcrypt","name":"Gabi"}]
function getUsers() {
  try {
    const raw = process.env.ADMIN_USERS;
    if (raw) return JSON.parse(raw) as { email: string; password: string; name: string }[];
  } catch {}
  // Fallback: 1 usuário padrão definido por env simples
  return [{
    email:    process.env.ADMIN_EMAIL    ?? "admin@labella.com",
    password: process.env.ADMIN_PASSWORD_HASH ?? "",  // bcrypt hash
    name:     process.env.ADMIN_NAME     ?? "Admin",
  }];
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credenciais",
      credentials: {
        email:    { label: "E-mail",  type: "email"    },
        password: { label: "Senha",   type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const users = getUsers();
        const user  = users.find(u => u.email === credentials.email);
        if (!user) return null;
        const ok = await bcrypt.compare(credentials.password, user.password);
        if (!ok) return null;
        return { id: user.email, email: user.email, name: user.name };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 }, // 8 horas
  secret: process.env.NEXTAUTH_SECRET,
};
