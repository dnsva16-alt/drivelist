import { useState, useMemo } from "react";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { authSecundario, db } from "../services/firebase";
import { useAuth } from "../contexts/AuthContext";
import { useColecao } from "../hooks/useColecao";
import { calcularScoreConformidade, infoScore } from "../utils/calcularScore";

const emptyForm = {
  nome: "", matricula: "", cnh: "", categoria: "C",
  telefone: "", email: "", senha: "", status: "Ativo",
};

export default function Motoristas() {
  const { perfil } = useAuth();
  const empresaId = perfil?.empresaId;
  const navigate = useNavigate();
  const { dados: motoristas, carregando, remover } = useColecao("motoristas", empresaId);
  const { dados: checklists } = useColecao("checklists", empresaId);

  const scoresPorMotorista = useMemo(() => {
    const mapa = {};
    motoristas.forEach((m) => {
      const cls = checklists.filter((c) => c.motoristaId === m.id || c.motoristaId === m.uid);
      mapa[m.id] = calcularScoreConformidade(cls);
    });
    return mapa;
  }, [motoristas, checklists]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState("");

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErro("");
  }

  async function handleAdd() {
    if (!form.nome.trim() || !form.email.trim() || !form.senha.trim()) {
      setErro("Nome, e-mail e senha são obrigatórios.");
      return;
    }
    if (form.senha.length < 6) {
      setErro("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setCriando(true);
    try {
      // Cria conta Firebase sem deslogar o admin
      const { user } = await createUserWithEmailAndPassword(authSecundario, form.email, form.senha);
      await signOut(authSecundario);

      // Perfil do motorista no Firestore global
      await setDoc(doc(db, "usuarios", user.uid), {
        tipo: "motorista",
        empresaId,
        nome: form.nome,
        email: form.email,
        criadoEm: serverTimestamp(),
      });

      // Dados do motorista na coleção da empresa
      await setDoc(doc(db, `empresas/${empresaId}/motoristas`, user.uid), {
        uid: user.uid,
        nome: form.nome,
        matricula: form.matricula,
        cnh: form.cnh,
        categoria: form.categoria,
        telefone: form.telefone,
        email: form.email,
        status: form.status,
        criadoEm: serverTimestamp(),
      });

      setForm(emptyForm);
      setShowForm(false);
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setErro("Este e-mail já está cadastrado no sistema.");
      } else {
        setErro("Erro ao criar motorista: " + err.message);
      }
    } finally {
      setCriando(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Motoristas</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancelar" : "+ Novo Motorista"}
        </button>
      </div>

      {showForm && (
        <div className="form-card">
          <h2>Novo Motorista</h2>
          <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "16px" }}>
            O motorista receberá acesso ao painel com o e-mail e senha cadastrados aqui.
          </p>
          <div className="form-grid">
            <input name="nome" placeholder="Nome completo *" value={form.nome} onChange={handleChange} />
            <input name="matricula" placeholder="Matrícula / Código interno" value={form.matricula} onChange={handleChange} />
            <input name="email" type="email" placeholder="E-mail de acesso *" value={form.email} onChange={handleChange} />
            <input name="senha" type="password" placeholder="Senha de acesso * (mín. 6 caracteres)" value={form.senha} onChange={handleChange} />
            <input name="cnh" placeholder="Número da CNH" value={form.cnh} onChange={handleChange} />
            <select name="categoria" value={form.categoria} onChange={handleChange}>
              <option>A</option><option>B</option><option>C</option>
              <option>D</option><option>E</option>
            </select>
            <input name="telefone" placeholder="Telefone / WhatsApp" value={form.telefone} onChange={handleChange} />
            <select name="status" value={form.status} onChange={handleChange}>
              <option>Ativo</option>
              <option>Inativo</option>
            </select>
          </div>
          {erro && <p style={{ color: "#ef4444", fontSize: "13px", marginBottom: "12px" }}>{erro}</p>}
          <div className="form-actions">
            <button className="btn-primary" onClick={handleAdd} disabled={criando}>
              {criando ? "Criando acesso..." : "Salvar e criar acesso"}
            </button>
            <button className="btn-cancel" onClick={() => { setShowForm(false); setForm(emptyForm); setErro(""); }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {carregando ? (
        <p style={{ color: "#94a3b8", padding: "16px" }}>Carregando...</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Matrícula</th>
              <th>E-mail</th>
              <th>CNH</th>
              <th>Cat.</th>
              <th>Telefone</th>
              <th>Status</th>
              <th>Conformidade</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {motoristas.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", color: "#94a3b8" }}>
                  Nenhum motorista cadastrado.
                </td>
              </tr>
            )}
            {motoristas.map((m) => (
              <tr key={m.id}>
                <td><strong>{m.nome}</strong></td>
                <td style={{ color: "#64748b" }}>{m.matricula || "—"}</td>
                <td style={{ color: "#64748b" }}>{m.email}</td>
                <td>{m.cnh || "—"}</td>
                <td>{m.categoria}</td>
                <td>{m.telefone || "—"}</td>
                <td>
                  <span className={`badge ${m.status === "Ativo" ? "badge-green" : "badge-red"}`}>
                    {m.status}
                  </span>
                </td>
                <td>
                  {(() => {
                    const score = scoresPorMotorista[m.id];
                    const { label, cor, bg } = infoScore(score);
                    return (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 10px", borderRadius: "20px", background: bg, color: cor, fontWeight: "600", fontSize: "13px" }}>
                        {score !== null ? `${score}%` : "—"}
                        <span style={{ fontWeight: "400", fontSize: "11px" }}>{label}</span>
                      </span>
                    );
                  })()}
                </td>
                <td style={{ display: "flex", gap: "6px" }}>
                  <button className="btn-primary" style={{ padding: "6px 12px", fontSize: "13px" }} onClick={() => navigate(`/admin/motoristas/${m.id}`)}>
                    Perfil Digital
                  </button>
                  <button className="btn-danger" onClick={() => remover(m.id)}>Remover</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
