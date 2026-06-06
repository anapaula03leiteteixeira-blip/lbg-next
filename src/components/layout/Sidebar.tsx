"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutGrid, Plus, PenLine, BarChart2, AlertTriangle, ShieldCheck, LogOut, KeyRound, FileText } from "lucide-react";
import AlterarSenhaModal from "@/components/auth/AlterarSenhaModal";
import type { Role } from "@/types";

interface AuthUser { name: string; email: string; role: Role; }

const ALL_LINKS = [
  { href: "/catalogo",  label: "Catálogo",      icon: LayoutGrid,    roles: ["admin","editor","viewer"] as Role[] },
  { href: "/novo",      label: "Novo Produto",   icon: Plus,          roles: ["admin","editor"]           as Role[] },
  { href: "/editar",    label: "Editar Produto", icon: PenLine,       roles: ["admin","editor"]           as Role[] },
  { href: "/revisar",   label: "Revisão",        icon: AlertTriangle, roles: ["admin","editor"]           as Role[] },
  { href: "/relatorio", label: "Relatório",      icon: BarChart2,     roles: ["admin","editor","viewer"]  as Role[] },
  { href: "/admin",        label: "Usuários",    icon: ShieldCheck, roles: ["admin"]                    as Role[] },
  { href: "/admin/copies", label: "Copies SEO",  icon: FileText,    roles: ["admin"]                    as Role[] },
];

const ROLE_LABEL: Record<Role, string> = { admin:"Admin", editor:"Editor", viewer:"Visualizador" };
const ROLE_COLOR: Record<Role, string> = { admin:"#fbbf24", editor:"#93c5fd", viewer:"#9ca3af" };

export default function Sidebar() {
  const path = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [showAlterarSenha, setShowAlterarSenha] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.ok ? r.json() : null)
      .then(data => data && setUser(data))
      .catch(() => {});
  }, []);

  const links = ALL_LINKS.filter(l => !user || l.roles.includes(user.role));

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>La Bella Griffe</h1>
        <p>Catálogo Interno</p>
      </div>

      <nav className="sidebar-nav">
        <p className="nav-section-label">Menu</p>
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`nav-link ${path.startsWith(href) ? "active" : ""}`}
          >
            <Icon size={16} strokeWidth={1.5} />
            {label}
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        {user && (
          <div style={{ padding:"0 0.5rem 0.625rem", borderBottom:"1px solid rgba(200,200,200,0.12)", marginBottom:"0.5rem" }}>
            <p style={{ fontSize:"0.8rem", fontWeight:600, color:"#e7e5e4", margin:0 }}>{user.name}</p>
            <span style={{ fontSize:"0.7rem", fontWeight:600, color: ROLE_COLOR[user.role] }}>
              {ROLE_LABEL[user.role]}
            </span>
          </div>
        )}
        <button
          type="button"
          className="nav-link btn-ghost"
          onClick={() => setShowAlterarSenha(true)}
          style={{ width:"100%", background:"none", border:"none", cursor:"pointer", color:"#57534e", fontSize:"0.8rem" }}
        >
          <KeyRound size={14} />
          Alterar senha
        </button>
        <form action="/api/auth/signout" method="POST">
          <button
            type="submit"
            className="nav-link btn-ghost"
            style={{ width:"100%", background:"none", border:"none", cursor:"pointer", color:"#57534e", fontSize:"0.8rem" }}
          >
            <LogOut size={14} />
            Sair
          </button>
        </form>
      </div>

      {showAlterarSenha && <AlterarSenhaModal onClose={() => setShowAlterarSenha(false)} />}
    </aside>
  );
}
