import { useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useColecao } from "../hooks/useColecao";

function calcularDiasAtras(dias) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().split("T")[0];
}

export default function Admin() {
  const { perfil } = useAuth();
  const empresaId = perfil?.empresaId;

  const { dados: motoristas } = useColecao("motoristas", empresaId);
  const { dados: veiculos }   = useColecao("veiculos",   empresaId);
  const { dados: checklists } = useColecao("checklists", empresaId);
  const { dados: ocorrencias } = useColecao("ocorrencias", empresaId);

  const hoje = new Date().toISOString().split("T")[0];
  const ha30 = calcularDiasAtras(30);

  // ── Alertas: motoristas com menor índice de checklist ──────
  const alertasMotoristas = useMemo(() => {
    if (!motoristas.length || !checklists.length) return [];
    const checklists30 = checklists.filter((c) => c.data >= ha30);
    const countPorMotorista = motoristas
      .filter((m) => m.status === "Ativo")
      .map((m) => {
        const total = checklists30.filter(
          (c) => c.motoristaId === m.uid || c.motorista === m.nome
        ).length;
        return { nome: m.nome, total };
      })
      .sort((a, b) => a.total - b.total);

    const media = countPorMotorista.reduce((s, m) => s + m.total, 0) / (countPorMotorista.length || 1);
    return countPorMotorista.filter((m) => m.total < Math.max(media * 0.6, 1)).slice(0, 5);
  }, [motoristas, checklists, ha30]);

  // ── Alertas: veículos com mais avarias ─────────────────────
  const alertasVeiculos = useMemo(() => {
    const contagem = {};

    // Conta ocorrências mecânicas e acidentes por placa
    ocorrencias.forEach((o) => {
      if (["Mecânica", "Acidente"].includes(o.tipo)) {
        const placa = o.veiculo || o.placa;
        if (placa) contagem[placa] = (contagem[placa] || 0) + 1;
      }
    });

    // Conta itens críticos por placa nos checklists
    checklists.forEach((c) => {
      if (c.status === "Crítico") {
        const placa = c.placa || c.veiculo;
        if (placa) contagem[placa] = (contagem[placa] || 0) + 2; // peso maior
      } else if (c.status === "Atenção") {
        const placa = c.placa || c.veiculo;
        if (placa) contagem[placa] = (contagem[placa] || 0) + 1;
      }
    });

    return Object.entries(contagem)
      .filter(([, v]) => v >= 2)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([placa, pontos]) => ({ placa, pontos }));
  }, [ocorrencias, checklists]);

  const resumo = [
    { label: "Motoristas ativos",    value: motoristas.filter((m) => m.status === "Ativo").length, color: "#10b981" },
    { label: "Veículos ativos",      value: veiculos.filter((v) => v.status === "Ativo").length,   color: "#3b82f6" },
    { label: "Checklists hoje",      value: checklists.filter((c) => c.data === hoje).length,      color: "#f59e0b" },
    { label: "Ocorrências abertas",  value: ocorrencias.filter((o) => o.status === "Aberta").length, color: "#ef4444" },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Painel Administrativo</h1>
        <span className="badge badge-blue">Admin</span>
      </div>

      {/* Empresa */}
      <div className="section" style={{ marginBottom: "20px" }}>
        <h2>Informações da Empresa</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginTop: "12px" }}>
          {[
            ["Empresa",       perfil?.nomeEmpresa],
            ["Administrador", perfil?.nome],
            ["E-mail",        perfil?.email],
          ].map(([label, val]) => (
            <div key={label}>
              <span style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase" }}>{label}</span>
              <p style={{ fontWeight: "600", color: "#0f172a", fontSize: "14px", marginTop: "2px" }}>{val || "—"}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Resumo */}
      <div className="cards">
        {resumo.map((r) => (
          <div className="card" key={r.label} style={{ borderTop: `4px solid ${r.color}` }}>
            <span className="card-value" style={{ color: r.color }}>{r.value}</span>
            <span className="card-label">{r.label}</span>
          </div>
        ))}
      </div>

      {/* ── Alertas ──────────────────────────────────────────── */}
      {(alertasMotoristas.length > 0 || alertasVeiculos.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>

          {/* Motoristas com baixo índice */}
          {alertasMotoristas.length > 0 && (
            <div className="section" style={{ borderLeft: "4px solid #f59e0b" }}>
              <h2 style={{ color: "#854d0e" }}>⚠ Motoristas com baixo índice de checklist</h2>
              <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "12px" }}>Últimos 30 dias — abaixo da média da frota</p>
              <table className="table" style={{ boxShadow: "none" }}>
                <thead>
                  <tr>
                    <th>Motorista</th>
                    <th>Checklists</th>
                    <th>Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {alertasMotoristas.map((m) => (
                    <tr key={m.nome}>
                      <td>{m.nome}</td>
                      <td style={{ textAlign: "center" }}><strong>{m.total}</strong></td>
                      <td>
                        <span className="badge badge-yellow">
                          {m.total === 0 ? "Sem registros" : "Abaixo da média"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Veículos com mais avarias */}
          {alertasVeiculos.length > 0 && (
            <div className="section" style={{ borderLeft: "4px solid #ef4444" }}>
              <h2 style={{ color: "#991b1b" }}>🔴 Veículos com maior volume de avarias</h2>
              <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "12px" }}>Baseado em ocorrências + itens críticos nos checklists</p>
              <table className="table" style={{ boxShadow: "none" }}>
                <thead>
                  <tr>
                    <th>Placa</th>
                    <th>Pontuação</th>
                    <th>Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {alertasVeiculos.map((v) => (
                    <tr key={v.placa}>
                      <td><strong>{v.placa}</strong></td>
                      <td style={{ textAlign: "center" }}>{v.pontos}</td>
                      <td>
                        <span className={`badge ${v.pontos >= 5 ? "badge-red" : "badge-yellow"}`}>
                          {v.pontos >= 5 ? "Atenção crítica" : "Alto índice"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tabelas gerais */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        <div className="section">
          <h2>Motoristas ({motoristas.length})</h2>
          {motoristas.length === 0 ? <p style={{ color: "#94a3b8", fontSize: "14px" }}>Nenhum cadastrado.</p> : (
            <table className="table" style={{ boxShadow: "none" }}>
              <thead><tr><th>Nome</th><th>Matrícula</th><th>Status</th></tr></thead>
              <tbody>
                {motoristas.map((m) => (
                  <tr key={m.id}>
                    <td>{m.nome}</td>
                    <td style={{ color: "#64748b" }}>{m.matricula || "—"}</td>
                    <td><span className={`badge ${m.status === "Ativo" ? "badge-green" : "badge-red"}`}>{m.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="section">
          <h2>Veículos ({veiculos.length})</h2>
          {veiculos.length === 0 ? <p style={{ color: "#94a3b8", fontSize: "14px" }}>Nenhum cadastrado.</p> : (
            <table className="table" style={{ boxShadow: "none" }}>
              <thead><tr><th>Placa</th><th>Modelo</th><th>Status</th></tr></thead>
              <tbody>
                {veiculos.map((v) => (
                  <tr key={v.id}>
                    <td><strong>{v.placa}</strong></td>
                    <td style={{ color: "#64748b" }}>{v.modelo}</td>
                    <td><span className={`badge ${v.status === "Ativo" ? "badge-green" : v.status === "Em manutenção" ? "badge-yellow" : "badge-red"}`}>{v.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="section">
          <h2>Checklists de hoje ({checklists.filter((c) => c.data === hoje).length})</h2>
          {checklists.filter((c) => c.data === hoje).length === 0 ? (
            <p style={{ color: "#94a3b8", fontSize: "14px" }}>Nenhum checklist enviado hoje.</p>
          ) : (
            <table className="table" style={{ boxShadow: "none" }}>
              <thead><tr><th>Placa</th><th>Motorista</th><th>Status</th></tr></thead>
              <tbody>
                {checklists.filter((c) => c.data === hoje).map((c) => (
                  <tr key={c.id}>
                    <td><strong>{c.placa || c.veiculo}</strong></td>
                    <td style={{ color: "#64748b" }}>{c.motorista}</td>
                    <td><span className={`badge ${c.status === "OK" ? "badge-green" : c.status === "Atenção" ? "badge-yellow" : "badge-red"}`}>{c.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="section">
          <h2>Ocorrências abertas ({ocorrencias.filter((o) => o.status === "Aberta").length})</h2>
          {ocorrencias.filter((o) => o.status === "Aberta").length === 0 ? (
            <p style={{ color: "#94a3b8", fontSize: "14px" }}>Nenhuma ocorrência aberta.</p>
          ) : (
            <table className="table" style={{ boxShadow: "none" }}>
              <thead><tr><th>Veículo</th><th>Tipo</th><th>Data</th></tr></thead>
              <tbody>
                {ocorrencias.filter((o) => o.status === "Aberta").map((o) => (
                  <tr key={o.id}>
                    <td><strong>{o.veiculo}</strong></td>
                    <td><span className="badge badge-blue">{o.tipo}</span></td>
                    <td style={{ color: "#64748b" }}>{o.data}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
