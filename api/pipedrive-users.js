// FUNÇÃO DE SERVIDOR. Lista os usuarios (donos) do Pipedrive (só leitura), pro filtro.
import { exigirLogin } from "../server/google.js";

export default async function handler(req, res) {
  if (!(await exigirLogin(req))) return res.status(401).json({ erro: "não autenticado" });
  const token = process.env.PIPEDRIVE_API_TOKEN;
  if (!token) return res.status(500).json({ erro: "PIPEDRIVE_API_TOKEN não configurado" });
  const q = `api_token=${encodeURIComponent(token)}`;
  try {
    const data = (await (await fetch(`https://api.pipedrive.com/v1/users?${q}`)).json()).data || [];
    const usuarios = data
      .filter((u) => u.active_flag)
      .map((u) => ({ id: u.id, nome: u.name }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
    return res.status(200).json({ usuarios });
  } catch (e) {
    return res.status(502).json({ erro: "Erro ao ler usuários do Pipedrive", detalhe: String(e) });
  }
}
