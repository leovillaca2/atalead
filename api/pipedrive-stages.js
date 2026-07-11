// FUNÇÃO DE SERVIDOR. Lista as etapas de um funil do Pipedrive (só leitura).
import { exigirLogin } from "../server/google.js";

export default async function handler(req, res) {
  if (!(await exigirLogin(req))) return res.status(401).json({ erro: "não autenticado" });
  const token = process.env.PIPEDRIVE_API_TOKEN;
  if (!token) return res.status(500).json({ erro: "PIPEDRIVE_API_TOKEN não configurado" });
  const pipeline = (req.query && req.query.pipeline) || "1";
  const q = `api_token=${encodeURIComponent(token)}`;
  try {
    const data = (await (await fetch(`https://api.pipedrive.com/v1/stages?pipeline_id=${pipeline}&${q}`)).json()).data || [];
    const etapas = data.sort((a, b) => a.order_nr - b.order_nr).map((s) => ({ id: s.id, nome: s.name }));
    return res.status(200).json({ etapas });
  } catch (e) {
    return res.status(502).json({ erro: "Erro ao ler etapas do Pipedrive", detalhe: String(e) });
  }
}
