"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const resetSuccess   = searchParams.get("reset") === "success";
  const errorParam     = searchParams.get("error");

  // ── Login normal ──────────────────────────────────────────────────────────
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  // ── Esqueci minha senha ───────────────────────────────────────────────────
  const [showReset,    setShowReset]    = useState(false);
  const [resetEmail,   setResetEmail]   = useState("");
  const [resetMsg,     setResetMsg]     = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  // ── Magic link ────────────────────────────────────────────────────────────
  const [showMagic,    setShowMagic]    = useState(false);
  const [magicEmail,   setMagicEmail]   = useState("");
  const [magicMsg,     setMagicMsg]     = useState("");
  const [magicLoading, setMagicLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email, password }),
    });

    if (res.ok) {
      router.push("/catalogo");
      router.refresh();
    } else {
      const data = await res.json() as { error?: string };
      setError(data.error ?? "E-mail ou senha incorretos.");
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setResetLoading(true);
    await fetch("/api/auth/reset-request", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email: resetEmail }),
    });
    setResetMsg("Se esse e-mail estiver cadastrado, você receberá o link em breve.");
    setResetLoading(false);
  }

  async function handleMagic(e: React.FormEvent) {
    e.preventDefault();
    setMagicLoading(true);
    await fetch("/api/auth/magic-link", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email: magicEmail }),
    });
    setMagicMsg("Link enviado! Verifique seu e-mail. Expira em 15 minutos.");
    setMagicLoading(false);
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">🛁 La Bella Griffe</div>
        <div className="login-subtitle">Catálogo de Produtos</div>

        {/* Mensagens de URL */}
        {resetSuccess && (
          <div className="alert alert-success" style={{ marginBottom:"1rem" }}>
            Senha redefinida! Faça login com sua nova senha.
          </div>
        )}
        {errorParam === "link_invalido" && (
          <div className="alert alert-error" style={{ marginBottom:"1rem" }}>
            <span>⚠️</span> Link inválido ou expirado. Solicite um novo.
          </div>
        )}
        {errorParam === "magic_link_invalido" && (
          <div className="alert alert-error" style={{ marginBottom:"1rem" }}>
            <span>⚠️</span> Link inválido ou expirado. Solicite um novo.
          </div>
        )}

        {/* ── Formulário de login ──────────────────────────────────── */}
        <form onSubmit={handleLogin} style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
          <div className="input-group">
            <label className="input-label">E-mail</label>
            <input
              type="email"
              className="input-field"
              placeholder="seu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="input-group">
            <label className="input-label">Senha</label>
            <input
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="alert alert-error">
              <span>⚠️</span> {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop:"0.5rem" }}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        {/* ── Magic link — botão roxo logo abaixo do Entrar ────────── */}
        <div style={{ marginTop:"0.75rem" }}>
          {!showMagic ? (
            <button
              type="button"
              onClick={() => setShowMagic(true)}
              style={{
                width:"100%",
                padding:"0.65rem 1rem",
                background:"#7c3aed",
                color:"#fff",
                border:"none",
                borderRadius:"0.5rem",
                fontSize:"0.95rem",
                fontWeight:600,
                cursor:"pointer",
                display:"flex",
                alignItems:"center",
                justifyContent:"center",
                gap:"0.4rem",
                transition:"background 0.15s",
              }}
              onMouseOver={e => (e.currentTarget.style.background = "#6d28d9")}
              onMouseOut={e  => (e.currentTarget.style.background = "#7c3aed")}
            >
              🪄 Entrar com MagicLink
            </button>
          ) : magicMsg ? (
            <p style={{ fontSize:"0.85rem", color:"#86efac", margin:0, textAlign:"center" }}>{magicMsg}</p>
          ) : (
            <form onSubmit={handleMagic} style={{ display:"flex", flexDirection:"column", gap:"0.75rem" }}>
              <p style={{ fontSize:"0.85rem", color:"#9ca3af", margin:0 }}>Enviaremos um link de acesso para seu e-mail.</p>
              <input
                type="email"
                className="input-field"
                placeholder="seu@email.com"
                value={magicEmail}
                onChange={e => setMagicEmail(e.target.value)}
                required
                autoFocus
              />
              <div style={{ display:"flex", gap:"0.5rem" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowMagic(false)}>Cancelar</button>
                <button
                  type="submit"
                  disabled={magicLoading}
                  style={{ flex:1, padding:"0.6rem 1rem", background:"#7c3aed", color:"#fff", border:"none", borderRadius:"0.5rem", fontWeight:600, cursor:"pointer" }}
                >
                  {magicLoading ? "Enviando..." : "🪄 Enviar link"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ── Esqueci minha senha ──────────────────────────────────── */}
        <div style={{ marginTop:"1rem", borderTop:"1px solid rgba(255,255,255,0.08)", paddingTop:"1rem" }}>
          {!showReset ? (
            <button
              type="button"
              onClick={() => setShowReset(true)}
              style={{ background:"none", border:"none", color:"#a78bfa", cursor:"pointer", fontSize:"0.85rem", textDecoration:"underline" }}
            >
              Esqueci minha senha
            </button>
          ) : resetMsg ? (
            <p style={{ fontSize:"0.85rem", color:"#86efac", margin:0 }}>{resetMsg}</p>
          ) : (
            <form onSubmit={handleReset} style={{ display:"flex", flexDirection:"column", gap:"0.75rem" }}>
              <p style={{ fontSize:"0.85rem", color:"#9ca3af", margin:0 }}>Informe seu e-mail para receber o link de redefinição.</p>
              <input
                type="email"
                className="input-field"
                placeholder="seu@email.com"
                value={resetEmail}
                onChange={e => setResetEmail(e.target.value)}
                required
              />
              <div style={{ display:"flex", gap:"0.5rem" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowReset(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={resetLoading}>
                  {resetLoading ? "Enviando..." : "Enviar link"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
