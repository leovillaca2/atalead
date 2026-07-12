// FUNÇÃO DE SERVIDOR. Ações de ESCRITA num negocio do Pipedrive. Exige login.
// MODO SEGURO só se PIPEDRIVE_SAFE_MODE === "true" (escrita ligada por padrao).
// POST { action, dealId, ... }
//   nota:            { conteudo }
//   label:           { labelId }   (id da opcao do campo Label; null/"" limpa)
//   atividade-feita: { activityId, feito }
//   atividade-nova:  { assunto, vencimento }  (vencimento YYYY-MM-DD, opcional)
import { exigirLogin } from "../server/google.js";

const BASE = "https://api.pipedrive.com/v1";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ erro: "Método não permitido" });
  if (!(await exigirLogin(req))) return res.status(401).json({ erro: "não autenticado" });
  const token = process.env.PIPEDRIVE_API_TOKEN;
  if (!token) return res.status(500).json({ erro: "PIPEDRIVE_API_TOKEN não configurado" });

  const { action, dealId } = req.body || {};
  if (!dealId) return res.status(400).json({ erro: "Informe o negócio" });

  const safeMode = process.env.PIPEDRIVE_SAFE_MODE === "true"; // escrita ligada por padrao
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

    if (action === "atividade-feita") {
      const { activityId, feito } = req.body;
      if (!activityId) return res.status(400).json({ erro: "Informe a atividade" });
      if (safeMode) return res.status(200).json({ ok: true, simulado: true });
      const r = await (await jput(`${BASE}/activities/${activityId}?${q}`, { done: feito ? 1 : 0 })).json();
      if (!r.success) return res.status(502).json({ erro: "Falha ao atualizar a atividade", detalhe: r });
      return res.status(200).json({ ok: true });
    }

    if (action === "atividade-nova") {
      const assunto = (req.body.assunto || "").trim();
      const { tipo, data, hora, duracao, nota } = req.body;
      if (!assunto) return res.status(400).json({ erro: "Informe o assunto da atividade" });
      if (safeMode) return res.status(200).json({ ok: true, simulado: true });
      const b = { subject: assunto, deal_id: Number(dealId), done: 0 };
      if (tipo) b.type = tipo;
      if (data) b.due_date = data;
      if (hora) b.due_time = hora;
      if (duracao) b.duration = duracao;
      if (nota) b.note = nota;
      const r = await (await jpost(`${BASE}/activities?${q}`, b)).json();
      if (!r.success) return res.status(502).json({ erro: "Falha ao criar a atividade", detalhe: r });
      return res.status(200).json({ ok: true, id: r.data && r.data.id });
    }

    if (action === "atividade-editar") {
      const { activityId, assunto, tipo, data, hora, duracao, nota, feito } = req.body;
      if (!activityId) return res.status(400).json({ erro: "Informe a atividade" });
      if (safeMode) return res.status(200).json({ ok: true, simulado: true });
      const b = {};
      if (assunto) b.subject = assunto;
      if (tipo != null) b.type = tipo;
      if (data) b.due_date = data;
      if (hora != null) b.due_time = hora;
      if (duracao != null) b.duration = duracao;
      if (nota != null) b.note = nota;
      if (typeof feito === "boolean") b.done = feito ? 1 : 0;
      const r = await (await jput(`${BASE}/activities/${activityId}?${q}`, b)).json();
      if (!r.success) return res.status(502).json({ erro: "Falha ao editar a atividade", detalhe: r });
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ erro: "ação inválida" });
  } catch (e) {
    return res.status(502).json({ erro: "Erro de rede ao chamar o Pipedrive", detalhe: String(e) });
  }
}
