import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useColecao } from "../hooks/useColecao";

const emptyForm = { placa: "", modelo: "", ano: "", tipo: "Van", status: "Ativo" };

export default function Veiculos() {
  const { perfil } = useAuth();
  const { dados: veiculos, carregando, adicionar, remover } = useColecao("veiculos", perfil?.empresaId);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleAdd() {
    if (!form.placa.trim() || !form.modelo.trim()) return;
    await adicionar(form);
    setForm(emptyForm);
    setShowForm(false);
  }

  function statusBadge(status) {
    if (status === "Ativo") return "badge-green";
    if (status === "Em manutenção") return "badge-yellow";
    return "badge-red";
  }

  return (
    <div>
      <div className="page-header">
        <h1>Veículos</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancelar" : "+ Novo Veículo"}
        </button>
      </div>

      {showForm && (
        <div className="form-card">
          <h2>Novo Veículo</h2>
          <div className="form-grid">
            <input name="placa" placeholder="Placa (ex: ABC-1234)" value={form.placa} onChange={handleChange} />
            <input name="modelo" placeholder="Modelo" value={form.modelo} onChange={handleChange} />
            <input name="ano" placeholder="Ano" type="number" value={form.ano} onChange={handleChange} />
            <select name="tipo" value={form.tipo} onChange={handleChange}>
              <option>Van</option>
              <option>Caminhão leve</option>
              <option>Caminhão pesado</option>
              <option>Utilitário</option>
              <option>Ônibus</option>
            </select>
            <select name="status" value={form.status} onChange={handleChange}>
              <option>Ativo</option>
              <option>Em manutenção</option>
              <option>Inativo</option>
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
              <th>Placa</th><th>Modelo</th><th>Ano</th><th>Tipo</th><th>Status</th><th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {veiculos.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: "center", color: "#94a3b8" }}>Nenhum veículo cadastrado.</td></tr>
            )}
            {veiculos.map((v) => (
              <tr key={v.id}>
                <td><strong>{v.placa}</strong></td>
                <td>{v.modelo}</td>
                <td>{v.ano}</td>
                <td>{v.tipo}</td>
                <td><span className={`badge ${statusBadge(v.status)}`}>{v.status}</span></td>
                <td><button className="btn-danger" onClick={() => remover(v.id)}>Remover</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
