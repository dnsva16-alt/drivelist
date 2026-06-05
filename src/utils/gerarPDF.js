import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export async function gerarChecklistPDF({ placa, motorista, data, itens, fotos, assinatura, nomeEmpresa }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const L = 14; // margem esquerda

  // ── Cabeçalho ──────────────────────────────────────────────
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("DRIVELIST", L, 14);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Checklist de Veículo", L, 22);
  if (nomeEmpresa) {
    doc.setFontSize(9);
    doc.text(nomeEmpresa, 196, 22, { align: "right" });
  }

  // ── Informações ─────────────────────────────────────────────
  doc.setTextColor(0);
  let y = 44;
  const campos = [["Data", data], ["Placa", placa], ["Motorista", motorista]];
  campos.forEach(([label, val]) => {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, L, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(val || "—"), L + 26, y);
    y += 7;
  });

  // ── Tabela de itens ─────────────────────────────────────────
  const CORES = { OK: [220, 252, 231], "Atenção": [254, 249, 195], "Crítico": [254, 226, 226] };

  autoTable(doc, {
    startY: y + 4,
    head: [["Item de Verificação", "Status", "Fotos"]],
    body: Object.entries(itens).map(([item, status]) => [
      item,
      status,
      fotos[item]?.length > 0 ? `${fotos[item].length} foto(s)` : "—",
    ]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: "bold" },
    columnStyles: {
      1: { cellWidth: 28, fontStyle: "bold", halign: "center" },
      2: { cellWidth: 22, halign: "center" },
    },
    willDrawCell(data) {
      if (data.section === "body" && data.column.index === 1) {
        const cor = CORES[data.cell.raw];
        if (cor) doc.setFillColor(...cor);
      }
    },
  });

  y = doc.lastAutoTable.finalY + 10;

  // ── Fotos por item ──────────────────────────────────────────
  const itensComFotos = Object.entries(fotos).filter(([, imgs]) => imgs?.length > 0);

  if (itensComFotos.length > 0) {
    if (y + 20 > 265) { doc.addPage(); y = 20; }
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Fotos dos Itens", L, y);
    y += 8;

    for (const [item, imgs] of itensComFotos) {
      if (y + 70 > 265) { doc.addPage(); y = 20; }
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(item, L, y);
      y += 4;

      let x = L;
      for (const img of imgs.slice(0, 3)) {
        if (x + 58 > 196) { x = L; y += 52; }
        if (y + 50 > 270) { doc.addPage(); y = 20; x = L; }
        try { doc.addImage(img, "JPEG", x, y, 55, 45); } catch { /* imagem inválida */ }
        x += 60;
      }
      y += 52;
    }
  }

  // ── Assinatura ──────────────────────────────────────────────
  if (assinatura) {
    if (y + 55 > 270) { doc.addPage(); y = 20; }
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Assinatura do Motorista", L, y);
    y += 4;
    doc.setDrawColor(200);
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(L, y, 125, 40, 2, 2, "FD");
    try { doc.addImage(assinatura, "PNG", L + 2, y + 2, 121, 36); } catch { /* */ }
    y += 44;
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`${motorista}  —  ${data}`, L, y);
    doc.setTextColor(0);
  }

  // ── Rodapé em todas as páginas ──────────────────────────────
  const total = doc.internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(160);
    doc.text(
      `DRIVELIST — Gerado em ${new Date().toLocaleString("pt-BR")}   |   Página ${i}/${total}`,
      105,
      292,
      { align: "center" }
    );
  }

  return doc;
}
