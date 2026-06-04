"use client";
import { useState, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import type { Usuario, Role } from "@/types";
import { Plus, X, Check, Pencil, Trash2, ShieldCheck, Eye, PenLine, AlertTriangle } from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<Role, string> = {
  admin:  "Admin",
  editor: "Editor",
  viewer: "Visualizador",
};

const ROLE_COLOR: Record<Role, { bg: string; color: string }> = {
  admin:  { bg: "#fef3c7", color: "#92400e" },
  editor: { bg: "#dbeafe", color: "#1e40af" },
  viewer: { bg: "#f3f4f6", color: "#374151" },
};

const ROLE_DESC: Record<Role, string> = {
  admin:  "Acesso total — gerencia usuários, cadastra e edita produtos",
  editor: "Pode cadastrar e editar produtos, não pode gerenciar usuários",
  viewer: "Somente visualização do catálogo e relatório",
};

const ROLE_ICON: Record<Role, typeof ShieldCheck> = {
  admin:  ShieldCheck,
  editor: PenLine,
  viewer: Eye,
};

function RoleBadge({ role }: { role: Role }) {
  const { bg, color } = ROLE_COLOR[role];
  const Icon = ROLE_ICON[role];
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 10px", borderRadius:20, background:bg, color, fontSize:"0.78rem", fontWeight:600 }}>
      <Icon size={12} strokeWidth={2} />{ROLE_LABEL[role]}
    </span>
  );
}

// ─── Modal criar/editar usuário ───────────────────────────────────────────────

function UsuarioModal({
  usuario,
  onClose,
  onSaved,
}: {
  usuario:  Usuario | null;  // null = criação
  onClose:  () => void;
  onSaved:  (u: Usuario) => void;
}) {
  const isEdit = !!usuario;
  const [form,   setForm]   = useState({
    nome:     usuario?.nome     ?? "",
    email:    usuario?.email    ?? "",
    role:     (usuario?.role    ?? "viewer") as Role,
    password: "",
    ativo:    usuario?.ativo    ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  async function submit() {
    if (!form.nome.trim())  { setError("Nome obrigatório"); return; }
    if (!form.email.trim()) { setError("E-mail obrigatório"); return; }
    if (!isEdit && !form.password) { setError("Senha obrigatória para novo usuário"); return; }

    setSaving(true); setError("");
    try {
      const url    = isEdit ? `/api/admin/usuarios/${usuario!.id}` : "/api/admin/usuarios";
      const method = isEdit ? "PATCH" : "POST";
      const body   = isEdit
        ? { nome: form.nome, role: form.role, ativo: form.ativo, ...(form.password ? { password: form.password } : {}) }
        : { nome: form.nome, email: form.email, role: form.role, password: form.password };

      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro");
      onSaved(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
      setSaving(false);
    }
  }

  const inp = (label: string, key: keyof typeof form, type = "text", placeholder = "") => (
    <div>
      <p style={{ fontSize:"0.65rem", textTransform:"uppercase", letterSpacing:"0.1em", color:"#78716c", marginBottom:4 }}>{label}</p>
      <input
        type={type}
        placeholder={placeholder}
        value={form[key] as string}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        disabled={isEdit && key === "email"}
        style={{ width:"100%", padding:"0.5rem 0.75rem", border:"1px solid #e7e5e4", borderRadius:6, fontSize:"0.875rem", background: isEdit && key === "email" ? "#f5f5f4" : "white" }}
      />
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth:480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="text-display" style={{ fontSize:"1.05rem" }}>
            {isEdit ? `Editar — ${usuario!.nome}` : "Novo Usuário"}
          </h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm"><X size={16} /></button>
        </div>
        <div className="modal-body" style={{ display:"flex", flexDirection:"column", gap:"0.875rem" }}>
          {error && (
            <div className="alert alert-warning"><AlertTriangle size={14} />{error}</div>
          )}

          {inp("Nome *", "nome", "text", "Ex: Gabriela Silva")}
          {inp("E-mail *", "email", "email", "funcionario@labellagriffe.com.br")}
          {inp(isEdit ? "Nova senha (deixe em branco para manter)" : "Senha *", "password", "password", "Mínimo 6 caracteres")}

          {/* Role */}
          <div>
            <p style={{ fontSize:"0.65rem", textTransform:"uppercase", letterSpacing:"0.1em", color:"#78716c", marginBottom:"0.5rem" }}>Perfil de acesso *</p>
            <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem" }}>
              {(["admin","editor","viewer"] as Role[]).map(r => {
                const Icon = ROLE_ICON[r];
                const { bg, color } = ROLE_COLOR[r];
                return (
                  <label
                    key={r}
                    style={{ display:"flex", alignItems:"flex-start", gap:"0.75rem", padding:"0.75rem", border:`2px solid ${form.role === r ? color : "#e7e5e4"}`, borderRadius:8, cursor:"pointer", background: form.role === r ? bg : "white" }}
                  >
                    <input
                      type="radio" name="role" value={r}
                      checked={form.role === r}
                      onChange={() => setForm(f => ({ ...f, role: r }))}
                      style={{ marginTop:2 }}
                    />
                    <div>
                      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                        <Icon size={14} strokeWidth={2} style={{ color }} />
                        <strong style={{ fontSize:"0.875rem", color }}>{ROLE_LABEL[r]}</strong>
                      </div>
                      <p style={{ fontSize:"0.78rem", color:"#78716c", margin:0 }}>{ROLE_DESC[r]}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Ativo (apenas edição) */}
          {isEdit && (
            <label style={{ display:"flex", alignItems:"center", gap:"0.625rem", cursor:"pointer" }}>
              <input
                type="checkbox"
                checked={form.ativo}
                onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))}
              />
              <span style={{ fontSize:"0.875rem" }}>Usuário ativo</span>
              {!form.ativo && <span style={{ fontSize:"0.75rem", color:"#dc2626" }}>(acesso bloqueado)</span>}
            </label>
          )}

          <div style={{ display:"flex", gap:"0.5rem", justifyContent:"flex-end", paddingTop:"0.5rem" }}>
            <button onClick={onClose} className="btn btn-outline btn-sm">Cancelar</button>
            <button onClick={submit} disabled={saving} className="btn btn-sm" style={{ background:"#1c1917", color:"white" }}>
              {saving ? "Salvando..." : <><Check size={14} /> {isEdit ? "Salvar" : "Criar usuário"}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function AdminPage() {
  const [usuarios,   setUsuarios]   = useState<Usuario[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState<"novo" | Usuario | null>(null);
  const [confirmDel, setConfirmDel] = useState<number | null>(null);
  const [error,      setError]      = useState("");

  useEffect(() => {
    fetch("/api/admin/usuarios")
      .then(r => r.json())
      .then(data => { setUsuarios(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function handleSaved(u: Usuario) {
    setUsuarios(prev => {
      const exists = prev.find(x => x.id === u.id);
      return exists ? prev.map(x => x.id === u.id ? u : x) : [u, ...prev];
    });
    setModal(null);
  }

  async function toggleAtivo(u: Usuario) {
    try {
      const res = await fetch(`/api/admin/usuarios/${u.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo: !u.ativo }),
      });
      const updated = await res.json();
      if (!res.ok) throw new Error(updated.error);
      setUsuarios(prev => prev.map(x => x.id === u.id ? updated : x));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    }
  }

  async function excluir(id: number) {
    try {
      const res = await fetch(`/api/admin/usuarios/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir");
      setUsuarios(prev => prev.filter(x => x.id !== id));
      setConfirmDel(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    }
  }

  const admins   = usuarios.filter(u => u.role === "admin").length;
  const editors  = usuarios.filter(u => u.role === "editor").length;
  const viewers  = usuarios.filter(u => u.role === "viewer").length;
  const inativos = usuarios.filter(u => !u.ativo).length;

  return (
    <AppLayout>
      <div className="topbar">
        <div>
          <h1 className="page-title">Administração de Usuários</h1>
          <p style={{ fontSize:"0.8rem", color:"#78716c", marginTop:2 }}>
            Gerencie quem tem acesso ao sistema e com quais permissões
          </p>
        </div>
        <button
          onClick={() => setModal("novo")}
          className="btn btn-sm"
          style={{ background:"#1c1917", color:"white", display:"flex", alignItems:"center", gap:6 }}
        >
          <Plus size={15} /> Novo Usuário
        </button>
      </div>

      <div className="page-content">
        {/* Métricas */}
        <div className="metrics-grid">
          {[
            ["Total",          usuarios.length],
            ["Admins",         admins],
            ["Editors",        editors],
            ["Visualizadores", viewers],
            ["Inativos",       inativos],
          ].map(([label, val]) => (
            <div key={label as string} className="metric-card">
              <div className="metric-label">{label}</div>
              <div className="metric-value" style={(label === "Inativos" && (val as number) > 0) ? { color:"#dc2626" } : {}}>{val}</div>
            </div>
          ))}
        </div>

        {error && (
          <div className="alert alert-warning" style={{ marginBottom:"1rem" }}>
            <AlertTriangle size={14} />{error}
            <button onClick={() => setError("")} style={{ marginLeft:"auto", background:"none", border:"none", cursor:"pointer" }}><X size={12} /></button>
          </div>
        )}

        {/* Tabela de usuários */}
        <div style={{ background:"white", border:"1px solid #e7e5e4", borderRadius:10, overflow:"hidden" }}>
          <table className="data-table">
            <thead>
              <tr>
                {["Nome","E-mail","Perfil","Status","Último acesso","Ações"].map(h => <th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign:"center", padding:"2rem", color:"#78716c" }}>Carregando...</td></tr>
              ) : usuarios.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign:"center", padding:"2rem", color:"#78716c" }}>Nenhum usuário cadastrado</td></tr>
              ) : usuarios.map(u => (
                <tr key={u.id} style={{ opacity: u.ativo ? 1 : 0.5 }}>
                  <td style={{ fontWeight:500 }}>{u.nome}</td>
                  <td style={{ fontSize:"0.85rem", color:"#57534e" }}>{u.email}</td>
                  <td><RoleBadge role={u.role} /></td>
                  <td>
                    <button
                      onClick={() => toggleAtivo(u)}
                      style={{
                        padding:"2px 10px", borderRadius:20, fontSize:"0.75rem", fontWeight:600, cursor:"pointer",
                        background: u.ativo ? "#dcfce7" : "#fee2e2",
                        color:      u.ativo ? "#166534" : "#991b1b",
                        border:     u.ativo ? "1px solid #86efac" : "1px solid #fca5a5",
                      }}
                      title={u.ativo ? "Clique para desativar" : "Clique para ativar"}
                    >
                      {u.ativo ? "● Ativo" : "○ Inativo"}
                    </button>
                  </td>
                  <td style={{ fontSize:"0.8rem", color:"#78716c" }}>
                    {u.ultimo_acesso
                      ? new Date(u.ultimo_acesso).toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", year:"2-digit", hour:"2-digit", minute:"2-digit" })
                      : "Nunca"}
                  </td>
                  <td>
                    <div style={{ display:"flex", gap:"0.375rem" }}>
                      <button
                        onClick={() => setModal(u)}
                        className="btn btn-ghost btn-sm"
                        title="Editar usuário"
                      >
                        <Pencil size={14} />
                      </button>
                      {confirmDel === u.id ? (
                        <>
                          <button onClick={() => excluir(u.id)} className="btn btn-sm" style={{ background:"#dc2626", color:"white", fontSize:"0.72rem" }}>
                            Confirmar
                          </button>
                          <button onClick={() => setConfirmDel(null)} className="btn btn-ghost btn-sm">
                            <X size={13} />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setConfirmDel(u.id)}
                          className="btn btn-ghost btn-sm"
                          title="Excluir usuário"
                          style={{ color:"#dc2626" }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legenda de permissões */}
        <div style={{ marginTop:"1.5rem", background:"#fafaf9", border:"1px solid #e7e5e4", borderRadius:8, padding:"1rem 1.25rem" }}>
          <p style={{ fontSize:"0.7rem", textTransform:"uppercase", letterSpacing:"0.1em", color:"#78716c", marginBottom:"0.75rem" }}>Tabela de permissões</p>
          <div style={{ overflowX:"auto" }}>
            <table style={{ fontSize:"0.8rem", borderCollapse:"collapse", minWidth:500 }}>
              <thead>
                <tr>
                  {["Funcionalidade","Admin","Editor","Visualizador"].map(h => (
                    <th key={h} style={{ padding:"0.375rem 0.875rem", textAlign:"left", color:"#78716c", fontWeight:600, borderBottom:"1px solid #e7e5e4" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ["Ver catálogo e relatório",     true,  true,  true ],
                  ["Buscar e filtrar produtos",     true,  true,  true ],
                  ["Cadastrar novo produto",        true,  true,  false],
                  ["Editar produto existente",      true,  true,  false],
                  ["Revisar e atribuir fotos",      true,  true,  false],
                  ["Gerenciar usuários",            true,  false, false],
                ].map(([label, admin, editor, viewer]) => (
                  <tr key={label as string}>
                    <td style={{ padding:"0.375rem 0.875rem", borderBottom:"1px solid #f5f5f4" }}>{label}</td>
                    {[admin, editor, viewer].map((v, i) => (
                      <td key={i} style={{ padding:"0.375rem 0.875rem", textAlign:"center", borderBottom:"1px solid #f5f5f4" }}>
                        {v ? <Check size={15} style={{ color:"#16a34a" }} /> : <X size={15} style={{ color:"#dc2626" }} />}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modal === "novo" && (
        <UsuarioModal usuario={null} onClose={() => setModal(null)} onSaved={handleSaved} />
      )}
      {modal && modal !== "novo" && (
        <UsuarioModal usuario={modal as Usuario} onClose={() => setModal(null)} onSaved={handleSaved} />
      )}
    </AppLayout>
  );
}
