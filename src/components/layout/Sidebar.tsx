"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Plus, PenLine, BarChart2, AlertTriangle, LogOut } from "lucide-react";

const links = [
  { href: "/catalogo", label: "Catálogo",       icon: LayoutGrid    },
  { href: "/novo",     label: "Novo Produto",   icon: Plus           },
  { href: "/editar",   label: "Editar Produto", icon: PenLine        },
  { href: "/revisar",  label: "Revisão",        icon: AlertTriangle  },
  { href: "/relatorio",label: "Relatório",      icon: BarChart2      },
];

export default function Sidebar() {
  const path = usePathname();

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
        <form action="/api/auth/signout" method="POST">
          <button
            type="submit"
            className="nav-link btn-ghost"
            style={{ width: "100%", background: "none", border: "none", cursor: "pointer", color: "#57534e", fontSize: "0.8rem" }}
          >
            <LogOut size={14} />
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
