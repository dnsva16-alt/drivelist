import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";

import AdminLayout from "./components/AdminLayout";
import Dashboard from "./pages/Dashboard";
import Motoristas from "./pages/Motoristas";
import Veiculos from "./pages/Veiculos";
import Checklists from "./pages/Checklists";
import Ocorrencias from "./pages/Ocorrencias";
import AdminPanel from "./pages/Admin";
import ConfigChecklist from "./pages/ConfigChecklist";
import LoginAdmin from "./pages/LoginAdmin";
import CadastroEmpresa from "./pages/CadastroEmpresa";

import LoginMotorista from "./pages/motorista/LoginMotorista";
import EsqueciSenha from "./pages/motorista/EsqueciSenha";
import PainelMotorista from "./pages/motorista/PainelMotorista";

import "./App.css";

function RotaAdmin({ children }) {
  const { usuario, perfil, carregando } = useAuth();
  if (carregando) return <div className="carregando-tela">Carregando...</div>;
  if (!usuario) return <Navigate to="/admin/login" replace />;
  if (perfil !== null && perfil?.tipo !== "admin") return <Navigate to="/admin/login" replace />;
  if (perfil === null && usuario) return <div className="carregando-tela">Carregando perfil...</div>;
  return <AdminLayout>{children}</AdminLayout>;
}

function RotaMotorista({ children }) {
  const { usuario, perfil, carregando } = useAuth();
  if (carregando) return <div className="carregando-tela">Carregando...</div>;
  if (!usuario) return <Navigate to="/motorista/login" replace />;
  if (perfil !== null && perfil?.tipo !== "motorista") return <Navigate to="/motorista/login" replace />;
  if (perfil === null && usuario) return <div className="carregando-tela">Carregando perfil...</div>;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/admin/login" replace />} />

        {/* Cadastro de nova empresa */}
        <Route path="/cadastro" element={<CadastroEmpresa />} />

        {/* Painel do admin */}
        <Route path="/admin/login" element={<LoginAdmin />} />
        <Route path="/admin" element={<RotaAdmin><Dashboard /></RotaAdmin>} />
        <Route path="/admin/motoristas" element={<RotaAdmin><Motoristas /></RotaAdmin>} />
        <Route path="/admin/veiculos" element={<RotaAdmin><Veiculos /></RotaAdmin>} />
        <Route path="/admin/checklists" element={<RotaAdmin><Checklists /></RotaAdmin>} />
        <Route path="/admin/ocorrencias" element={<RotaAdmin><Ocorrencias /></RotaAdmin>} />
        <Route path="/admin/config-checklist" element={<RotaAdmin><ConfigChecklist /></RotaAdmin>} />
        <Route path="/admin/painel" element={<RotaAdmin><AdminPanel /></RotaAdmin>} />

        {/* Painel do motorista */}
        <Route path="/motorista/login" element={<LoginMotorista />} />
        <Route path="/motorista/esqueci-senha" element={<EsqueciSenha />} />
        <Route path="/motorista" element={<RotaMotorista><PainelMotorista /></RotaMotorista>} />
      </Routes>
    </BrowserRouter>
  );
}
