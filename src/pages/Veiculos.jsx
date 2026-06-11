import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { useAuth } from "../contexts/AuthContext";
import { useColecao } from "../hooks/useColecao";

const emptyForm = { placa: "", modelo: "", ano: "", tipo: "Van", status: "Ativo" };

export default function Veiculos() {
  const { perfil } = useAuth();
  const empresaId = perfil?.empresaId;
  const { dados: veiculos, carregando, adicionar, remover } = useColecao("veiculos", empresaId);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [limites, setLimites] = useState({ limiteVeiculos: 9999, plano: null });

  useEffect(() => {
    if (!empresaId) return;
    getDoc(doc(db, "empresas", empresaId)).then((snap) => {
      if (snap.exists()) setLimites({ limiteVeiculos: snap.data().limiteVeiculos ?? 9999, plano: snap.data().plano });
    });
  }, [empresaId]);

  const limiteAtingido = veiculos.length >= limites.limiteVeiculos;

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
        <div>
          <h1 style={{ margin: 0 }}>Veículos</h1>
          {limites.plano && (
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: limiteAtingido ? "#991b1b" : "#64748b" }}>
              {veiculos.length}/{limites.limiteVeiculos === 9999 ? "∞" : limites.limiteVeiculos} veículos usados
              {limiteAtingido && " · Limite do plano atingido"}
            </p>
          )}
        </div>
        <button
          className="btn-primary"
          onClick={() => !limiteAtingido && setShowForm(!showForm)}
          disabled={limiteAtingido && !showForm}
          title={limiteAtingido ? "Limite de veículos do seu plano atingido. Fale com o suporte para fazer upgrade." : ""}
        >
          {showForm ? "Cancelar" : "+ Novo Veículo"}
        </button>
      </div>

      {limiteAtingido && !showForm && (
        <div style={{ background: "#fef9c3", border: "1px solid #fde047", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "18px" }}>⚠️</span>
          <div>
            <p style={{ margin: 0, fontWeight: "700", fontSize: "14px", color: "#854d0e" }}>Limite de veículos atingido</p>
            <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#854d0e" }}>
              Seu plano <strong>{limites.plano}</strong> permite até {limites.limiteVeiculos} veículos. Entre em contato para fazer upgrade.
            </p>
          </div>
        </div>
      )}

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
