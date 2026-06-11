import { useEffect, useState, useMemo } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

// ─── Definição dos planos ────────────────────────────────────────────────────
export const PLANOS = {
  starter: {
    nome: "Starter",
    preco: 97,
    limiteMotoristas: 5,
    limiteVeiculos: 5,
    cor: "#475569",
    bg: "#f1f5f9",
  },
  professional: {
    nome: "Professional",
    preco: 197,
    limiteMotoristas: 20,
    limiteVeiculos: 20,
    cor: "#1d4ed8",
    bg: "#eff6ff",
  },
  enterprise: {
    nome: "Enterprise",
    preco: 397,
    limiteMotoristas: 9999,
    limiteVeiculos: 9999,
    cor: "#7c3aed",
    bg: "#f5f3ff",
  },
};

const STATUS_ASSINATURA = {
  trial:     { label: "Trial",    cor: "#854d0e", bg: "#fef9c3" },
  ativa:     { label: "Ativa",    cor: "#166534", bg: "#dcfce7" },
  vencida:   { label: "Vencida",  cor: "#991b1b", bg: "#fee2e2" },
  cancelada: { label: "Cancelada",cor: "#475569", bg: "#f1f5f9" },
};

function BadgePlano({ plano }) {
  const p = PLANOS[plano];
  if (!p) return <span style={{ color: "#94a3b8", fontSize: "12px" }}>—</span>;
  return (
    <span style={{ background: p.bg, color: p.cor, padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "700" }}>
      {p.nome}
    </span>
  );
}

function BadgeStatus({ status }) {
  const s = STATUS_ASSINATURA[status] || STATUS_ASSINATURA.trial;
  return (
    <span style={{ background: s.bg, color: s.cor, padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "600" }}>
      {s.label}
    </span>
  );
}

function diasRestantes(ts) {
  if (!ts) return null;
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
}

function formatarData(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("pt-BR");
}

// ─── Modal de aprovação / alteração de plano ────────────────────────────────
function ModalPlano({ empresa, onConfirmar, onCancelar, salvando }) {
  const isNova = empresa.status === "pendente";
  const [plano, setPlano] = useState(empresa.plano || "starter");
  const [tipo, setTipo]   = useState(empresa.statusAssinatura === "ativa" ? "paga" : "trial");
  const [dias, setDias]   = useState(14);
  const [vencimento, setVencimento] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split("T")[0];
  });
  const [obs, setObs] = useState(empresa.observacoes || "");

  function confirmar() {
    const p = PLANOS[plano];
    const payload = {
      plano,
      limiteMotoristas: p.limiteMotoristas,
      limiteVeiculos:   p.limiteVeiculos,
      valorMensal:      p.preco,
      observacoes:      obs,
    };
    if (tipo === "trial") {
      const trialFim = new Date();
      trialFim.setDate(trialFim.getDate() + Number(dias));
      payload.statusAssinatura = "trial";
      payload.trialAte = trialFim;
      payload.vencimentoAssinatura = trialFim;
    } else {
      payload.statusAssinatura = "ativa";
      payload.vencimentoAssinatura = new Date(vencimento + "T12:00:00");
      payload.trialAte = null;
    }
    onConfirmar(payload);
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ background: "#fff", borderRadius: "16px", padding: "28px", maxWidth: "480px", width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <h2 style={{ fontSize: "18px", fontWeight: "800", marginBottom: "4px" }}>
          {isNova ? "Aprovar empresa" : "Alterar plano"}
        </h2>
        <p style={{ color: "#64748b", fontSize: "13px", marginBottom: "20px" }}>{empresa.nomeEmpresa}</p>

        {/* Seleção de plano */}
        <p style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>Plano</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "20px" }}>
          {Object.entries(PLANOS).map(([key, p]) => (
            <button
              key={key}
              onClick={() => setPlano(key)}
              style={{
                border: plano === key ? `2px solid ${p.cor}` : "2px solid #e2e8f0",
                borderRadius: "10px", padding: "12px 8px", cursor: "pointer",
                background: plano === key ? p.bg : "#fff", textAlign: "center",
              }}
            >
              <p style={{ margin: 0, fontWeight: "700", fontSize: "13px", color: p.cor }}>{p.nome}</p>
              <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#64748b" }}>R$ {p.preco}/mês</p>
              <p style={{ margin: "2px 0 0", fontSize: "10px", color: "#94a3b8" }}>{p.limiteMotoristas === 9999 ? "Ilimitado" : `${p.limiteMotoristas} motoristas`}</p>
            </button>
          ))}
        </div>

        {/* Tipo de assinatura */}
        <p style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>Assinatura</p>
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          {[["trial", "Trial gratuito"], ["paga", "Assinatura paga"]].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setTipo(v)}
              style={{
                flex: 1, padding: "10px", borderRadius: "8px", cursor: "pointer",
                border: tipo === v ? "2px solid #1d4ed8" : "2px solid #e2e8f0",
                background: tipo === v ? "#eff6ff" : "#fff",
                fontWeight: tipo === v ? "700" : "500", fontSize: "13px",
                color: tipo === v ? "#1d4ed8" : "#64748b",
              }}
            >
              {l}
            </button>
          ))}
        </div>

        {tipo === "trial" ? (
          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", display: "block", marginBottom: "4px" }}>Duração do trial (dias)</label>
            <input type="number" value={dias} onChange={(e) => setDias(e.target.value)} min={1} max={90}
              style={{ width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "14px" }} />
          </div>
        ) : (
          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", display: "block", marginBottom: "4px" }}>Vencimento da assinatura</label>
            <input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "14px" }} />
          </div>
        )}

        <div style={{ marginBottom: "20px" }}>
          <label style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", display: "block", marginBottom: "4px" }}>Observações internas</label>
          <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} placeholder="Notas sobre o cliente, forma de pagamento..."
            style={{ width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "14px", resize: "vertical" }} />
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button className="btn-primary" style={{ flex: 1 }} disabled={salvando} onClick={confirmar}>
            {salvando ? "Salvando..." : isNova ? "Aprovar e ativar" : "Salvar alterações"}
          </button>
          <button className="btn-cancel" onClick={onCancelar}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────
export default function MasterAdmin() {
  const { sair } = useAuth();
  const navigate  = useNavigate();

  const [empresas, setEmpresas]       = useState([]);
  const [carregando, setCarregando]   = useState(true);
  const [processando, setProcessando] = useState(null);
  const [modalEmpresa, setModalEmpresa] = useState(null);
  const [abaAtiva, setAbaAtiva]       = useState("pendentes");

  async function carregar() {
    setCarregando(true);
    const snap = await getDocs(collection(db, "empresas"));
    const todas = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const ta = a.criadoEm?.toDate?.() ?? new Date(0);
        const tb = b.criadoEm?.toDate?.() ?? new Date(0);
        return tb - ta;
      });
    setEmpresas(todas);
    setCarregando(false);
  }

  useEffect(() => { carregar(); }, []);

  // ── Métricas SaaS ──────────────────────────────────────────────────────────
  const metricas = useMemo(() => {
    const ativas    = empresas.filter((e) => e.status === "ativo" && e.statusAssinatura === "ativa");
    const trial     = empresas.filter((e) => e.status === "ativo" && e.statusAssinatura === "trial");
    const vencidas  = empresas.filter((e) => e.status === "ativo" && e.statusAssinatura === "vencida");
    const pendentes = empresas.filter((e) => e.status === "pendente");
    const mrr       = ativas.reduce((acc, e) => acc + (e.valorMensal || 0), 0);
    const mrrTrial  = trial.reduce((acc, e) => acc + (PLANOS[e.plano]?.preco || 0), 0);
    return { ativas: ativas.length, trial: trial.length, vencidas: vencidas.length, pendentes: pendentes.length, mrr, mrrTrial };
  }, [empresas]);

  const listaFiltrada = useMemo(() => {
    if (abaAtiva === "pendentes") return empresas.filter((e) => e.status === "pendente");
    if (abaAtiva === "ativas")    return empresas.filter((e) => e.status === "ativo" && e.statusAssinatura === "ativa");
    if (abaAtiva === "trial")     return empresas.filter((e) => e.status === "ativo" && e.statusAssinatura === "trial");
    if (abaAtiva === "vencidas")  return empresas.filter((e) => e.status === "ativo" && e.statusAssinatura === "vencida");
    if (abaAtiva === "canceladas") return empresas.filter((e) => e.status === "rejeitado" || e.statusAssinatura === "cancelada");
    return empresas;
  }, [empresas, abaAtiva]);

  // ── Aprovar com plano ──────────────────────────────────────────────────────
  async function confirmarAprovacao(empresa, payload) {
    setProcessando(empresa.id);
    await updateDoc(doc(db, "empresas", empresa.id), { status: "ativo", ...payload });
    await updateDoc(doc(db, "usuarios", empresa.id), { status: "ativo" });
    setModalEmpresa(null);
    await carregar();
    setProcessando(null);
  }

  // ── Alterar plano ──────────────────────────────────────────────────────────
  async function confirmarAlteracaoPlano(empresa, payload) {
    setProcessando(empresa.id);
    await updateDoc(doc(db, "empresas", empresa.id), payload);
    setModalEmpresa(null);
    await carregar();
    setProcessando(null);
  }

  async function rejeitar(empresaId) {
    if (!confirm("Rejeitar este cadastro?")) return;
    setProcessando(empresaId);
    await updateDoc(doc(db, "empresas", empresaId), { status: "rejeitado" });
    await updateDoc(doc(db, "usuarios", empresaId), { status: "rejeitado" });
    await carregar();
    setProcessando(null);
  }

  async function cancelarAssinatura(empresaId) {
    if (!confirm("Cancelar a assinatura desta empresa?")) return;
    setProcessando(empresaId);
    await updateDoc(doc(db, "empresas", empresaId), { statusAssinatura: "cancelada" });
    await carregar();
    setProcessando(null);
  }

  async function marcarVencida(empresaId) {
    setProcessando(empresaId);
    await updateDoc(doc(db, "empresas", empresaId), { statusAssinatura: "vencida" });
    await carregar();
    setProcessando(null);
  }

  async function handleSair() { await sair(); navigate("/admin/login"); }

  const ABAS = [
    { key: "pendentes", label: `Pendentes${metricas.pendentes > 0 ? ` (${metricas.pendentes})` : ""}` },
    { key: "trial",     label: `Trial${metricas.trial > 0 ? ` (${metricas.trial})` : ""}` },
    { key: "ativas",    label: `Ativas${metricas.ativas > 0 ? ` (${metricas.ativas})` : ""}` },
    { key: "vencidas",  label: `Vencidas${metricas.vencidas > 0 ? ` (${metricas.vencidas})` : ""}` },
    { key: "canceladas", label: "Canceladas" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f5f7fa" }}>
      {/* Header */}
      <div style={{ background: "#0f172a", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <img src="/logo.png" alt="DriveList" style={{ height: "36px", background: "white", borderRadius: "8px", padding: "4px 10px" }} />
          <span style={{ color: "#94a3b8", fontSize: "13px", fontWeight: "600" }}>Painel Master · SaaS</span>
        </div>
        <button className="btn-sair" onClick={handleSair} style={{ width: "auto", padding: "6px 14px" }}>Sair</button>
      </div>

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "32px 24px" }}>

        {/* ── Cards de métricas ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "14px", marginBottom: "32px" }}>
          {[
            { label: "MRR",            valor: `R$ ${metricas.mrr.toLocaleString("pt-BR")}`, sub: "receita mensal recorrente", cor: "#166534", bg: "#dcfce7" },
            { label: "MRR Potencial",  valor: `R$ ${(metricas.mrr + metricas.mrrTrial).toLocaleString("pt-BR")}`, sub: "incluindo trials", cor: "#1d4ed8", bg: "#eff6ff" },
            { label: "Assinaturas",    valor: metricas.ativas,    sub: "empresas ativas",   cor: "#166534", bg: "#f0fdf4" },
            { label: "Em Trial",       valor: metricas.trial,     sub: "aguardando conversão", cor: "#854d0e", bg: "#fef9c3" },
            { label: "Vencidas",       valor: metricas.vencidas,  sub: "requer ação",       cor: "#991b1b", bg: "#fee2e2" },
            { label: "Pendentes",      valor: metricas.pendentes, sub: "aguardando aprovação", cor: "#475569", bg: "#f1f5f9" },
          ].map(({ label, valor, sub, cor, bg }) => (
            <div key={label} style={{ background: bg, borderRadius: "12px", padding: "16px" }}>
              <p style={{ margin: 0, fontSize: "11px", fontWeight: "700", color: cor, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</p>
              <p style={{ margin: "6px 0 2px", fontSize: "24px", fontWeight: "800", color: cor }}>{valor}</p>
              <p style={{ margin: 0, fontSize: "11px", color: "#64748b" }}>{sub}</p>
            </div>
          ))}
        </div>

        {/* ── Abas ── */}
        <div style={{ display: "flex", gap: "2px", borderBottom: "2px solid #e2e8f0", marginBottom: "24px" }}>
          {ABAS.map((aba) => (
            <button key={aba.key} onClick={() => setAbaAtiva(aba.key)} style={{
              background: "none", border: "none", padding: "10px 16px", fontSize: "14px", cursor: "pointer", whiteSpace: "nowrap",
              fontWeight: abaAtiva === aba.key ? "700" : "500",
              color: abaAtiva === aba.key ? "#1d4ed8" : "#64748b",
              borderBottom: abaAtiva === aba.key ? "2px solid #1d4ed8" : "2px solid transparent",
              marginBottom: "-2px",
            }}>
              {aba.label}
            </button>
          ))}
        </div>

        {/* ── Tabela ── */}
        {carregando ? (
          <p style={{ color: "#94a3b8", padding: "16px" }}>Carregando...</p>
        ) : listaFiltrada.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px", color: "#94a3b8", background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
            Nenhuma empresa nesta categoria.
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <table className="table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>E-mail</th>
                  <th>Plano</th>
                  <th>Assinatura</th>
                  <th>Vencimento</th>
                  <th>MRR</th>
                  <th>Cadastro</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {listaFiltrada.map((e) => {
                  const dias = diasRestantes(e.vencimentoAssinatura);
                  const vencendoBreve = dias !== null && dias <= 7 && dias >= 0;
                  return (
                    <tr key={e.id}>
                      <td>
                        <strong>{e.nomeEmpresa}</strong>
                        {e.observacoes && (
                          <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#94a3b8" }}>{e.observacoes}</p>
                        )}
                      </td>
                      <td style={{ color: "#64748b", fontSize: "13px" }}>{e.email}</td>
                      <td><BadgePlano plano={e.plano} /></td>
                      <td>
                        {e.statusAssinatura
                          ? <BadgeStatus status={e.statusAssinatura} />
                          : <span style={{ color: "#94a3b8", fontSize: "12px" }}>—</span>
                        }
                      </td>
                      <td>
                        <span style={{ fontSize: "13px", color: vencendoBreve ? "#991b1b" : "#374151", fontWeight: vencendoBreve ? "700" : "400" }}>
                          {e.vencimentoAssinatura ? formatarData(e.vencimentoAssinatura) : "—"}
                        </span>
                        {vencendoBreve && <p style={{ margin: 0, fontSize: "11px", color: "#991b1b" }}>Vence em {dias}d</p>}
                      </td>
                      <td style={{ fontWeight: "700", color: "#166534" }}>
                        {e.valorMensal ? `R$ ${e.valorMensal}` : "—"}
                      </td>
                      <td style={{ fontSize: "13px", color: "#64748b" }}>{formatarData(e.criadoEm)}</td>
                      <td>
                        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                          {e.status === "pendente" ? (
                            <>
                              <button className="btn-primary" style={{ padding: "5px 10px", fontSize: "12px" }}
                                disabled={processando === e.id} onClick={() => setModalEmpresa(e)}>
                                Aprovar
                              </button>
                              <button className="btn-danger" style={{ padding: "5px 10px", fontSize: "12px" }}
                                disabled={processando === e.id} onClick={() => rejeitar(e.id)}>
                                Rejeitar
                              </button>
                            </>
                          ) : (
                            <>
                              <button style={{ padding: "5px 10px", fontSize: "12px", background: "#eff6ff", color: "#1d4ed8", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}
                                onClick={() => setModalEmpresa(e)}>
                                Plano
                              </button>
                              {e.statusAssinatura !== "cancelada" && (
                                <button style={{ padding: "5px 10px", fontSize: "12px", background: "#fee2e2", color: "#991b1b", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}
                                  disabled={processando === e.id} onClick={() => cancelarAssinatura(e.id)}>
                                  Cancelar
                                </button>
                              )}
                              {e.statusAssinatura === "ativa" && (
                                <button style={{ padding: "5px 10px", fontSize: "12px", background: "#fef9c3", color: "#854d0e", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}
                                  disabled={processando === e.id} onClick={() => marcarVencida(e.id)}>
                                  Vencida
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal aprovação / alteração de plano */}
      {modalEmpresa && (
        <ModalPlano
          empresa={modalEmpresa}
          salvando={processando === modalEmpresa.id}
          onCancelar={() => setModalEmpresa(null)}
          onConfirmar={(payload) =>
            modalEmpresa.status === "pendente"
              ? confirmarAprovacao(modalEmpresa, payload)
              : confirmarAlteracaoPlano(modalEmpresa, payload)
          }
        />
      )}
    </div>
  );
}
