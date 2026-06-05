import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const navLinks = [
  { to: "/admin", label: "Dashboard" },
  { to: "/admin/motoristas", label: "Motoristas" },
  { to: "/admin/veiculos", label: "Veículos" },
  { to: "/admin/checklists", label: "Checklists" },
  { to: "/admin/ocorrencias", label: "Ocorrências" },
  { to: "/admin/config-checklist", label: "Itens do Checklist" },
  { to: "/admin/painel", label: "Administrativo" },
];

export default function AdminLayout({ children }) {
  const { pathname } = useLocation();
  const { perfil, sair } = useAuth();
  const navigate = useNavigate();

  async function handleSair() {
    await sair();
    navigate("/admin/login");
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-icon">🚚</span>
          <span className="logo-text">DRIVELIST</span>
        </div>

        {perfil?.nomeEmpresa && (
          <div className="sidebar-empresa">{perfil.nomeEmpresa}</div>
        )}

        <nav>
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={pathname === link.to ? "nav-active" : ""}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">{perfil?.nome || perfil?.email}</div>
          <button className="btn-sair" onClick={handleSair}>Sair</button>
        </div>
      </aside>

      <main className="main">{children}</main>
    </div>
  );
}
