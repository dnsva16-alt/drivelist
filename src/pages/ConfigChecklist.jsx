import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../services/firebase";
import { useAuth } from "../contexts/AuthContext";

const ITENS_PADRAO = [
  "Pneus (calibragem e estado)", "Freios", "Luzes (farol, lanterna, seta)",
  "Óleo do motor", "Nível de água / arrefecimento", "Limpador de para-brisa",
  "Extintor de incêndio", "Documentação do veículo", "Cinto de segurança",
  "Espelhos retrovisores", "Carroceria / baú", "Tacógrafo",
];

export default function ConfigChecklist() {
  const { perfil } = useAuth();
  const [itens, setItens]       = useState([]);
  const [novoItem, setNovoItem] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo]       = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState(null); // index do item em edição

  useEffect(() => {
    if (!perfil?.empresaId) return;
    getDoc(doc(db, `empresas/${perfil.empresaId}/configuracoes/checklist`)).then((snap) => {
      setItens(snap.exists() && snap.data().itens?.length ? snap.data().itens : ITENS_PADRAO);
      setCarregando(false);
    });
  }, [perfil?.empresaId]);

  async function salvar() {
    setSalvando(true);
    await setDoc(doc(db, `empresas/${perfil.empresaId}/configuracoes/checklist`), {
      itens, atualizadoEm: serverTimestamp(),
    });
    setSalvando(false);
    setSalvo(true);
    setEditando(null);
    setTimeout(() => setSalvo(false), 2500);
  }

  function addItem() {
    const item = novoItem.trim();
    if (!item || itens.includes(item)) return;
    setItens([...itens, item]);
    setNovoItem("");
  }

  function removeItem(i) {
    setItens(itens.filter((_, idx) => idx !== i));
  }

  function mover(i, dir) {
    const nova = [...itens];
    const j = i + dir;
    if (j < 0 || j >= nova.length) return;
    [nova[i], nova[j]] = [nova[j], nova[i]];
    setItens(nova);
  }

  function editarItem(i, valor) {
    const nova = [...itens];
    nova[i] = valor;
    setItens(nova);
  }

  if (carregando) return <p style={{ color: "#94a3b8", padding: "16px" }}>Carregando...</p>;

  return (
    <div>
      <div className="page-header">
        <h1>Itens do Checklist</h1>
        <button className="btn-primary" onClick={salvar} disabled={salvando}>
          {salvo ? "✓ Salvo!" : salvando ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>

      <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "20px" }}>
        Personalize os itens que aparecem no checklist dos motoristas. As alterações são aplicadas na próxima vez que o motorista acessar o painel.
      </p>

      {/* Adicionar item */}
      <div className="form-card">
        <h2>Adicionar item</h2>
        <div style={{ display: "flex", gap: "10px" }}>
          <input
            placeholder="Ex: Nível de combustível"
            value={novoItem}
            onChange={(e) => setNovoItem(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addItem())}
            style={{ flex: 1, padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "14px", outline: "none" }}
          />
          <button className="btn-primary" type="button" onClick={addItem}>Adicionar</button>
        </div>
      </div>

      {/* Lista de itens */}
      <div className="form-card">
        <h2>Itens configurados ({itens.length})</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {itens.map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "10px 14px", background: "#f8fafc", borderRadius: "8px",
                border: editando === i ? "1px solid #0f172a" : "1px solid transparent",
              }}
            >
              {/* Ordem */}
              <span style={{ fontSize: "11px", color: "#94a3b8", width: "20px", flexShrink: 0 }}>{i + 1}</span>

              {/* Nome (editável) */}
              {editando === i ? (
                <input
                  autoFocus
                  value={item}
                  onChange={(e) => editarItem(i, e.target.value)}
                  onBlur={() => setEditando(null)}
                  onKeyDown={(e) => e.key === "Enter" && setEditando(null)}
                  style={{ flex: 1, background: "transparent", border: "none", fontSize: "14px", color: "#334155", outline: "none" }}
                />
              ) : (
                <span
                  onClick={() => setEditando(i)}
                  style={{ flex: 1, fontSize: "14px", color: "#334155", cursor: "text" }}
                  title="Clique para editar"
                >
                  {item}
                </span>
              )}

              {/* Mover */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                <button type="button" onClick={() => mover(i, -1)} title="Mover para cima"
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: "10px", color: i === 0 ? "#e2e8f0" : "#94a3b8", lineHeight: 1 }}>▲</button>
                <button type="button" onClick={() => mover(i, 1)} title="Mover para baixo"
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: "10px", color: i === itens.length - 1 ? "#e2e8f0" : "#94a3b8", lineHeight: 1 }}>▼</button>
              </div>

              <button className="btn-danger" onClick={() => removeItem(i)} style={{ padding: "4px 10px", fontSize: "12px" }}>
                Remover
              </button>
            </div>
          ))}
        </div>

        {itens.length === 0 && (
          <p style={{ color: "#94a3b8", fontSize: "14px", textAlign: "center", padding: "16px" }}>
            Nenhum item configurado.
          </p>
        )}

        <button
          type="button"
          className="btn-cancel"
          onClick={() => setItens(ITENS_PADRAO)}
          style={{ marginTop: "14px", fontSize: "12px" }}
        >
          Restaurar itens padrão
        </button>
      </div>
    </div>
  );
}
