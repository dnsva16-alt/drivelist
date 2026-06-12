import { useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useColecao } from "../hooks/useColecao";
import { calcularRanking, infoScore } from "../utils/calcularScore";

export default function Dashboard() {
  const { perfil } = useAuth();
  const empresaId = perfil?.empresaId;

  const { dados: motoristas } = useColecao("motoristas", empresaId);
  const { dados: veiculos } = useColecao("veiculos", empresaId);
  const { dados: checklists } = useColecao("checklists", empresaId);
  const { dados: ocorrencias } = useColecao("ocorrencias", empresaId);

  const hoje = new Date().toISOString().split("T")[0];

  const ranking = useMemo(() => calcularRanking(checklists), [checklists]);

  const stats = [
    { label: "Veículos", value: veiculos.length, detalhe: `${veiculos.filter((v) => v.status === "Ativo").length} ativos`, color: "#3b82f6" },
    { label: "Motoristas", value: motoristas.length, detalhe: `${motoristas.filter((m) => m.status === "Ativo").length} ativos`, color: "#10b981" },
    { label: "Checklists hoje", value: checklists.filter((c) => c.data === hoje).length, detalhe: `${checklists.filter((c) => c.data === hoje && c.status !== "OK").length} com alertas`, color: "#f59e0b" },
    { label: "Ocorrências abertas", value: ocorrencias.filter((o) => o.status === "Aberta").length, detalhe: `${ocorrencias.filter((o) => o.status === "Em andamento").length} em andamento`, color: "#ef4444" },
  ];

  const atividadeRecente = [
    ...checklists.slice(0, 3).map((c) => ({
      id: `ch-${c.id}`,
      texto: `Checklist — ${c.placa || c.veiculo} por ${c.motorista}`,
      tempo: c.data,
      tipo: "checklist",
    })),
    ...ocorrencias.filter((o) => o.status === "Aberta").slice(0, 2).map((o) => ({
      id: `oc-${o.id}`,
      texto: `Ocorrência aberta — ${o.tipo}: ${o.veiculo || o.placa}`,
      tempo: o.data,
      tipo: "ocorrencia",
    })),
  ].slice(0, 5);

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <span style={{ color: "#94a3b8", fontSize: "14px" }}>{perfil?.nomeEmpresa}</span>
      </div>

      <div className="cards">
        {stats.map((s) => (
          <div className="card" key={s.label} style={{ borderTop: `4px solid ${s.color}` }}>
            <span className="card-value" style={{ color: s.color }}>{s.value}</span>
            <span className="card-label">{s.label}</span>
            <span style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>{s.detalhe}</span>
          </div>
        ))}
      </div>

      <div className="section">
        <h2>Ranking do Mês</h2>
        {ranking.length === 0 ? (
          <p style={{ color: "#94a3b8", fontSize: "14px" }}>Nenhum checklist registrado este mês.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {ranking.map((m, i) => {
              const medalha = ["🥇", "🥈", "🥉"][i] ?? `#${i + 1}`;
              const { cor, bg } = infoScore(m.score);
              return (
                <div key={m.uid} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", background: i === 0 ? "#fffbeb" : "#f8fafc", borderRadius: "10px", border: `1px solid ${i === 0 ? "#fde68a" : "#e2e8f0"}` }}>
                  <span style={{ fontSize: "20px", width: "28px", textAlign: "center" }}>{medalha}</span>
                  <span style={{ flex: 1, fontWeight: "600", color: "#1e293b", fontSize: "14px" }}>{m.nome}</span>
                  <span style={{ fontSize: "13px", color: "#64748b" }}>{m.totalChecklists} checklist{m.totalChecklists !== 1 ? "s" : ""}</span>
                  {m.score !== null && (
                    <span style={{ padding: "2px 8px", borderRadius: "12px", background: bg, color: cor, fontSize: "12px", fontWeight: "600" }}>{m.score}%</span>
                  )}
                  <span style={{ fontWeight: "700", color: "#7c3aed", fontSize: "15px", minWidth: "60px", textAlign: "right" }}>{m.pontos} pts</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="section">
        <h2>Atividade Recente</h2>
        {atividadeRecente.length === 0 ? (
          <p style={{ color: "#94a3b8", fontSize: "14px" }}>
            Nenhuma atividade ainda. Cadastre veículos e motoristas para começar.
          </p>
        ) : (
          <ul className="activity-list">
            {atividadeRecente.map((item) => (
              <li key={item.id} className="activity-item">
                <span>{item.texto}</span>
                <small>{item.tempo}</small>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
