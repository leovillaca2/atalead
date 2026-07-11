// FUNÇÃO DE SERVIDOR. Lista os funis do Pipedrive (só leitura) pra popular o seletor.
import { exigirLogin } from "../server/google.js";

export default async function handler(req, res) {
  if (!(await exigirLogin(req))) return res.status(401).json({ erro: "não autenticado" });
  const token = process.env.PIPEDRIVE_API_TOKEN;
  if (!token) return res.status(500).json({ erro: "PIPEDRIVE_API_TOKEN não configurado" });
  const q = `api_token=${encodeURIComponent(token)}`;
  try {
    const data = (await (await fetch(`https://api.pipedrive.com/v1/pipelines?${q}`)).json()).data || [];
    const funis = data
      .filter((p) => p.name && !p.name.trim().startsWith("<")) // tira placeholders/ocultos
      .map((p) => ({ id: p.id, nome: p.name.trim() }));
    return res.status(200).json({ funis });
  } catch (e) {
    return res.status(502).json({ erro: "Erro ao ler funis do Pipedrive", detalhe: String(e) });
  }
}
