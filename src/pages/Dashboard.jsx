import { useAuth } from "../contexts/AuthContext";
import { useColecao } from "../hooks/useColecao";

export default function Dashboard() {
  const { perfil } = useAuth();
  const empresaId = perfil?.empresaId;

  const { dados: motoristas } = useColecao("motoristas", empresaId);
  const { dados: veiculos } = useColecao("veiculos", empresaId);
  const { dados: checklists } = useColecao("checklists", empresaId);
  const { dados: ocorrencias } = useColecao("ocorrencias", empresaId);

  const hoje = new Date().toISOString().split("T")[0];

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
