import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../services/firebase";
import { Link } from "react-router-dom";

export default function EsqueciSenhaAdmin() {
  const [email, setEmail] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) {
      setErro("Informe seu e-mail.");
      return;
    }
    setCarregando(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setMensagem("Link de recuperação enviado! Verifique sua caixa de entrada.");
      setErro("");
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        setErro("Nenhuma conta encontrada com este e-mail.");
      } else {
        setErro("Erro ao enviar o e-mail. Verifique o endereço informado.");
      }
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="auth-tela">
      <div className="auth-card">
        <div className="auth-logo">
          <img src="/logo.png" alt="DriveList" className="auth-logo-img" />
        </div>
        <h2 className="auth-titulo">Recuperar Senha</h2>
        <p className="auth-subtitulo">
          Informe seu e-mail para receber o link de recuperação
        </p>

        {mensagem ? (
          <div className="auth-sucesso">
            <p>{mensagem}</p>
            <Link to="/admin/login" className="btn-primary" style={{ display: "block", textAlign: "center", marginTop: "16px" }}>
              Voltar ao login
            </Link>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-campo">
              <label>E-mail</label>
              <input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErro(""); }}
                disabled={carregando}
                autoComplete="email"
              />
            </div>

            {erro && <p className="auth-erro">{erro}</p>}

            <button className="btn-primary" type="submit" disabled={carregando}>
              {carregando ? "Enviando..." : "Enviar link de recuperação"}
            </button>

            <Link to="/admin/login" className="auth-link-center">
              Voltar ao login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
