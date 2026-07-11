// FUNÇÃO DE SERVIDOR (Vercel). Roda no servidor, nunca no navegador.
// A chave da Tess vive em process.env.TESS_API_KEY e NUNCA é enviada ao cliente.
// Base da API confirmada: https://tess.pareto.io/api (auth Bearer).

const TESS_BASE = "https://tess.pareto.io/api";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ erro: "Método não permitido" });

  const key = process.env.TESS_API_KEY;
  if (!key) return res.status(500).json({ erro: "TESS_API_KEY não configurada no servidor" });

  const agentId = process.env.TESS_AGENT_ID;
  if (!agentId) {
    return res.status(503).json({
      erro: "TESS_AGENT_ID não configurado. Defina o agente de ata do Tess para gerar a ata.",
    });
  }

  const { transcricao, participantes } = req.body || {};
  if (!transcricao || !transcricao.trim()) return res.status(400).json({ erro: "Transcrição vazia" });

  const mapa = (participantes || [])
    .map((p, i) => `Speaker ${i + 1} = ${p.nome}${p.empresa ? " (" + p.empresa + ")" : ""}${p.papel ? " - " + p.papel : ""}`)
    .join("; ");

  const prompt =
    "Use esta transcrição e gere uma ata executiva da reunião. " +
    (mapa ? "Falantes: " + mapa + ". " : "") +
    "Responda em JSON com as chaves: resumo (texto), decisoes (lista), proximos_passos (lista de {titulo, responsavel, prazo}), produtos (lista) e lead ({empresa, contato, cargo, segmento, etapa, valor}).\n\nTranscrição:\n" +
    transcricao;

  const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json", Accept: "application/json" };

  try {
    // Executa o agente de forma síncrona (waitExecution).
    const exec = await fetch(`${TESS_BASE}/agents/${agentId}/execute`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        temperature: "0",
        model: "tess-ai-light",
        messages: [{ role: "user", content: prompt }],
        tools: "no-tools",
        waitExecution: true,
      }),
    });
    const data = await exec.json().catch(() => ({}));
    if (!exec.ok) return res.status(502).json({ erro: "Falha ao executar o agente da Tess", detalhe: data });

    // A saída costuma vir em data.responses[0].output. Devolvemos cru + o texto extraído.
    const output = data?.responses?.[0]?.output ?? data?.output ?? null;
    return res.status(200).json({ output, bruto: data });
  } catch (e) {
    return res.status(502).json({ erro: "Erro de rede ao chamar a Tess", detalhe: String(e) });
  }
}
