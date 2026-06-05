import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useColecao } from "../hooks/useColecao";

export default function Checklists() {
  const { perfil } = useAuth();
  const { dados: checklists, carregando, remover } = useColecao("checklists", perfil?.empresaId);
  const [filtro, setFiltro] = useState("Todos");
  const [expandido, setExpandido] = useState(null);

  function statusBadge(status) {
    if (status === "OK") return "badge-green";
    if (status === "Atenção") return "badge-yellow";
    return "badge-red";
  }

  const listagem = filtro === "Todos" ? checklists : checklists.filter((c) => c.status === filtro);

  function toggleExpand(id) {
    setExpandido(expandido === id ? null : id);
  }

  function parseItens(itensStr) {
    try { return JSON.parse(itensStr); } catch { return null; }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Checklists</h1>
        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          style={{ padding: "9px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "14px" }}
        >
          <option>Todos</option>
          <option>OK</option>
          <option>Atenção</option>
          <option>Crítico</option>
        </select>
      </div>

      <p style={{ color: "#64748b", fontSize: "13px", marginBottom: "16px" }}>
        Os checklists são enviados pelos motoristas pelo painel deles. Clique em uma linha para ver os detalhes.
      </p>

      {carregando ? (
        <p style={{ color: "#94a3b8", padding: "16px" }}>Carregando...</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Placa</th>
              <th>Motorista</th>
              <th>Observações / Problemas</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {listagem.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", color: "#94a3b8" }}>
                  Nenhum checklist encontrado.
                </td>
              </tr>
            )}
            {listagem.map((c) => {
              const itens = parseItens(c.itens);
              const aberto = expandido === c.id;
              return (
                <>
                  <tr
                    key={c.id}
                    onClick={() => toggleExpand(c.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <td>{c.data}</td>
                    <td><strong>{c.placa || c.veiculo}</strong></td>
                    <td>{c.motorista}</td>
                    <td style={{ color: "#64748b", fontSize: "13px" }}>
                      {c.itensResumo || c.itens || "—"}
                    </td>
                    <td>
                      <span className={`badge ${statusBadge(c.status)}`}>{c.status}</span>
                    </td>
                    <td style={{ display: "flex", gap: "6px" }}>
                      {c.pdfUrl && (
                        <a href={c.pdfUrl} target="_blank" rel="noreferrer"
                          className="btn-cancel"
                          style={{ padding: "5px 10px", fontSize: "12px", textDecoration: "none" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          PDF
                        </a>
                      )}
                      <button className="btn-danger" onClick={(e) => { e.stopPropagation(); remover(c.id); }}>
                        Remover
                      </button>
                    </td>
                  </tr>
                  {aberto && itens && (
                    <tr key={`${c.id}-detail`}>
                      <td colSpan={6} style={{ background: "#f8fafc", padding: "16px 20px" }}>
                        <strong style={{ display: "block", marginBottom: "10px", color: "#0f172a" }}>
                          Detalhes do checklist — {c.placa || c.veiculo}
                        </strong>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "6px" }}>
                          {Object.entries(itens).map(([item, valor]) => (
                            <div key={item} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "white", borderRadius: "6px", fontSize: "13px" }}>
                              <span style={{ color: "#334155" }}>{item}</span>
                              <span className={`badge ${valor === "OK" ? "badge-green" : valor === "Atenção" ? "badge-yellow" : "badge-red"}`} style={{ fontSize: "11px" }}>
                                {valor}
                              </span>
                            </div>
                          ))}
                        </div>
                        {c.observacoes && (
                          <p style={{ marginTop: "10px", color: "#64748b", fontSize: "13px" }}>
                            <strong>Obs:</strong> {c.observacoes}
                          </p>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
