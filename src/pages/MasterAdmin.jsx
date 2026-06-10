import { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, updateDoc, orderBy } from "firebase/firestore";
import { db } from "../services/firebase";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function MasterAdmin() {
  const { sair } = useAuth();
  const navigate = useNavigate();
  const [pendentes, setPendentes] = useState([]);
  const [ativas, setAtivas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState(null);

  async function carregar() {
    setCarregando(true);
    const snap = await getDocs(query(collection(db, "empresas"), orderBy("criadoEm", "desc")));
    const todas = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setPendentes(todas.filter((e) => e.status === "pendente"));
    setAtivas(todas.filter((e) => e.status !== "pendente"));
    setCarregando(false);
  }

  useEffect(() => { carregar(); }, []);

  async function aprovar(empresaId) {
    setProcessando(empresaId);
    await updateDoc(doc(db, "empresas", empresaId), { status: "ativo" });
    await updateDoc(doc(db, "usuarios", empresaId), { status: "ativo" });
    await carregar();
    setProcessando(null);
  }

  async function rejeitar(empresaId) {
    if (!confirm("Rejeitar e remover este cadastro?")) return;
    setProcessando(empresaId);
    await updateDoc(doc(db, "empresas", empresaId), { status: "rejeitado" });
    await updateDoc(doc(db, "usuarios", empresaId), { status: "rejeitado" });
    await carregar();
    setProcessando(null);
  }

  async function handleSair() {
    await sair();
    navigate("/admin/login");
  }

  function formatarData(ts) {
    if (!ts) return "—";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f7fa" }}>
      <div style={{ background: "#0f172a", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <img src="/logo.png" alt="DriveList" style={{ height: "36px", background: "white", borderRadius: "8px", padding: "4px 10px" }} />
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ color: "#94a3b8", fontSize: "13px" }}>Painel Master</span>
          <button className="btn-sair" onClick={handleSair} style={{ width: "auto", padding: "6px 14px" }}>Sair</button>
        </div>
      </div>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 24px" }}>

        {/* Pendentes */}
        <div className="section" style={{ marginBottom: "24px" }}>
          <h2 style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            ⏳ Aguardando aprovação
            {pendentes.length > 0 && (
              <span style={{ background: "#ef4444", color: "white", borderRadius: "999px", fontSize: "12px", padding: "2px 8px" }}>
                {pendentes.length}
              </span>
            )}
          </h2>

          {carregando ? (
            <p style={{ color: "#94a3b8" }}>Carregando...</p>
          ) : pendentes.length === 0 ? (
            <p style={{ color: "#94a3b8", fontSize: "14px" }}>Nenhum cadastro pendente.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>E-mail</th>
                  <th>Cadastro</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {pendentes.map((e) => (
                  <tr key={e.id}>
                    <td style={{ fontWeight: 600 }}>{e.nomeEmpresa}</td>
                    <td>{e.email}</td>
                    <td>{formatarData(e.criadoEm)}</td>
                    <td>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          className="btn-primary"
                          style={{ padding: "5px 12px", fontSize: "12px" }}
                          disabled={processando === e.id}
                          onClick={() => aprovar(e.id)}
                        >
                          {processando === e.id ? "..." : "Aprovar"}
                        </button>
                        <button
                          className="btn-danger"
                          disabled={processando === e.id}
                          onClick={() => rejeitar(e.id)}
                        >
                          Rejeitar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Ativas */}
        <div className="section">
          <h2 style={{ marginBottom: "16px" }}>✅ Empresas ativas</h2>
          {carregando ? (
            <p style={{ color: "#94a3b8" }}>Carregando...</p>
          ) : ativas.length === 0 ? (
            <p style={{ color: "#94a3b8", fontSize: "14px" }}>Nenhuma empresa ativa.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>E-mail</th>
                  <th>Status</th>
                  <th>Cadastro</th>
                </tr>
              </thead>
              <tbody>
                {ativas.map((e) => (
                  <tr key={e.id}>
                    <td style={{ fontWeight: 600 }}>{e.nomeEmpresa}</td>
                    <td>{e.email}</td>
                    <td>
                      <span className={`badge ${e.status === "rejeitado" ? "badge-red" : "badge-green"}`}>
                        {e.status === "rejeitado" ? "Rejeitado" : "Ativo"}
                      </span>
                    </td>
                    <td>{formatarData(e.criadoEm)}</td>
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
