import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function AguardandoAprovacao() {
  const { sair, perfil } = useAuth();
  const navigate = useNavigate();

  async function handleSair() {
    await sair();
    navigate("/admin/login");
  }

  return (
    <div className="auth-tela">
      <div className="auth-card" style={{ textAlign: "center" }}>
        <div className="auth-logo">
          <img src="/logo.png" alt="DriveList" className="auth-logo-img" />
        </div>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>⏳</div>
        <h2 className="auth-titulo">Cadastro em análise</h2>
        <p className="auth-subtitulo" style={{ marginBottom: "24px" }}>
          Sua empresa <strong>{perfil?.nomeEmpresa}</strong> foi cadastrada com sucesso.<br />
          Nossa equipe irá analisar e liberar o acesso em breve.
        </p>
        <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "28px" }}>
          Você receberá uma confirmação assim que o acesso for liberado.
          Em caso de dúvidas, entre em contato conosco.
        </p>
        <button className="btn-cancel" onClick={handleSair} style={{ width: "100%" }}>
          Sair
        </button>
      </div>
    </div>
  );
}
