// FUNÇÃO DE SERVIDOR (Vercel). Roda no servidor, nunca no navegador.
// A chave da Tess vive em process.env.TESS_API_KEY e NUNCA é enviada ao cliente.
// O navegador só manda a transcrição e recebe a ata pronta.

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ erro: "Método não permitido" });

  const key = process.env.TESS_API_KEY;
  if (!key) return res.status(500).json({ erro: "TESS_API_KEY não configurada no servidor" });

  const { transcricao, participantes } = req.body || {};
  if (!transcricao || !transcricao.trim()) return res.status(400).json({ erro: "Transcrição vazia" });

  const mapa = (participantes || [])
    .map((p, i) => `Speaker ${i + 1} = ${p.nome}${p.empresa ? " (" + p.empresa + ")" : ""}${p.papel ? " - " + p.papel : ""}`)
    .join("; ");

  const prompt =
    "Use esta transcrição e gere uma ata executiva da reunião com resumo, decisões, próximos passos e produtos para a proposta. " +
    (mapa ? "Falantes: " + mapa + ". " : "") +
    "Responda em JSON com as chaves: resumo, decisoes[], proximos_passos[], produtos[], lead{empresa,contato,cargo,segmento,etapa,valor}.\n\nTranscrição:\n" +
    transcricao;

  try {
    // Fase 1c: confirmar contrato exato da Tess (chat/completions vs rodar o agente de ata por ID).
    const r = await fetch("https://api.tess.im/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: prompt }] }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(502).json({ erro: "Falha ao chamar a Tess", detalhe: data });
    return res.status(200).json({ resultado: data });
  } catch (e) {
    return res.status(502).json({ erro: "Erro de rede ao chamar a Tess", detalhe: String(e) });
  }
}
