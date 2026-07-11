// Detalhe de um negocio do Pipedrive (deal + contato + atividades + notas).
// Exige login (dado pessoal): valida o token do Supabase.
import { admin } from "../server/google.js";

export default async function handler(req, res) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const { data: u } = await admin().auth.getUser(token);
  if (!(u && u.user)) return res.status(401).json({ erro: "não autenticado" });

  const pd = process.env.PIPEDRIVE_API_TOKEN;
  if (!pd) return res.status(500).json({ erro: "PIPEDRIVE_API_TOKEN não configurado" });
  const id = req.query && req.query.id;
  if (!id) return res.status(400).json({ erro: "informe o id" });

  const base = "https://api.pipedrive.com/v1";
  const q = `api_token=${encodeURIComponent(pd)}`;
  const limpar = (h) => (h || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();

  try {
    const deal = (await (await fetch(`${base}/deals/${id}?${q}`)).json()).data;
    if (!deal) return res.status(404).json({ erro: "negócio não encontrado" });

    let pessoa = null;
    if (deal.person_id) {
      const pid = typeof deal.person_id === "object" ? (deal.person_id.value || deal.person_id.id) : deal.person_id;
      const p = (await (await fetch(`${base}/persons/${pid}?${q}`)).json()).data;
      if (p) pessoa = {
        nome: p.name,
        email: (p.email && p.email[0] && p.email[0].value) || "",
        telefone: (p.phone && p.phone[0] && p.phone[0].value) || "",
      };
    }

    const ativ = ((await (await fetch(`${base}/activities?deal_id=${id}&${q}`)).json()).data) || [];
    const notas = ((await (await fetch(`${base}/notes?deal_id=${id}&${q}`)).json()).data) || [];

    return res.status(200).json({
      titulo: deal.title,
      valor: deal.value || 0,
      moeda: deal.currency || "BRL",
      status: deal.status,
      org: (deal.org_id && deal.org_id.name) || deal.org_name || null,
      dono: (deal.user_id && deal.user_id.name) || null,
      criado: (deal.add_time || "").slice(0, 10),
      atualizado: (deal.update_time || "").slice(0, 10),
      pessoa,
      atividades: ativ.map((a) => ({ assunto: a.subject, feito: !!a.done, vencimento: a.due_date || null })),
      notas: notas.map((n) => ({ conteudo: limpar(n.content), criado: (n.add_time || "").slice(0, 10) })),
    });
  } catch (e) {
    return res.status(502).json({ erro: "Erro ao ler o negócio", detalhe: String(e) });
  }
}
