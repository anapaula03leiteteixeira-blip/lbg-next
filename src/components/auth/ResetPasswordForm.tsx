"use client";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const token        = searchParams.get("token");

  const [novaSenha,      setNovaSenha]      = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) router.replace("/login?error=link_invalido");
  }, [token, router]);

  if (!token) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res  = await fetch("/api/auth/reset-confirm", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ token, novaSenha, confirmarSenha }),
    });
    const data = await res.json() as { error?: string };

    if (res.ok) {
      router.push("/login?reset=success");
    } else {
      setError(data.error ?? "Erro ao redefinir senha");
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">🛁 La Bella Griffe</div>
        <div className="login-subtitle">Redefinir Senha</div>

        <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
          <div className="input-group">
            <label className="input-label">Nova senha</label>
            <input
              type="password"
              className="input-field"
              placeholder="Mínimo 8 caracteres"
              value={novaSenha}
              onChange={e => setNovaSenha(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="input-group">
            <label className="input-label">Confirmar nova senha</label>
            <input
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={confirmarSenha}
              onChange={e => setConfirmarSenha(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="alert alert-error"><span>⚠️</span> {error}</div>
          )}

          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop:"0.5rem" }}>
            {loading ? "Redefinindo..." : "Redefinir senha"}
          </button>
        </form>
      </div>
    </div>
  );
}
