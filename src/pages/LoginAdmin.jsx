import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../services/firebase";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useEffect } from "react";

export default function LoginAdmin() {
  const [form, setForm] = useState({ email: "", senha: "" });
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const { usuario, perfil } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (usuario && perfil?.tipo === "admin") {
      navigate("/admin");
    } else if (usuario && perfil !== undefined && perfil?.tipo !== "admin") {
      // Autenticado mas sem perfil admin — libera o botão e mostra erro
      setCarregando(false);
      setErro("Sua conta não tem permissão de administrador.");
    }
  }, [usuario, perfil, navigate]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErro("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.email || !form.senha) {
      setErro("Preencha todos os campos.");
      return;
    }
    setCarregando(true);
    try {
      await signInWithEmailAndPassword(auth, form.email, form.senha);
      // O AuthContext detecta o login e RotaAdmin redireciona
    } catch (err) {
      console.error("Erro Firebase:", err.code, err.message);
      if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        setErro("E-mail ou senha incorretos.");
      } else if (err.code === "auth/too-many-requests") {
        setErro("Muitas tentativas. Aguarde e tente novamente.");
      } else if (err.code === "auth/invalid-api-key" || err.code === "auth/app-not-authorized") {
        setErro("Erro de configuração do servidor. Contate o suporte.");
      } else if (err.code === "auth/network-request-failed") {
        setErro("Sem conexão. Verifique sua internet.");
      } else {
        setErro(`Erro: ${err.code || err.message}`);
      }
      setCarregando(false);
    }
  }

  return (
    <div className="auth-tela">
      <div className="auth-card">
        <div className="auth-logo">
          <img src="/logo.png" alt="DriveList" className="auth-logo-img" />
        </div>
        <h2 className="auth-titulo">Painel Administrativo</h2>
        <p className="auth-subtitulo">Entre com sua conta de gestor</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-campo">
            <label htmlFor="adm-email">E-mail</label>
            <input id="adm-email" name="email" type="email" placeholder="seu@email.com" value={form.email} onChange={handleChange} disabled={carregando} autoComplete="email" />
          </div>
          <div className="auth-campo">
            <label htmlFor="adm-senha">Senha</label>
            <input id="adm-senha" name="senha" type="password" placeholder="••••••••" value={form.senha} onChange={handleChange} disabled={carregando} autoComplete="current-password" />
          </div>

          {erro && <p className="auth-erro">{erro}</p>}

          <button className="btn-primary" type="submit" disabled={carregando}>
            {carregando ? "Entrando..." : "Entrar"}
          </button>

          <Link to="/admin/esqueci-senha" className="auth-link-center" translate="no">
            Esqueci minha senha
          </Link>

          <p className="auth-link">
            Empresa nova?{" "}
            <Link to="/cadastro">Criar conta</Link>
          </p>
          <p className="auth-link" style={{ marginTop: "4px" }}>
            É motorista?{" "}
            <Link to="/motorista/login">Acesse o painel do motorista</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
