import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../services/firebase";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [form, setForm] = useState({ email: "", senha: "" });
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const navigate = useNavigate();

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErro("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.email.trim() || !form.senha.trim()) {
      setErro("Preencha o e-mail e a senha.");
      return;
    }
    setCarregando(true);
    try {
      await signInWithEmailAndPassword(auth, form.email, form.senha);
      navigate("/");
    } catch (err) {
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setErro("E-mail ou senha incorretos.");
      } else if (err.code === "auth/too-many-requests") {
        setErro("Muitas tentativas. Tente novamente mais tarde.");
      } else {
        setErro("Erro ao fazer login. Verifique as credenciais do Firebase.");
      }
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f7fa" }}>
      <div className="login-card">
        <h2>🚚 DRIVELIST</h2>
        <p className="login-subtitle">Acesse sua conta</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <div>
            <label>E-mail</label>
            <input
              name="email"
              type="email"
              placeholder="seu@email.com"
              value={form.email}
              onChange={handleChange}
              disabled={carregando}
            />
          </div>
          <div>
            <label>Senha</label>
            <input
              name="senha"
              type="password"
              placeholder="••••••••"
              value={form.senha}
              onChange={handleChange}
              disabled={carregando}
            />
          </div>

          {erro && (
            <p style={{ color: "#ef4444", fontSize: "13px", margin: 0 }}>{erro}</p>
          )}

          <button className="btn-primary" type="submit" disabled={carregando}>
            {carregando ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
