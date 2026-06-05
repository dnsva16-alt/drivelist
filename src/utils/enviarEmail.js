import emailjs from "@emailjs/browser";

// Configure em .env.local:
// VITE_EMAILJS_PUBLIC_KEY=sua_chave_publica
// VITE_EMAILJS_SERVICE_ID=seu_service_id
// VITE_EMAILJS_TEMPLATE_ID=seu_template_id
//
// Template EmailJS esperado (variáveis):
// {{admin_email}}, {{motorista}}, {{placa}}, {{data}}, {{status}}, {{pdf_url}}, {{empresa}}

export async function enviarEmailChecklist({ adminEmail, motorista, placa, data, status, pdfUrl, empresa }) {
  const publicKey  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
  const serviceId  = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;

  if (!publicKey || !serviceId || !templateId) {
    console.warn("EmailJS não configurado. Configure .env.local para enviar e-mails.");
    return { ok: false, motivo: "sem_config" };
  }

  await emailjs.send(
    serviceId,
    templateId,
    { admin_email: adminEmail, motorista, placa, data, status, pdf_url: pdfUrl, empresa },
    publicKey
  );

  return { ok: true };
}
