export function calcularScoreConformidade(checklists) {
  if (!checklists || checklists.length === 0) return null;

  const limite = new Date();
  limite.setDate(limite.getDate() - 30);

  const recentes = checklists.filter((c) => new Date(c.data) >= limite);
  const lista = recentes.length > 0 ? recentes : checklists.slice(0, 10);

  const total = lista.reduce((acc, c) => {
    if (c.status === "OK") return acc + 100;
    if (c.status === "Atenção") return acc + 70;
    return acc + 30;
  }, 0);

  return Math.round(total / lista.length);
}

export function infoScore(score) {
  if (score === null) return { label: "Sem dados", cor: "#94a3b8", bg: "#f1f5f9" };
  if (score >= 80) return { label: "Excelente", cor: "#166534", bg: "#dcfce7" };
  if (score >= 60) return { label: "Regular", cor: "#854d0e", bg: "#fef9c3" };
  return { label: "Crítico", cor: "#991b1b", bg: "#fee2e2" };
}

// ─── Gamificação ────────────────────────────────────────────────────────────

export function calcularPontosMes(checklists) {
  const agora = new Date();
  const mes = agora.getMonth();
  const ano = agora.getFullYear();

  const doMes = checklists.filter((c) => {
    const d = new Date(c.data);
    return d.getMonth() === mes && d.getFullYear() === ano;
  });

  if (doMes.length === 0) return { pontos: 0, totalChecklists: 0 };

  let pontos = 0;
  let todosOK = true;

  doMes.forEach((c) => {
    if (c.status === "OK") pontos += 15;
    else if (c.status === "Atenção") { pontos += 8; todosOK = false; }
    else { pontos += 3; todosOK = false; }
  });

  if (doMes.length >= 5) pontos += 20;   // bônus consistência
  if (todosOK) pontos += 30;             // bônus mês perfeito

  return { pontos, totalChecklists: doMes.length };
}

export function calcularRanking(checklists) {
  const grupos = {};
  checklists.forEach((c) => {
    if (!c.motoristaId) return;
    if (!grupos[c.motoristaId]) grupos[c.motoristaId] = { nome: c.motorista || "—", lista: [] };
    grupos[c.motoristaId].lista.push(c);
  });

  return Object.entries(grupos)
    .map(([uid, { nome, lista }]) => ({
      uid, nome,
      ...calcularPontosMes(lista),
      score: calcularScoreConformidade(lista),
    }))
    .sort((a, b) => b.pontos - a.pontos);
}
