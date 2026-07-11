// FUNÇÃO DE SERVIDOR (Vercel). A chave do Evernote vive em process.env.EVERNOTE_DEV_TOKEN
// e NUNCA é enviada ao navegador. O cliente só manda o título da nota e recebe a transcrição.
//
// Fase 1c: implementar a chamada real via SDK/HTTP do Evernote quando o developer token
// for liberado (aprovação do Evernote pode levar dias). Até lá, o app usa o modo "colar".

import { exigirLogin } from "../server/google.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ erro: "Método não permitido" });
  if (!(await exigirLogin(req))) return res.status(401).json({ erro: "não autenticado" });

  const token = process.env.EVERNOTE_DEV_TOKEN;
  if (!token) {
    return res.status(503).json({
      erro: "Integração do Evernote ainda não habilitada. Use o modo colar por enquanto.",
    });
  }

  const { titulo } = req.body || {};
  if (!titulo) return res.status(400).json({ erro: "Informe o título da nota" });

  // Fase 1c: buscar a nota pelo título e devolver o texto da transcrição.
  return res.status(501).json({ erro: "Busca no Evernote será implementada na Fase 1c" });
}
