// FUNÇÃO DE SERVIDOR (só leitura). Metadados do Pipedrive num endpoint só, pra economizar
// funcoes serverless (limite do plano). ?tipo=pipelines|users|stages|labels
import { exigirLogin } from "../server/google.js";

const BASE = "https://api.pipedrive.com/v1";

export default async function handler(req, res) {
  if (!(await exigirLogin(req))) return res.status(401).json({ erro: "não autenticado" });
  const token = process.env.PIPEDRIVE_API_TOKEN;
  if (!token) return res.status(500).json({ erro: "PIPEDRIVE_API_TOKEN não configurado" });

  const tipo = (req.query && req.query.tipo) || "";
  const q = `api_token=${encodeURIComponent(token)}`;

  try {
    if (tipo === "pipelines") {
      const data = (await (await fetch(`${BASE}/pipelines?${q}`)).json()).data || [];
      const funis = data.filter((p) => p.name && !p.name.trim().startsWith("<")).map((p) => ({ id: p.id, nome: p.name.trim() }));
      return res.status(200).json({ funis });
    }
    if (tipo === "users") {
      const data = (await (await fetch(`${BASE}/users?${q}`)).json()).data || [];
      const usuarios = data.filter((u) => u.active_flag).map((u) => ({ id: u.id, nome: u.name })).sort((a, b) => a.nome.localeCompare(b.nome));
      return res.status(200).json({ usuarios });
    }
    if (tipo === "stages") {
      const pipeline = (req.query && req.query.pipeline) || "1";
      const data = (await (await fetch(`${BASE}/stages?pipeline_id=${pipeline}&${q}`)).json()).data || [];
      const etapas = data.sort((a, b) => a.order_nr - b.order_nr).map((s) => ({ id: s.id, nome: s.name }));
      return res.status(200).json({ etapas });
    }
    if (tipo === "labels") {
      // O "termometro" do lead no Pipedrive e o campo Label do negocio (ex.: Quente/Morno/Frio).
      const campos = (await (await fetch(`${BASE}/dealFields?${q}`)).json()).data || [];
      const campo = campos.find((c) => c.key === "label");
      const labels = ((campo && campo.options) || []).map((o) => ({ id: o.id, nome: o.label, cor: o.color || null }));
      return res.status(200).json({ labels });
    }
    return res.status(400).json({ erro: "tipo inválido" });
  } catch (e) {
    return res.status(502).json({ erro: "Erro ao ler metadados do Pipedrive", detalhe: String(e) });
  }
}
