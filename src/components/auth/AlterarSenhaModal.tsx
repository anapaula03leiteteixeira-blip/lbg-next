"use client";
import { useState } from "react";

export default function AlterarSenhaModal({ onClose }: { onClose: () => void }) {
  const [senhaAtual,     setSenhaAtual]     = useState("");
  const [novaSenha,      setNovaSenha]      = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [errors,  setErrors]  = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    const res  = await fetch("/api/auth/change-password", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ senhaAtual, novaSenha, confirmarSenha }),
    });
    const data = await res.json() as { error?: string };

    if (res.ok) {
      setSuccess(true);
      setTimeout(() => onClose(), 3000);
    } else {
      const msg = data.error ?? "Erro ao alterar senha";
      if (msg.includes("atual incorreta")) setErrors({ senhaAtual: msg });
      else if (msg.includes("coincidem")) setErrors({ confirmarSenha: msg });
      else if (msg.includes("8 caract")) setErrors({ novaSenha: msg });
      else                               setErrors({ geral: msg });
    }
    setLoading(false);
  }

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}
    >
      <div
        className="modal-box"
        onClick={e => e.stopPropagation()}
        style={{ background:"var(--card-bg,#1c1917)", borderRadius:"0.75rem", padding:"1.5rem", width:"100%", maxWidth:400, boxShadow:"0 20px 60px rgba(0,0,0,0.5)" }}
      >
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1rem" }}>
          <h2 style={{ margin:0, fontSize:"1.1rem", fontWeight:600 }}>Alterar Senha</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"#9ca3af", fontSize:"1.2rem" }} aria-label="Fechar">✕</button>
        </div>

        {success ? (
          <div className="alert alert-success">Senha alterada com sucesso!</div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
            <div className="input-group">
              <label className="input-label">Senha atual</label>
              <input type="password" className="input-field" value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} required autoFocus />
              {errors.senhaAtual && <span style={{ color:"#f87171", fontSize:"0.78rem" }}>{errors.senhaAtual}</span>}
            </div>

            <div className="input-group">
              <label className="input-label">Nova senha</label>
              <input type="password" className="input-field" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} required />
              {errors.novaSenha && <span style={{ color:"#f87171", fontSize:"0.78rem" }}>{errors.novaSenha}</span>}
            </div>

            <div className="input-group">
              <label className="input-label">Confirmar nova senha</label>
              <input type="password" className="input-field" value={confirmarSenha} onChange={e => setConfirmarSenha(e.target.value)} required />
              {errors.confirmarSenha && <span style={{ color:"#f87171", fontSize:"0.78rem" }}>{errors.confirmarSenha}</span>}
            </div>

            {errors.geral && (
              <div className="alert alert-error"><span>⚠️</span> {errors.geral}</div>
            )}

            <div style={{ display:"flex", gap:"0.5rem", justifyContent:"flex-end", marginTop:"0.25rem" }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Salvando..." : "Salvar"}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
