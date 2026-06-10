import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import AdminLayout from "./components/AdminLayout";
import "./App.css";

const Dashboard       = lazy(() => import("./pages/Dashboard"));
const Motoristas      = lazy(() => import("./pages/Motoristas"));
const Veiculos        = lazy(() => import("./pages/Veiculos"));
const Checklists      = lazy(() => import("./pages/Checklists"));
const Ocorrencias     = lazy(() => import("./pages/Ocorrencias"));
const AdminPanel      = lazy(() => import("./pages/Admin"));
const ConfigChecklist = lazy(() => import("./pages/ConfigChecklist"));
const LoginAdmin      = lazy(() => import("./pages/LoginAdmin"));
const CadastroEmpresa = lazy(() => import("./pages/CadastroEmpresa"));
const LoginMotorista   = lazy(() => import("./pages/motorista/LoginMotorista"));
const EsqueciSenha     = lazy(() => import("./pages/motorista/EsqueciSenha"));
const PainelMotorista  = lazy(() => import("./pages/motorista/PainelMotorista"));
const EsqueciSenhaAdmin  = lazy(() => import("./pages/EsqueciSenhaAdmin"));
const AguardandoAprovacao = lazy(() => import("./pages/AguardandoAprovacao"));
const MasterAdmin         = lazy(() => import("./pages/MasterAdmin"));

function RotaAdmin({ children }) {
  const { usuario, perfil, carregando } = useAuth();
  if (carregando || perfil === undefined) return <div className="carregando-tela">Carregando...</div>;
  if (!usuario) return <Navigate to="/admin/login" replace />;
  if (perfil === null || perfil?.tipo !== "admin") return <Navigate to="/admin/login" replace />;
  if (perfil.status === "pendente") return <Navigate to="/aguardando-aprovacao" replace />;
  return <AdminLayout>{children}</AdminLayout>;
}

function RotaMaster({ children }) {
  const { usuario, perfil, carregando } = useAuth();
  if (carregando || perfil === undefined) return <div className="carregando-tela">Carregando...</div>;
  if (!usuario) return <Navigate to="/admin/login" replace />;
  if (perfil?.tipo !== "superadmin") return <Navigate to="/admin/login" replace />;
  return children;
}

function RotaMotorista({ children }) {
  const { usuario, perfil, carregando } = useAuth();
  if (carregando || perfil === undefined) return <div className="carregando-tela">Carregando...</div>;
  if (!usuario) return <Navigate to="/motorista/login" replace />;
  if (perfil === null || perfil?.tipo !== "motorista") return <Navigate to="/motorista/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="carregando-tela">Carregando...</div>}>
        <Routes>
          <Route path="/" element={<Navigate to="/admin/login" replace />} />

          <Route path="/cadastro" element={<CadastroEmpresa />} />
          <Route path="/aguardando-aprovacao" element={<AguardandoAprovacao />} />
          <Route path="/master" element={<RotaMaster><MasterAdmin /></RotaMaster>} />

          <Route path="/admin/login" element={<LoginAdmin />} />
          <Route path="/admin/esqueci-senha" element={<EsqueciSenhaAdmin />} />
          <Route path="/admin" element={<RotaAdmin><Dashboard /></RotaAdmin>} />
          <Route path="/admin/motoristas" element={<RotaAdmin><Motoristas /></RotaAdmin>} />
          <Route path="/admin/veiculos" element={<RotaAdmin><Veiculos /></RotaAdmin>} />
          <Route path="/admin/checklists" element={<RotaAdmin><Checklists /></RotaAdmin>} />
          <Route path="/admin/ocorrencias" element={<RotaAdmin><Ocorrencias /></RotaAdmin>} />
          <Route path="/admin/config-checklist" element={<RotaAdmin><ConfigChecklist /></RotaAdmin>} />
          <Route path="/admin/painel" element={<RotaAdmin><AdminPanel /></RotaAdmin>} />

          <Route path="/motorista/login" element={<LoginMotorista />} />
          <Route path="/motorista/esqueci-senha" element={<EsqueciSenha />} />
          <Route path="/motorista" element={<RotaMotorista><PainelMotorista /></RotaMotorista>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
