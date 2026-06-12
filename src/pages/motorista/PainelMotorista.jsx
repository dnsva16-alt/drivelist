import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { useColecao } from "../../hooks/useColecao";
import { db } from "../../services/firebase";
import { gerarChecklistPDF } from "../../utils/gerarPDF";
import { redimensionarImagem } from "../../utils/redimensionarImagem";
import { enviarEmailChecklist } from "../../utils/enviarEmail";
import AssinaturaPad from "../../components/AssinaturaPad";
import { calcularScoreConformidade, infoScore, calcularPontosMes, calcularRanking } from "../../utils/calcularScore";

const ITENS_PADRAO = [
  "Pneus (calibragem e estado)", "Freios", "Luzes (farol, lanterna, seta)",
  "Óleo do motor", "Nível de água / arrefecimento", "Limpador de para-brisa",
  "Extintor de incêndio", "Documentação do veículo", "Cinto de segurança",
  "Espelhos retrovisores", "Carroceria / baú", "Tacógrafo",
];

const CORES = {
  OK:       { bg: "#dcfce7", cor: "#166534" },
  "Atenção":  { bg: "#fef9c3", cor: "#854d0e" },
  "Crítico":  { bg: "#fee2e2", cor: "#991b1b" },
};

export default function PainelMotorista() {
  const { usuario, perfil, sair } = useAuth();
  const { adicionar } = useColecao("checklists", perfil?.empresaId);
  const { dados: checklists } = useColecao("checklists", perfil?.empresaId);
  const navigate = useNavigate();

  const [avisoVisivel, setAvisoVisivel] = useState(
    () => !sessionStorage.getItem("aviso_checklist_visto")
  );
  const [avisoConfirmado, setAvisoConfirmado] = useState(false);

  function fecharAviso() {
    sessionStorage.setItem("aviso_checklist_visto", "1");
    setAvisoVisivel(false);
  }

  const { meuScore, meusPontos, minhaPos } = useMemo(() => {
    const meus = checklists.filter((c) => c.motoristaId === usuario?.uid);
    const ranking = calcularRanking(checklists);
    const pos = ranking.findIndex((r) => r.uid === usuario?.uid);
    return {
      meuScore: calcularScoreConformidade(meus),
      meusPontos: calcularPontosMes(meus).pontos,
      minhaPos: pos >= 0 ? pos + 1 : null,
    };
  }, [checklists, usuario?.uid]);
  const assinaturaRef = useRef(null);

  const [itensList, setItensList]   = useState(ITENS_PADRAO);
  const [placa, setPlaca]           = useState("");
  const [quilometragem, setQuilometragem] = useState("");
  const [itens, setItens]           = useState({});
  const [fotos, setFotos]           = useState({});
  const [observacoes, setObservacoes] = useState("");
  const [enviando, setEnviando]     = useState(false);
  const [resultado, setResultado]   = useState(null); // { pdfUrl, erro }

  // Busca itens personalizados da empresa
  useEffect(() => {
    if (!perfil?.empresaId) return;
    getDoc(doc(db, `empresas/${perfil.empresaId}/configuracoes/checklist`)).then((snap) => {
      const lista = snap.exists() && snap.data().itens?.length > 0
        ? snap.data().itens
        : ITENS_PADRAO;
      setItensList(lista);
      setItens(Object.fromEntries(lista.map((i) => [i, "OK"])));
    });
  }, [perfil?.empresaId]);

  function marcaItem(item, valor) {
    setItens((prev) => ({ ...prev, [item]: valor }));
  }

  async function handleFotos(item, files) {
    const imgs = await Promise.all(Array.from(files).map((f) => redimensionarImagem(f)));
    setFotos((prev) => ({ ...prev, [item]: [...(prev[item] || []), ...imgs].slice(0, 3) }));
  }

  function removeFoto(item, idx) {
    setFotos((prev) => {
      const nova = [...(prev[item] || [])];
      nova.splice(idx, 1);
      return { ...prev, [item]: nova };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!placa.trim()) { alert("Informe a placa do veículo."); return; }
    if (assinaturaRef.current?.isEmpty()) { alert("Assine o checklist antes de enviar."); return; }

    const criticosSemFoto = itensList.filter(
      (item) => itens[item] === "Crítico" && (!fotos[item] || fotos[item].length === 0)
    );
    if (criticosSemFoto.length > 0) {
      alert(`Foto obrigatória para itens críticos:\n• ${criticosSemFoto.join("\n• ")}`);
      return;
    }

    setEnviando(true);
    try {
      const assinatura   = assinaturaRef.current.getDataURL();
      const statusGeral  = Object.values(itens).includes("Crítico")
        ? "Crítico" : Object.values(itens).includes("Atenção") ? "Atenção" : "OK";
      const problemas    = Object.entries(itens)
        .filter(([, v]) => v !== "OK").map(([k]) => k).join(", ") || "Todos OK";
      const data         = new Date().toISOString().split("T")[0];

      // Busca e-mail do admin
      const empresaSnap  = await getDoc(doc(db, "empresas", perfil.empresaId));
      const adminEmail   = empresaSnap.data()?.email || "";
      const nomeEmpresa  = empresaSnap.data()?.nomeEmpresa || "";

      // Gera PDF
      const pdfDoc = await gerarChecklistPDF({
        placa, quilometragem, motorista: perfil?.nome || usuario.email,
        data, itens, fotos, assinatura, nomeEmpresa,
      });
      const pdfBlob = pdfDoc.output("blob");

      // Download automático do PDF
      const blobUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href  = blobUrl;
      link.download = `checklist_${placa}_${data}.pdf`;
      link.click();

      // Salva no Firestore (sem pdfUrl)
      const checklistId = `${Date.now()}_${placa}`;
      await setDoc(doc(db, `empresas/${perfil.empresaId}/checklists/${checklistId}`), {
        placa, quilometragem: quilometragem || null,
        motorista: perfil?.nome || usuario.email,
        motoristaId: usuario.uid, data,
        itens: JSON.stringify(itens),
        itensResumo: problemas, observacoes, status: statusGeral,
        criadoEm: serverTimestamp(),
      });

      // Envia e-mail para o admin
      await enviarEmailChecklist({
        adminEmail, motorista: perfil?.nome || usuario.email,
        placa, data, status: statusGeral, empresa: nomeEmpresa,
      });

      setResultado({ blobUrl });
      setPlaca("");
      setQuilometragem("");
      setItens(Object.fromEntries(itensList.map((i) => [i, "OK"])));
      setFotos({});
      setObservacoes("");
      assinaturaRef.current?.limpar();
    } catch (err) {
      console.error(err);
      setResultado({ erro: "Erro ao enviar o checklist. Verifique sua conexão e tente novamente." });
    } finally {
      setEnviando(false);
    }
  }

  async function handleSair() {
    await sair();
    navigate("/motorista/login");
  }

  if (resultado) {
    return (
      <div style={{ minHeight: "100vh", background: "#f5f7fa" }}>
        <header className="motorista-header">
          <div className="motorista-header-logo">
            <img src="/logo.png" alt="DriveList" className="header-logo-img" />
          </div>
        </header>
        <div className="motorista-content" style={{ textAlign: "center", paddingTop: "60px" }}>
          {resultado.erro ? (
            <>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>❌</div>
              <h2 style={{ color: "#ef4444", marginBottom: "8px" }}>Erro ao enviar</h2>
              <p style={{ color: "#64748b", marginBottom: "24px" }}>{resultado.erro}</p>
              <button className="btn-primary" onClick={() => setResultado(null)}>Tentar novamente</button>
            </>
          ) : (
            <>
              <div style={{ fontSize: "56px", marginBottom: "16px" }}>✅</div>
              <h2 style={{ color: "#166534", fontSize: "22px", marginBottom: "8px" }}>Checklist enviado!</h2>
              <p style={{ color: "#64748b", marginBottom: "8px" }}>
                O arquivo PDF foi gerado e baixado automaticamente.
              </p>
              <p style={{ color: "#64748b", marginBottom: "28px", fontSize: "14px" }}>
                O administrador foi notificado por e-mail com o link do relatório.
              </p>
              <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
                <a href={resultado.blobUrl} target="_blank" rel="noreferrer" className="btn-primary">
                  Abrir PDF
                </a>
                <button className="btn-cancel" onClick={() => setResultado(null)}>
                  Novo checklist
                </button>
                <button className="btn-sair" onClick={handleSair} style={{ width: "auto", padding: "10px 18px" }}>
                  Sair
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f7fa" }}>
      {avisoVisivel && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,0.55)", display: "flex",
          alignItems: "center", justifyContent: "center", padding: "24px",
        }}>
          <div style={{
            background: "#fff", borderRadius: "16px", padding: "32px 28px",
            maxWidth: "420px", width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            textAlign: "center",
          }}>
            <div style={{ fontSize: "52px", marginBottom: "12px" }}>⚠️</div>
            <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a", marginBottom: "12px" }}>
              Checklist Obrigatório
            </h2>
            <p style={{ fontSize: "15px", color: "#374151", lineHeight: "1.6", marginBottom: "8px" }}>
              O preenchimento do checklist veicular é <strong>obrigatório</strong> antes de qualquer saída com o veículo.
            </p>
            <p style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.6", marginBottom: "20px" }}>
              Esta é uma exigência de segurança e prevenção de riscos. O não preenchimento pode resultar em advertência ou outras medidas disciplinares.
            </p>
            <label style={{
              display: "flex", alignItems: "flex-start", gap: "10px",
              background: "#f8fafc", border: "1px solid #e2e8f0",
              borderRadius: "10px", padding: "12px 14px", marginBottom: "20px",
              cursor: "pointer", textAlign: "left",
            }}>
              <input
                type="checkbox"
                checked={avisoConfirmado}
                onChange={(e) => setAvisoConfirmado(e.target.checked)}
                style={{ marginTop: "2px", width: "17px", height: "17px", accentColor: "#1d4ed8", flexShrink: 0 }}
              />
              <span style={{ fontSize: "13px", color: "#374151", lineHeight: "1.5" }}>
                Li e estou ciente da obrigatoriedade do checklist antes de qualquer saída com o veículo.
              </span>
            </label>
            <button
              onClick={fecharAviso}
              disabled={!avisoConfirmado}
              className="btn-primary"
              style={{
                width: "100%", padding: "13px", fontSize: "15px", fontWeight: "700",
                opacity: avisoConfirmado ? 1 : 0.45, cursor: avisoConfirmado ? "pointer" : "not-allowed",
              }}
            >
              Entendido — Iniciar Checklist
            </button>
          </div>
        </div>
      )}

      <header className="motorista-header">
        <div className="motorista-header-logo">
          <img src="/logo.png" alt="DriveList" className="header-logo-img" />
        </div>
        <div className="motorista-header-info">
          <span className="motorista-nome">{perfil?.nome || usuario?.email}</span>
          <button
            onClick={() => navigate("/motorista/perfil")}
            style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "6px 12px", fontSize: "13px", color: "#374151", cursor: "pointer" }}
          >
            Meu Perfil
          </button>
          <button className="btn-sair" onClick={handleSair}>Sair</button>
        </div>
      </header>

      <div className="motorista-content">
        {(() => {
          const { label, cor, bg } = infoScore(meuScore);
          const medalha = minhaPos === 1 ? "🥇" : minhaPos === 2 ? "🥈" : minhaPos === 3 ? "🥉" : null;
          return (
            <div style={{ background: bg, border: `1px solid ${cor}33`, borderRadius: "14px", padding: "16px 20px", marginBottom: "20px" }}>
              <p style={{ margin: "0 0 12px", fontSize: "11px", color: cor, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.6px" }}>Seu Desempenho este Mês</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                <div style={{ textAlign: "center" }}>
                  <p style={{ margin: 0, fontSize: "26px", fontWeight: "800", color: cor }}>{meuScore !== null ? `${meuScore}%` : "—"}</p>
                  <p style={{ margin: "2px 0 0", fontSize: "11px", color: cor, fontWeight: "600" }}>Conformidade</p>
                  <p style={{ margin: "1px 0 0", fontSize: "11px", color: "#64748b" }}>{label}</p>
                </div>
                <div style={{ width: "1px", height: "48px", background: `${cor}33` }} />
                <div style={{ textAlign: "center" }}>
                  <p style={{ margin: 0, fontSize: "26px", fontWeight: "800", color: "#7c3aed" }}>{meusPontos}</p>
                  <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#7c3aed", fontWeight: "600" }}>Pontos</p>
                </div>
                <div style={{ width: "1px", height: "48px", background: `${cor}33` }} />
                <div style={{ textAlign: "center" }}>
                  <p style={{ margin: 0, fontSize: "26px", fontWeight: "800", color: "#0f172a" }}>
                    {minhaPos ? `${medalha ?? ""}#${minhaPos}` : "—"}
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#64748b", fontWeight: "600" }}>Ranking</p>
                </div>
              </div>
            </div>
          );
        })()}

        <div className="motorista-titulo-bloco">
          <h1>Checklist do Veículo</h1>
          <p>Preencha todos os campos, adicione fotos se necessário e assine ao final.</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Placa */}
          <div className="form-card">
            <h2>Veículo</h2>
            <div className="placa-input-wrapper">
              <input
                className="placa-input"
                placeholder="PLACA DO VEÍCULO"
                value={placa}
                onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                maxLength={8}
                required
              />
              <span className="placa-hint">Ex: ABC-1234 ou ABC1D23</span>
            </div>
            <div style={{ marginTop: "16px" }}>
              <label style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Quilometragem inicial
              </label>
              <input
                type="number"
                placeholder="Ex: 125430"
                value={quilometragem}
                onChange={(e) => setQuilometragem(e.target.value)}
                min={0}
                style={{ width: "100%", padding: "12px 14px", border: "1px solid #e2e8f0", borderRadius: "10px", fontSize: "15px" }}
              />
            </div>
          </div>

          {/* Itens */}
          <div className="form-card">
            <h2>Itens de Verificação</h2>
            <div className="checklist-lista">
              {itensList.map((item) => {
                const valor     = itens[item] || "OK";
                const fotosItem = fotos[item] || [];
                const fotoObrig = valor === "Crítico" && fotosItem.length === 0;
                return (
                  <div key={item} className="checklist-item-bloco" style={fotoObrig ? { border: "1.5px solid #fca5a5", borderRadius: "10px", padding: "6px 8px", background: "#fff5f5" } : {}}>
                    <div className="checklist-item">
                      <span className="checklist-item-nome">{item}</span>
                      <div className="checklist-botoes">
                        {["OK", "Atenção", "Crítico"].map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => marcaItem(item, v)}
                            className="checklist-btn"
                            style={{
                              background: valor === v ? CORES[v].bg : "#e2e8f0",
                              color:      valor === v ? CORES[v].cor : "#94a3b8",
                              fontWeight: valor === v ? "700" : "500",
                            }}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Fotos */}
                    <div className="checklist-fotos">
                      {fotosItem.map((src, i) => (
                        <div key={i} className="foto-preview">
                          <img src={src} alt={`foto ${i + 1}`} />
                          <button type="button" onClick={() => removeFoto(item, i)} className="foto-remover">✕</button>
                        </div>
                      ))}
                      {fotosItem.length < 3 && (
                        <label className="foto-add" style={fotoObrig ? { border: "1.5px solid #ef4444", background: "#fff1f2" } : {}}>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            multiple
                            style={{ display: "none" }}
                            onChange={(e) => handleFotos(item, e.target.files)}
                          />
                          <span>📷</span>
                          <span style={{ fontSize: "10px", color: fotoObrig ? "#ef4444" : undefined, fontWeight: fotoObrig ? "700" : undefined }}>
                            {fotoObrig ? "Obrigatória" : "Foto"}
                          </span>
                        </label>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Observações */}
          <div className="form-card">
            <h2>Observações</h2>
            <textarea
              placeholder="Observações adicionais (opcional)..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
              style={{ width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "14px", resize: "vertical" }}
            />
          </div>

          {/* Assinatura */}
          <div className="form-card">
            <h2>Assinatura do Motorista</h2>
            <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "12px" }}>
              Assine abaixo para confirmar que o checklist foi realizado corretamente.
            </p>
            <AssinaturaPad ref={assinaturaRef} />
          </div>

          <button
            className="btn-primary"
            type="submit"
            disabled={enviando}
            style={{ width: "100%", padding: "15px", fontSize: "16px", marginBottom: "32px" }}
          >
            {enviando ? "Gerando PDF e enviando..." : "Enviar Checklist e Gerar PDF"}
          </button>
        </form>
      </div>
    </div>
  );
}
