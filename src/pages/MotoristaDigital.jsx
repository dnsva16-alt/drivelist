import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { useAuth } from "../contexts/AuthContext";
import { useColecao } from "../hooks/useColecao";
import { calcularScoreConformidade, infoScore, calcularPontosMes } from "../utils/calcularScore";

const ABAS = ["Resumo", "CNH", "Cursos", "Exames", "Treinamentos", "Ocorrências", "Avaliações"];
const CATEGORIAS_CNH = ["A", "AB", "AC", "AD", "AE", "B", "C", "D", "E"];

function gerarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function formatarData(str) {
  if (!str) return "";
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

// ─── Resumo ─────────────────────────────────────────────────────────────────
function ResumoTab({ score, pontos, scoreCor, scoreBg, scoreLabel, checklists, ocorrencias }) {
  const total   = checklists.length;
  const critico = checklists.filter((c) => c.status === "Crítico").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "12px" }}>
        {[
          { valor: score !== null ? `${score}%` : "—", label: "Conformidade", extra: scoreLabel, cor: scoreCor, bg: scoreBg },
          { valor: pontos, label: "Pontos este mês", cor: "#7c3aed", bg: "#f5f3ff" },
          { valor: total,  label: "Checklists total", cor: "#1d4ed8", bg: "#eff6ff" },
          { valor: critico, label: "Críticos", cor: "#991b1b", bg: "#fee2e2" },
        ].map(({ valor, label, extra, cor, bg }) => (
          <div key={label} style={{ background: bg, borderRadius: "12px", padding: "16px", textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: "26px", fontWeight: "800", color: cor }}>{valor}</p>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: cor, fontWeight: "600" }}>{label}</p>
            {extra && <p style={{ margin: "1px 0 0", fontSize: "11px", color: "#64748b" }}>{extra}</p>}
          </div>
        ))}
      </div>

      <div className="form-card">
        <h2 style={{ marginBottom: "12px" }}>Histórico de Checklists</h2>
        {checklists.length === 0 ? (
          <p style={{ color: "#94a3b8", fontSize: "14px" }}>Nenhum checklist registrado.</p>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Data</th><th>Placa</th><th>Status</th><th>Problemas</th><th>PDF</th></tr>
            </thead>
            <tbody>
              {checklists.slice(0, 10).map((c) => (
                <tr key={c.id}>
                  <td>{c.data}</td>
                  <td><strong>{c.placa}</strong></td>
                  <td>
                    <span style={{
                      padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "600",
                      background: c.status === "OK" ? "#dcfce7" : c.status === "Atenção" ? "#fef9c3" : "#fee2e2",
                      color:      c.status === "OK" ? "#166534" : c.status === "Atenção" ? "#854d0e" : "#991b1b",
                    }}>
                      {c.status}
                    </span>
                  </td>
                  <td style={{ color: "#64748b", fontSize: "13px" }}>{c.itensResumo || "—"}</td>
                  <td>
                    {c.pdfUrl && (
                      <a href={c.pdfUrl} target="_blank" rel="noreferrer" style={{ color: "#1d4ed8", fontSize: "13px" }}>PDF</a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {ocorrencias.length > 0 && (
        <div className="form-card">
          <h2 style={{ marginBottom: "12px" }}>Ocorrências</h2>
          <table className="table">
            <thead>
              <tr><th>Data</th><th>Tipo</th><th>Veículo</th><th>Status</th></tr>
            </thead>
            <tbody>
              {ocorrencias.slice(0, 5).map((o) => (
                <tr key={o.id}>
                  <td>{o.data}</td>
                  <td>{o.tipo}</td>
                  <td>{o.veiculo || "—"}</td>
                  <td>
                    <span className={`badge ${o.status === "Resolvida" ? "badge-green" : "badge-red"}`}>
                      {o.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── CNH ─────────────────────────────────────────────────────────────────────
function CnhTab({ motorista, onSalvar, salvando }) {
  const [form, setForm] = useState({
    cnh:           motorista.cnh || "",
    categoria:     motorista.categoria || "C",
    cnhValidade:   motorista.cnhValidade || "",
    cnhEmissao:    motorista.cnhEmissao || "",
    cnhRestricoes: motorista.cnhRestricoes || "",
  });

  const vs = vencimentoStatus(form.cnhValidade);

  return (
    <div className="form-card">
      <h2 style={{ marginBottom: "16px" }}>Carteira Nacional de Habilitação</h2>
      <div className="form-grid">
        <div>
          <label style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", display: "block", marginBottom: "4px" }}>Número da CNH</label>
          <input value={form.cnh} onChange={(e) => setForm((p) => ({ ...p, cnh: e.target.value }))} placeholder="Ex: 12345678900" />
        </div>
        <div>
          <label style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", display: "block", marginBottom: "4px" }}>Categoria</label>
          <select value={form.categoria} onChange={(e) => setForm((p) => ({ ...p, categoria: e.target.value }))}>
            {CATEGORIAS_CNH.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", display: "block", marginBottom: "4px" }}>Data de emissão</label>
          <input type="date" value={form.cnhEmissao} onChange={(e) => setForm((p) => ({ ...p, cnhEmissao: e.target.value }))} />
        </div>
        <div>
          <label style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", display: "block", marginBottom: "4px" }}>
            Validade{vs && (
              <span style={{ marginLeft: "8px", fontSize: "11px", padding: "2px 7px", borderRadius: "8px", background: vs.bg, color: vs.cor }}>
                {vs.texto}
              </span>
            )}
          </label>
          <input type="date" value={form.cnhValidade} onChange={(e) => setForm((p) => ({ ...p, cnhValidade: e.target.value }))} />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", display: "block", marginBottom: "4px" }}>Restrições / Observações</label>
          <input value={form.cnhRestricoes} onChange={(e) => setForm((p) => ({ ...p, cnhRestricoes: e.target.value }))} placeholder="Ex: Uso de lentes corretivas" />
        </div>
      </div>
      <div className="form-actions" style={{ marginTop: "16px" }}>
        <button className="btn-primary" disabled={salvando} onClick={() => onSalvar(form)}>
          {salvando ? "Salvando..." : "Salvar CNH"}
        </button>
      </div>
    </div>
  );
}

// ─── Lista genérica (Cursos / Exames / Treinamentos / Avaliações) ─────────────
function ListaTab({ titulo, items, campos, onSalvar, salvando, renderItem }) {
  const vazio = Object.fromEntries(campos.map((c) => [c.key, ""]));
  const [form, setForm] = useState(vazio);
  const [aberto, setAberto] = useState(false);

  async function adicionar() {
    const item = { id: gerarId(), ...form };
    await onSalvar([item, ...items]);
    setForm(vazio);
    setAberto(false);
  }

  async function remover(itemId) {
    if (!window.confirm("Remover este registro?")) return;
    await onSalvar(items.filter((i) => i.id !== itemId));
  }

  return (
    <div>
      <div className="page-header" style={{ marginBottom: "16px" }}>
        <h2 style={{ margin: 0, fontSize: "18px" }}>{titulo}</h2>
        <button className="btn-primary" onClick={() => setAberto((v) => !v)}>
          {aberto ? "Cancelar" : "+ Adicionar"}
        </button>
      </div>

      {aberto && (
        <div className="form-card" style={{ marginBottom: "20px" }}>
          <div className="form-grid">
            {campos.map((campo) =>
              campo.type === "textarea" ? (
                <div key={campo.key} style={{ gridColumn: "1 / -1" }}>
                  <label style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", display: "block", marginBottom: "4px" }}>{campo.label}</label>
                  <textarea
                    value={form[campo.key]}
                    onChange={(e) => setForm((p) => ({ ...p, [campo.key]: e.target.value }))}
                    rows={3}
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "14px", resize: "vertical" }}
                  />
                </div>
              ) : (
                <div key={campo.key}>
                  <label style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", display: "block", marginBottom: "4px" }}>{campo.label}</label>
                  <input
                    type={campo.type || "text"}
                    value={form[campo.key]}
                    onChange={(e) => setForm((p) => ({ ...p, [campo.key]: e.target.value }))}
                    placeholder={campo.placeholder || ""}
                    min={campo.min}
                    max={campo.max}
                  />
                </div>
              )
            )}
          </div>
          <div className="form-actions" style={{ marginTop: "12px" }}>
            <button className="btn-primary" disabled={salvando} onClick={adicionar}>
              {salvando ? "Salvando..." : "Salvar"}
            </button>
            <button className="btn-cancel" onClick={() => { setAberto(false); setForm(vazio); }}>Cancelar</button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="form-card" style={{ textAlign: "center", color: "#94a3b8", padding: "32px" }}>
          Nenhum registro de {titulo.toLowerCase()} cadastrado.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {items.map((item) => (
            <div key={item.id} className="form-card" style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
              <div style={{ flex: 1 }}>{renderItem(item)}</div>
              <button className="btn-danger" style={{ flexShrink: 0 }} onClick={() => remover(item.id)}>Remover</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Ocorrências (somente leitura) ────────────────────────────────────────────
function OcorrenciasTab({ ocorrencias }) {
  if (ocorrencias.length === 0) {
    return (
      <div className="form-card" style={{ textAlign: "center", color: "#94a3b8", padding: "32px" }}>
        Nenhuma ocorrência registrada para este motorista.
      </div>
    );
  }
  return (
    <table className="table">
      <thead>
        <tr><th>Data</th><th>Tipo</th><th>Veículo</th><th>Descrição</th><th>Status</th></tr>
      </thead>
      <tbody>
        {ocorrencias.map((o) => (
          <tr key={o.id}>
            <td>{o.data}</td>
            <td>{o.tipo}</td>
            <td>{o.veiculo || "—"}</td>
            <td style={{ color: "#64748b", fontSize: "13px" }}>{o.descricao || "—"}</td>
            <td>
              <span className={`badge ${o.status === "Resolvida" ? "badge-green" : "badge-red"}`}>
                {o.status}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function MotoristaDigital() {
  const { id } = useParams();
  const { perfil } = useAuth();
  const empresaId = perfil?.empresaId;
  const navigate = useNavigate();

  const [motorista, setMotorista] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState("Resumo");
  const [salvando, setSalvando] = useState(false);

  const { dados: checklists }  = useColecao("checklists",  empresaId);
  const { dados: ocorrencias } = useColecao("ocorrencias", empresaId);

  const meusChecklists = useMemo(
    () => checklists.filter((c) => c.motoristaId === id).sort((a, b) => (b.data || "").localeCompare(a.data || "")),
    [checklists, id]
  );

  const minhasOcorrencias = useMemo(
    () => ocorrencias.filter((o) => o.motorista === motorista?.nome),
    [ocorrencias, motorista]
  );

  const score  = useMemo(() => calcularScoreConformidade(meusChecklists), [meusChecklists]);
  const { pontos } = useMemo(() => calcularPontosMes(meusChecklists), [meusChecklists]);
  const { label: scoreLabel, cor: scoreCor, bg: scoreBg } = infoScore(score);

  useEffect(() => {
    if (!empresaId || !id) return;
    setCarregando(true);
    getDoc(doc(db, `empresas/${empresaId}/motoristas/${id}`))
      .then((snap) => snap.exists() && setMotorista({ id: snap.id, ...snap.data() }))
      .finally(() => setCarregando(false));
  }, [empresaId, id]);

  async function salvarCampos(campos) {
    setSalvando(true);
    try {
      await updateDoc(doc(db, `empresas/${empresaId}/motoristas/${id}`), campos);
      setMotorista((prev) => ({ ...prev, ...campos }));
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) return <p style={{ padding: "32px", color: "#94a3b8" }}>Carregando...</p>;
  if (!motorista) return <p style={{ padding: "32px", color: "#ef4444" }}>Motorista não encontrado.</p>;

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ marginBottom: "24px" }}>
        <button
          onClick={() => navigate("/admin/motoristas")}
          style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "13px", padding: 0, marginBottom: "8px", display: "flex", alignItems: "center", gap: "4px" }}
        >
          ← Voltar para Motoristas
        </button>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "22px" }}>{motorista.nome}</h1>
            <p style={{ color: "#64748b", fontSize: "14px", margin: "4px 0 0" }}>
              {[motorista.matricula && `Matrícula: ${motorista.matricula}`, motorista.email].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <span className={`badge ${motorista.status === "Ativo" ? "badge-green" : "badge-red"}`}>
              {motorista.status}
            </span>
            <div style={{ background: scoreBg, color: scoreCor, borderRadius: "20px", padding: "4px 12px", fontSize: "13px", fontWeight: "700" }}>
              {score !== null ? `${score}%` : "—"} · {scoreLabel}
            </div>
          </div>
        </div>
      </div>

      {/* Abas */}
      <div style={{ display: "flex", gap: "2px", borderBottom: "2px solid #e2e8f0", marginBottom: "24px", overflowX: "auto" }}>
        {ABAS.map((aba) => (
          <button
            key={aba}
            onClick={() => setAbaAtiva(aba)}
            style={{
              background: "none", border: "none", padding: "10px 14px",
              fontSize: "14px", fontWeight: abaAtiva === aba ? "700" : "500",
              color: abaAtiva === aba ? "#1d4ed8" : "#64748b",
              borderBottom: abaAtiva === aba ? "2px solid #1d4ed8" : "2px solid transparent",
              marginBottom: "-2px", cursor: "pointer", whiteSpace: "nowrap",
            }}
          >
            {aba}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      {abaAtiva === "Resumo" && (
        <ResumoTab
          score={score} pontos={pontos}
          scoreLabel={scoreLabel} scoreCor={scoreCor} scoreBg={scoreBg}
          checklists={meusChecklists} ocorrencias={minhasOcorrencias}
        />
      )}

      {abaAtiva === "CNH" && (
        <CnhTab motorista={motorista} onSalvar={salvarCampos} salvando={salvando} />
      )}

      {abaAtiva === "Cursos" && (
        <ListaTab
          titulo="Cursos"
          items={motorista.cursos || []}
          campos={[
            { key: "nome",           label: "Nome do curso",        type: "text" },
            { key: "instituicao",    label: "Instituição",          type: "text" },
            { key: "dataRealizacao", label: "Data de realização",   type: "date" },
            { key: "validade",       label: "Validade",             type: "date" },
            { key: "cargaHoraria",   label: "Carga horária (h)",    type: "number" },
          ]}
          onSalvar={(lista) => salvarCampos({ cursos: lista })}
          salvando={salvando}
          renderItem={(item) => {
            const vs = vencimentoStatus(item.validade);
            return (
              <>
                <strong>{item.nome}</strong>
                {item.instituicao && <span style={{ color: "#64748b" }}> · {item.instituicao}</span>}
                {vs && (
                  <span style={{ marginLeft: "8px", fontSize: "11px", padding: "2px 7px", borderRadius: "8px", background: vs.bg, color: vs.cor }}>{vs.texto}</span>
                )}
                <br />
                <small style={{ color: "#94a3b8" }}>
                  {item.dataRealizacao && `Realizado: ${formatarData(item.dataRealizacao)}`}
                  {item.validade && ` · Válido até: ${formatarData(item.validade)}`}
                  {item.cargaHoraria && ` · ${item.cargaHoraria}h`}
                </small>
              </>
            );
          }}
        />
      )}

      {abaAtiva === "Exames" && (
        <ListaTab
          titulo="Exames"
          items={motorista.exames || []}
          campos={[
            { key: "tipo",      label: "Tipo de exame", type: "text", placeholder: "Ex: Clínico, Toxicológico, Psicotécnico" },
            { key: "data",      label: "Data",          type: "date" },
            { key: "resultado", label: "Resultado",     type: "text", placeholder: "Apto / Inapto" },
            { key: "validade",  label: "Validade",      type: "date" },
          ]}
          onSalvar={(lista) => salvarCampos({ exames: lista })}
          salvando={salvando}
          renderItem={(item) => {
            const vs = vencimentoStatus(item.validade);
            const apto = item.resultado?.toLowerCase().includes("apto");
            return (
              <>
                <strong>{item.tipo}</strong>
                {item.resultado && (
                  <span style={{
                    marginLeft: "8px", fontSize: "12px", padding: "2px 8px", borderRadius: "12px",
                    background: apto ? "#dcfce7" : "#fee2e2",
                    color:      apto ? "#166534" : "#991b1b",
                  }}>
                    {item.resultado}
                  </span>
                )}
                {vs && (
                  <span style={{ marginLeft: "6px", fontSize: "11px", padding: "2px 7px", borderRadius: "8px", background: vs.bg, color: vs.cor }}>{vs.texto}</span>
                )}
                <br />
                <small style={{ color: "#94a3b8" }}>
                  {item.data && `Data: ${formatarData(item.data)}`}
                  {item.validade && ` · Válido até: ${formatarData(item.validade)}`}
                </small>
              </>
            );
          }}
        />
      )}

      {abaAtiva === "Treinamentos" && (
        <ListaTab
          titulo="Treinamentos"
          items={motorista.treinamentos || []}
          campos={[
            { key: "nome",         label: "Nome do treinamento",    type: "text" },
            { key: "instituicao",  label: "Instituição / Instrutor", type: "text" },
            { key: "data",         label: "Data",                   type: "date" },
            { key: "cargaHoraria", label: "Carga horária (h)",      type: "number" },
          ]}
          onSalvar={(lista) => salvarCampos({ treinamentos: lista })}
          salvando={salvando}
          renderItem={(item) => (
            <>
              <strong>{item.nome}</strong>
              {item.instituicao && <span style={{ color: "#64748b" }}> · {item.instituicao}</span>}
              <br />
              <small style={{ color: "#94a3b8" }}>
                {item.data && `Data: ${formatarData(item.data)}`}
                {item.cargaHoraria && ` · ${item.cargaHoraria}h`}
              </small>
            </>
          )}
        />
      )}

      {abaAtiva === "Ocorrências" && (
        <OcorrenciasTab ocorrencias={minhasOcorrencias} />
      )}

      {abaAtiva === "Avaliações" && (
        <ListaTab
          titulo="Avaliações"
          items={motorista.avaliacoes || []}
          campos={[
            { key: "data",       label: "Data",           type: "date" },
            { key: "nota",       label: "Nota (0–10)",    type: "number", min: 0, max: 10 },
            { key: "avaliador",  label: "Avaliador",      type: "text" },
            { key: "comentario", label: "Comentário",     type: "textarea" },
          ]}
          onSalvar={(lista) => salvarCampos({ avaliacoes: lista })}
          salvando={salvando}
          renderItem={(item) => {
            const nota = Number(item.nota);
            const cor  = nota >= 7 ? "#166534" : nota >= 5 ? "#854d0e" : "#991b1b";
            return (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "20px", fontWeight: "800", color: cor }}>{item.nota}/10</span>
                  {item.avaliador && <span style={{ color: "#64748b", fontSize: "13px" }}>por {item.avaliador}</span>}
                  {item.data && <span style={{ color: "#94a3b8", fontSize: "12px" }}>{formatarData(item.data)}</span>}
                </div>
                {item.comentario && (
                  <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#374151" }}>{item.comentario}</p>
                )}
              </>
            );
          }}
        />
      )}
    </div>
  );
}
