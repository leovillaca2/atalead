// FUNÇÃO DE SERVIDOR. Adiciona uma nota a um negocio no Pipedrive (ESCRITA). Exige login.
// Respeita o MODO SEGURO: se PIPEDRIVE_SAFE_MODE != "false", nao grava.
import { exigirLogin } from "../server/google.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ erro: "Método não permitido" });
  if (!(await exigirLogin(req))) return res.status(401).json({ erro: "não autenticado" });
  const token = process.env.PIPEDRIVE_API_TOKEN;
  if (!token) return res.status(500).json({ erro: "PIPEDRIVE_API_TOKEN não configurado" });

  const { dealId, conteudo } = req.body || {};
  if (!dealId || !conteudo || !conteudo.trim()) return res.status(400).json({ erro: "Informe o negócio e o conteúdo da nota" });

  const safeMode = process.env.PIPEDRIVE_SAFE_MODE !== "false";
  if (safeMode) return res.status(200).json({ ok: true, simulado: true });

  const q = `api_token=${encodeURIComponent(token)}`;
  const content = conteudo.trim().replace(/\n/g, "<br>"); // preserva quebras de linha no Pipedrive
  try {
    const r = await fetch(`https://api.pipedrive.com/v1/notes?${q}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deal_id: Number(dealId), content }),
    });
    const data = await r.json().catch(() => ({}));
    if (!data.success) return res.status(502).json({ erro: "Falha ao criar a nota", detalhe: data });
    return res.status(200).json({ ok: true, id: data.data && data.data.id });
  } catch (e) {
    return res.status(502).json({ erro: "Erro de rede ao chamar o Pipedrive", detalhe: String(e) });
  }
}
