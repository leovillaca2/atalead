// FUNÇÃO DE SERVIDOR. Ações de ESCRITA num negocio do Pipedrive. Exige login.
// Respeita o MODO SEGURO (PIPEDRIVE_SAFE_MODE != "false" nao grava).
// POST { action: "nota"|"label", dealId, ... }
//   nota:  { conteudo }
//   label: { labelId }   (id da opcao do campo Label; null/"" limpa)
import { exigirLogin } from "../server/google.js";

const BASE = "https://api.pipedrive.com/v1";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ erro: "Método não permitido" });
  if (!(await exigirLogin(req))) return res.status(401).json({ erro: "não autenticado" });
  const token = process.env.PIPEDRIVE_API_TOKEN;
  if (!token) return res.status(500).json({ erro: "PIPEDRIVE_API_TOKEN não configurado" });

  const { action, dealId } = req.body || {};
  if (!dealId) return res.status(400).json({ erro: "Informe o negócio" });

  const safeMode = process.env.PIPEDRIVE_SAFE_MODE !== "false";
  const q = `api_token=${encodeURIComponent(token)}`;
  const jpost = (url, body) => fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const jput = (url, body) => fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  try {
    if (action === "nota") {
      const conteudo = (req.body.conteudo || "").trim();
      if (!conteudo) return res.status(400).json({ erro: "Nota vazia" });
      if (safeMode) return res.status(200).json({ ok: true, simulado: true });
      const r = await (await jpost(`${BASE}/notes?${q}`, { deal_id: Number(dealId), content: conteudo.replace(/\n/g, "<br>") })).json();
      if (!r.success) return res.status(502).json({ erro: "Falha ao criar a nota", detalhe: r });
      return res.status(200).json({ ok: true, id: r.data && r.data.id });
    }

    if (action === "label") {
      const { labelId } = req.body;
      if (safeMode) return res.status(200).json({ ok: true, simulado: true });
      const valor = labelId === null || labelId === "" || labelId === undefined ? null : Number(labelId);
      const r = await (await jput(`${BASE}/deals/${dealId}?${q}`, { label: valor })).json();
      if (!r.success) return res.status(502).json({ erro: "Falha ao mudar a temperatura", detalhe: r });
      return res.status(200).json({ ok: true, label: r.data && r.data.label, update_time: r.data && r.data.update_time });
    }

    return res.status(400).json({ erro: "ação inválida" });
  } catch (e) {
    return res.status(502).json({ erro: "Erro de rede ao chamar o Pipedrive", detalhe: String(e) });
  }
}
