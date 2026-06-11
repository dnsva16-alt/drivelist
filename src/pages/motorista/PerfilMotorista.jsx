import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../services/firebase";
import { useAuth } from "../../contexts/AuthContext";
import { useColecao } from "../../hooks/useColecao";
import { calcularScoreConformidade, infoScore, calcularPontosMes, calcularRanking } from "../../utils/calcularScore";

const ABAS = ["Resumo", "CNH", "Cursos", "Exames", "Treinamentos", "Ocorrências", "Avaliações"];

function formatarData(str) {
  if (!str) return "—";
  const [y, m, d] = str.split("-");
  return `${d}/${m}/${y}`;
}

function vencimentoStatus(validade) {
  if (!validade) return null;
  const hoje = new Date();
  const venc = new Date(validade + "T12:00:00");
  const diff = Math.ceil((venc - hoje) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { cor: "#991b1b", bg: "#fee2e2", texto: "Vencido" };
  if (diff <= 30) return { cor: "#854d0e", bg: "#fef9c3", texto: `Vence em ${diff}d` };
  return { cor: "#166534", bg: "#dcfce7", texto: "Válido" };
}

function Badge({ validade }) {
  const vs = vencimentoStatus(validade);
  if (!vs) return null;
  return (
    <span style={{ marginLeft: "8px", fontSize: "11px", padding: "2px 7px", borderRadius: "8px", background: vs.bg, color: vs.cor }}>
      {vs.texto}
    </span>
  );
}

function Secao({ titulo, vazia, children }) {
  if (vazia) {
    return (
      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "28px", textAlign: "center", color: "#94a3b8", fontSize: "14px" }}>
        Nenhum registro de {titulo.toLowerCase()} cadastrado pela empresa.
      </div>
    );
  }
  return <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>{children}</div>;
}

function Card({ children }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "14px 16px" }}>
      {children}
    </div>
  );
}

export default function PerfilMotorista() {
  const { usuario, perfil, sair } = useAuth();
  const navigate = useNavigate();
  const empresaId = perfil?.empresaId;

  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState("Resumo");

  const { dados: checklists } = useColecao("checklists", empresaId);
  const { dados: ocorrencias } = useColecao("ocorrencias", empresaId);

  const meusChecklists = useMemo(
    () => checklists.filter((c) => c.motoristaId === usuario?.uid).sort((a, b) => (b.data || "").localeCompare(a.data || "")),
    [checklists, usuario?.uid]
  );

  const minhasOcorrencias = useMemo(
    () => ocorrencias.filter((o) => o.motorista === perfil?.nome),
    [ocorrencias, perfil?.nome]
  );

  const score = useMemo(() => calcularScoreConformidade(meusChecklists), [meusChecklists]);
  const { pontos } = useMemo(() => calcularPontosMes(meusChecklists), [meusChecklists]);
  const { label: scoreLabel, cor: scoreCor, bg: scoreBg } = infoScore(score);

  const minhaPos = useMemo(() => {
    const ranking = calcularRanking(checklists);
    const pos = ranking.findIndex((r) => r.uid === usuario?.uid);
    return pos >= 0 ? pos + 1 : null;
  }, [checklists, usuario?.uid]);

  useEffect(() => {
    if (!empresaId || !usuario?.uid) return;
    getDoc(doc(db, `empresas/${empresaId}/motoristas/${usuario.uid}`))
      .then((snap) => snap.exists() && setDados(snap.data()))
      .finally(() => setCarregando(false));
  }, [empresaId, usuario?.uid]);

  async function handleSair() {
    await sair();
    navigate("/motorista/login");
  }

  if (carregando) {
    return (
      <div style={{ minHeight: "100vh", background: "#f5f7fa", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#94a3b8" }}>Carregando...</p>
      </div>
    );
  }

  const medalha = minhaPos === 1 ? "🥇" : minhaPos === 2 ? "🥈" : minhaPos === 3 ? "🥉" : null;

  return (
    <div style={{ minHeight: "100vh", background: "#f5f7fa" }}>
      {/* Header */}
      <header className="motorista-header">
        <div className="motorista-header-logo">
          <img src="/logo.png" alt="DriveList" className="header-logo-img" />
        </div>
        <div className="motorista-header-info">
          <span className="motorista-nome">{perfil?.nome || usuario?.email}</span>
          <button className="btn-sair" onClick={handleSair}>Sair</button>
        </div>
      </header>

      <div className="motorista-content">
        {/* Voltar */}
        <button
          onClick={() => navigate("/motorista")}
          style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "13px", padding: 0, marginBottom: "16px", display: "flex", alignItems: "center", gap: "4px" }}
        >
          ← Voltar ao Checklist
        </button>

        <div className="motorista-titulo-bloco">
          <h1>Meu Perfil Digital</h1>
          <p>Seus dados, documentos e histórico registrados pela empresa.</p>
        </div>

        {/* Abas */}
        <div style={{ display: "flex", gap: "2px", borderBottom: "2px solid #e2e8f0", marginBottom: "24px", overflowX: "auto" }}>
          {ABAS.map((aba) => (
            <button
              key={aba}
              onClick={() => setAbaAtiva(aba)}
              style={{
                background: "none", border: "none", padding: "10px 13px",
                fontSize: "13px", fontWeight: abaAtiva === aba ? "700" : "500",
                color: abaAtiva === aba ? "#1d4ed8" : "#64748b",
                borderBottom: abaAtiva === aba ? "2px solid #1d4ed8" : "2px solid transparent",
                marginBottom: "-2px", cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              {aba}
            </button>
          ))}
        </div>

        {/* ── Resumo ── */}
        {abaAtiva === "Resumo" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
              <div style={{ background: scoreBg, borderRadius: "12px", padding: "16px", textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: "26px", fontWeight: "800", color: scoreCor }}>{score !== null ? `${score}%` : "—"}</p>
                <p style={{ margin: "2px 0 0", fontSize: "11px", color: scoreCor, fontWeight: "600" }}>Conformidade</p>
                <p style={{ margin: "1px 0 0", fontSize: "11px", color: "#64748b" }}>{scoreLabel}</p>
              </div>
              <div style={{ background: "#f5f3ff", borderRadius: "12px", padding: "16px", textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: "26px", fontWeight: "800", color: "#7c3aed" }}>{pontos}</p>
                <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#7c3aed", fontWeight: "600" }}>Pontos este mês</p>
              </div>
              <div style={{ background: "#f0fdf4", borderRadius: "12px", padding: "16px", textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: "26px", fontWeight: "800", color: "#0f172a" }}>
                  {minhaPos ? `${medalha ?? ""}#${minhaPos}` : "—"}
                </p>
                <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#64748b", fontWeight: "600" }}>Ranking</p>
              </div>
            </div>

            <Card>
              <h2 style={{ fontSize: "16px", marginBottom: "12px" }}>Últimos Checklists</h2>
              {meusChecklists.length === 0 ? (
                <p style={{ color: "#94a3b8", fontSize: "14px" }}>Nenhum checklist registrado.</p>
              ) : (
                meusChecklists.slice(0, 8).map((c) => (
                  <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                    <div>
                      <strong style={{ fontSize: "14px" }}>{c.placa}</strong>
                      <span style={{ color: "#94a3b8", fontSize: "12px", marginLeft: "8px" }}>{c.data}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{
                        padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "600",
                        background: c.status === "OK" ? "#dcfce7" : c.status === "Atenção" ? "#fef9c3" : "#fee2e2",
                        color:      c.status === "OK" ? "#166534" : c.status === "Atenção" ? "#854d0e" : "#991b1b",
                      }}>
                        {c.status}
                      </span>
                      {c.pdfUrl && (
                        <a href={c.pdfUrl} target="_blank" rel="noreferrer" style={{ color: "#1d4ed8", fontSize: "12px" }}>PDF</a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </Card>
          </div>
        )}

        {/* ── CNH ── */}
        {abaAtiva === "CNH" && (
          <Card>
            <h2 style={{ fontSize: "16px", marginBottom: "16px" }}>Carteira Nacional de Habilitação</h2>
            {!dados?.cnh && !dados?.cnhValidade ? (
              <p style={{ color: "#94a3b8", fontSize: "14px" }}>Dados da CNH não cadastrados pela empresa.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                {[
                  { label: "Número da CNH", valor: dados?.cnh },
                  { label: "Categoria", valor: dados?.categoria },
                  { label: "Data de emissão", valor: dados?.cnhEmissao ? formatarData(dados.cnhEmissao) : null },
                  { label: "Validade", valor: dados?.cnhValidade ? formatarData(dados.cnhValidade) : null, extra: <Badge validade={dados?.cnhValidade} /> },
                  { label: "Restrições", valor: dados?.cnhRestricoes, full: true },
                ].map(({ label, valor, extra, full }) => valor ? (
                  <div key={label} style={full ? { gridColumn: "1 / -1" } : {}}>
                    <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</p>
                    <p style={{ margin: "4px 0 0", fontSize: "15px", fontWeight: "600", color: "#0f172a" }}>
                      {valor}{extra}
                    </p>
                  </div>
                ) : null)}
              </div>
            )}
          </Card>
        )}

        {/* ── Cursos ── */}
        {abaAtiva === "Cursos" && (
          <Secao titulo="Cursos" vazia={!dados?.cursos?.length}>
            {(dados?.cursos || []).map((item) => (
              <Card key={item.id}>
                <strong style={{ fontSize: "15px" }}>{item.nome}</strong>
                <Badge validade={item.validade} />
                {item.instituicao && <span style={{ color: "#64748b", fontSize: "13px" }}> · {item.instituicao}</span>}
                <br />
                <small style={{ color: "#94a3b8" }}>
                  {item.dataRealizacao && `Realizado: ${formatarData(item.dataRealizacao)}`}
                  {item.validade && ` · Válido até: ${formatarData(item.validade)}`}
                  {item.cargaHoraria && ` · ${item.cargaHoraria}h`}
                </small>
              </Card>
            ))}
          </Secao>
        )}

        {/* ── Exames ── */}
        {abaAtiva === "Exames" && (
          <Secao titulo="Exames" vazia={!dados?.exames?.length}>
            {(dados?.exames || []).map((item) => {
              const apto = item.resultado?.toLowerCase().includes("apto");
              return (
                <Card key={item.id}>
                  <strong style={{ fontSize: "15px" }}>{item.tipo}</strong>
                  {item.resultado && (
                    <span style={{
                      marginLeft: "8px", fontSize: "12px", padding: "2px 8px", borderRadius: "12px",
                      background: apto ? "#dcfce7" : "#fee2e2",
                      color:      apto ? "#166534" : "#991b1b",
                    }}>
                      {item.resultado}
                    </span>
                  )}
                  <Badge validade={item.validade} />
                  <br />
                  <small style={{ color: "#94a3b8" }}>
                    {item.data && `Data: ${formatarData(item.data)}`}
                    {item.validade && ` · Válido até: ${formatarData(item.validade)}`}
                  </small>
                </Card>
              );
            })}
          </Secao>
        )}

        {/* ── Treinamentos ── */}
        {abaAtiva === "Treinamentos" && (
          <Secao titulo="Treinamentos" vazia={!dados?.treinamentos?.length}>
            {(dados?.treinamentos || []).map((item) => (
              <Card key={item.id}>
                <strong style={{ fontSize: "15px" }}>{item.nome}</strong>
                {item.instituicao && <span style={{ color: "#64748b", fontSize: "13px" }}> · {item.instituicao}</span>}
                <br />
                <small style={{ color: "#94a3b8" }}>
                  {item.data && `Data: ${formatarData(item.data)}`}
                  {item.cargaHoraria && ` · ${item.cargaHoraria}h`}
                </small>
              </Card>
            ))}
          </Secao>
        )}

        {/* ── Ocorrências ── */}
        {abaAtiva === "Ocorrências" && (
          <Secao titulo="Ocorrências" vazia={!minhasOcorrencias.length}>
            {minhasOcorrencias.map((o) => (
              <Card key={o.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <strong style={{ fontSize: "14px" }}>{o.tipo}</strong>
                    {o.veiculo && <span style={{ color: "#64748b", fontSize: "13px" }}> · {o.veiculo}</span>}
                    <br />
                    <small style={{ color: "#94a3b8" }}>{o.data}</small>
                    {o.descricao && <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#374151" }}>{o.descricao}</p>}
                  </div>
                  <span className={`badge ${o.status === "Resolvida" ? "badge-green" : "badge-red"}`} style={{ flexShrink: 0 }}>
                    {o.status}
                  </span>
                </div>
              </Card>
            ))}
          </Secao>
        )}

        {/* ── Avaliações ── */}
        {abaAtiva === "Avaliações" && (
          <Secao titulo="Avaliações" vazia={!dados?.avaliacoes?.length}>
            {(dados?.avaliacoes || []).map((item) => {
              const nota = Number(item.nota);
              const cor  = nota >= 7 ? "#166534" : nota >= 5 ? "#854d0e" : "#991b1b";
              const bg   = nota >= 7 ? "#dcfce7" : nota >= 5 ? "#fef9c3" : "#fee2e2";
              return (
                <Card key={item.id}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ background: bg, borderRadius: "10px", padding: "8px 14px", textAlign: "center" }}>
                      <p style={{ margin: 0, fontSize: "22px", fontWeight: "800", color: cor }}>{item.nota}</p>
                      <p style={{ margin: 0, fontSize: "10px", color: cor }}>/ 10</p>
                    </div>
                    <div>
                      {item.avaliador && <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>por {item.avaliador}</p>}
                      {item.data && <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#94a3b8" }}>{formatarData(item.data)}</p>}
                      {item.comentario && <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#374151" }}>{item.comentario}</p>}
                    </div>
                  </div>
                </Card>
              );
            })}
          </Secao>
        )}

        <div style={{ height: "32px" }} />
      </div>
    </div>
  );
}
