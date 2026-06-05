import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../services/firebase";
import { useNavigate, Link } from "react-router-dom";

export default function CadastroEmpresa() {
  const [form, setForm] = useState({ nomeEmpresa: "", nome: "", email: "", senha: "", confirmar: "" });
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const navigate = useNavigate();

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErro("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nomeEmpresa || !form.nome || !form.email || !form.senha) {
      setErro("Preencha todos os campos.");
      return;
    }
    if (form.senha !== form.confirmar) {
      setErro("As senhas não coincidem.");
      return;
    }
    if (form.senha.length < 6) {
      setErro("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setCarregando(true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, form.email, form.senha);

      await setDoc(doc(db, "empresas", user.uid), {
        nomeEmpresa: form.nomeEmpresa,
        adminUid: user.uid,
        email: form.email,
        criadoEm: serverTimestamp(),
      });

      await setDoc(doc(db, "usuarios", user.uid), {
        tipo: "admin",
        empresaId: user.uid,
        nome: form.nome,
        nomeEmpresa: form.nomeEmpresa,
        email: form.email,
        criadoEm: serverTimestamp(),
      });

      navigate("/admin");
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setErro("Este e-mail já está cadastrado.");
      } else {
        setErro("Erro ao criar conta. Tente novamente.");
      }
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="auth-tela">
      <div className="auth-card" style={{ maxWidth: "480px" }}>
        <div className="auth-logo">
          <span className="logo-icon">🚚</span>
          <span className="logo-text">DRIVELIST</span>
        </div>
        <h2 className="auth-titulo">Cadastro de Empresa</h2>
        <p className="auth-subtitulo">Crie sua conta para gerenciar sua frota</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-campo">
            <label>Nome da empresa</label>
            <input name="nomeEmpresa" placeholder="Ex: Transportes Silva Ltda" value={form.nomeEmpresa} onChange={handleChange} disabled={carregando} />
          </div>
          <div className="auth-campo">
            <label>Seu nome (administrador)</label>
            <input name="nome" placeholder="Seu nome completo" value={form.nome} onChange={handleChange} disabled={carregando} />
          </div>
          <div className="auth-campo">
            <label>E-mail</label>
            <input name="email" type="email" placeholder="admin@empresa.com" value={form.email} onChange={handleChange} disabled={carregando} />
          </div>
          <div className="auth-campo">
            <label>Senha</label>
            <input name="senha" type="password" placeholder="Mínimo 6 caracteres" value={form.senha} onChange={handleChange} disabled={carregando} />
          </div>
          <div className="auth-campo">
            <label>Confirmar senha</label>
            <input name="confirmar" type="password" placeholder="Repita a senha" value={form.confirmar} onChange={handleChange} disabled={carregando} />
          </div>

          {erro && <p className="auth-erro">{erro}</p>}

          <button className="btn-primary" type="submit" disabled={carregando}>
            {carregando ? "Criando conta..." : "Criar conta"}
          </button>

          <p className="auth-link">
            Já tem conta?{" "}
            <Link to="/admin/login">Entrar como administrador</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
