import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useColecao } from "../hooks/useColecao";

const emptyForm = { data: "", tipo: "Mecânica", veiculo: "", motorista: "", descricao: "", status: "Aberta" };

export default function Ocorrencias() {
  const { perfil } = useAuth();
  const { dados: ocorrencias, carregando, adicionar, remover, atualizar } = useColecao("ocorrencias", perfil?.empresaId);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [filtro, setFiltro] = useState("Todas");

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleAdd() {
    if (!form.veiculo.trim() || !form.descricao.trim()) return;
    await adicionar(form);
    setForm(emptyForm);
    setShowForm(false);
  }

  async function alterarStatus(id, novoStatus) {
    await atualizar(id, { status: novoStatus });
  }

  function statusBadge(status) {
    if (status === "Resolvida") return "badge-green";
    if (status === "Em andamento") return "badge-yellow";
    return "badge-red";
  }

  const listagem = filtro === "Todas" ? ocorrencias : ocorrencias.filter((o) => o.status === filtro);

  return (
    <div>
      <div className="page-header">
        <h1>Ocorrências</h1>
        <div style={{ display: "flex", gap: "8px" }}>
          <select
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            style={{ padding: "9px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "14px" }}
          >
            <option>Todas</option>
            <option>Aberta</option>
            <option>Em andamento</option>
            <option>Resolvida</option>
          </select>
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancelar" : "+ Nova Ocorrência"}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="form-card">
          <h2>Nova Ocorrência</h2>
          <div className="form-grid">
            <input name="data" type="date" value={form.data} onChange={handleChange} />
            <select name="tipo" value={form.tipo} onChange={handleChange}>
              <option>Mecânica</option>
              <option>Acidente</option>
              <option>Infração</option>
              <option>Roubo/Furto</option>
              <option>Outro</option>
            </select>
            <input name="veiculo" placeholder="Placa do veículo" value={form.veiculo} onChange={handleChange} />
            <input name="motorista" placeholder="Nome do motorista" value={form.motorista} onChange={handleChange} />
            <input name="descricao" placeholder="Descrição da ocorrência" value={form.descricao} onChange={handleChange} />
            <select name="status" value={form.status} onChange={handleChange}>
              <option>Aberta</option>
              <option>Em andamento</option>
              <option>Resolvida</option>
            </select>
          </div>
          <div className="form-actions">
            <button className="btn-primary" onClick={handleAdd}>Salvar</button>
            <button className="btn-cancel" onClick={() => { setShowForm(false); setForm(emptyForm); }}>Cancelar</button>
          </div>
        </div>
      )}

      {carregando ? (
        <p style={{ color: "#94a3b8", padding: "16px" }}>Carregando...</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Data</th><th>Tipo</th><th>Veículo</th><th>Motorista</th>
              <th>Descrição</th><th>Status</th><th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {listagem.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: "center", color: "#94a3b8" }}>Nenhuma ocorrência encontrada.</td></tr>
            )}
            {listagem.map((o) => (
              <tr key={o.id}>
                <td>{o.data}</td>
                <td><span className="badge badge-blue">{o.tipo}</span></td>
                <td><strong>{o.veiculo}</strong></td>
                <td>{o.motorista}</td>
                <td style={{ color: "#64748b", fontSize: "13px" }}>{o.descricao}</td>
                <td>
                  <select
                    value={o.status}
                    onChange={(e) => alterarStatus(o.id, e.target.value)}
                    className={`badge ${statusBadge(o.status)}`}
                    style={{ border: "none", cursor: "pointer", fontWeight: "600", fontSize: "12px" }}
                  >
                    <option>Aberta</option>
                    <option>Em andamento</option>
                    <option>Resolvida</option>
                  </select>
                </td>
                <td><button className="btn-danger" onClick={() => remover(o.id)}>Remover</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
