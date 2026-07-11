// FUNÇÃO DE SERVIDOR (Vercel). Roda no servidor, nunca no navegador.
// A chave da Tess vive em process.env.TESS_API_KEY e NUNCA é enviada ao cliente.
// Base confirmada: https://tess.pareto.io/api. Motor: agente OpenAI (GPT) da Tess.
// Execução síncrona: POST /agents/{id}/execute com o campo "prompt" e waitExecution=true.

const TESS_BASE = "https://tess.pareto.io/api";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ erro: "Método não permitido" });

  const key = process.env.TESS_API_KEY;
  if (!key) return res.status(500).json({ erro: "TESS_API_KEY não configurada no servidor" });

  const agentId = process.env.TESS_AGENT_ID || "2910"; // motor GPT genérico da Tess
  const model = process.env.TESS_MODEL || "gpt-4o-mini";

  const { transcricao, participantes } = req.body || {};
  if (!transcricao || !transcricao.trim()) return res.status(400).json({ erro: "Transcrição vazia" });

  const mapa = (participantes || [])
    .filter((p) => p && p.nome)
    .map((p, i) => `Speaker ${i + 1} = ${p.nome}${p.empresa ? " (" + p.empresa + ")" : ""}${p.papel ? " - " + p.papel : ""}`)
    .join("; ");

  const prompt = [
    "Você é um assistente que transforma transcrições de reuniões de prospecção em ata executiva.",
    mapa ? "Mapa de falantes: " + mapa + "." : "",
    "Gere a ata a partir da transcrição abaixo e responda APENAS com um JSON válido (sem texto fora do JSON, sem ```), no formato:",
    '{"resumo": "texto corrido objetivo", "decisoes": ["..."], "proximos_passos": [{"titulo": "...", "responsavel": "...", "prazo": "..."}], "produtos": ["..."], "lead": {"empresa": "...", "contato": "...", "cargo": "...", "segmento": "...", "etapa": "...", "valor": "..."}}',
    "Regras: seja fiel à transcrição, não invente dados; se um campo não aparecer, deixe string vazia. Escreva em português do Brasil, sem travessões.",
    "",
    "Transcrição:",
    transcricao,
  ].filter(Boolean).join("\n");

  try {
    const exec = await fetch(`${TESS_BASE}/agents/${agentId}/execute`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ prompt, model, temperature: "0.2", tools: "no-tools", waitExecution: true }),
    });
    const data = await exec.json().catch(() => ({}));
    if (!exec.ok) return res.status(502).json({ erro: "Falha ao executar a Tess", detalhe: data });

    const resposta = data?.responses?.[0];
    const output = resposta?.output ?? "";
    if (resposta?.status && resposta.status !== "succeeded") {
      return res.status(502).json({ erro: "Execução da Tess não concluída", status: resposta.status, detalhe: data });
    }

    // Tenta interpretar a saída como JSON (removendo cercas de código se houver).
    let ata = null;
    try {
      const limpo = output.replace(/^```(json)?/i, "").replace(/```$/, "").trim();
      ata = JSON.parse(limpo);
    } catch {
      ata = null;
    }

    return res.status(200).json({ ata, output, creditos: resposta?.credits });
  } catch (e) {
    return res.status(502).json({ erro: "Erro de rede ao chamar a Tess", detalhe: String(e) });
  }
}
