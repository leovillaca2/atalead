// FUNÇÃO DE SERVIDOR (Vercel). O token do Pipedrive vive em process.env.PIPEDRIVE_API_TOKEN
// e NUNCA é enviado ao navegador. O cliente manda o lead aprovado e o servidor cria no CRM.

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ erro: "Método não permitido" });

  const token = process.env.PIPEDRIVE_API_TOKEN;
  if (!token) return res.status(500).json({ erro: "PIPEDRIVE_API_TOKEN não configurado no servidor" });

  const { lead } = req.body || {};
  if (!lead || !lead.empresa) return res.status(400).json({ erro: "Lead sem empresa" });

  // MODO SEGURO (ligado por padrão): NÃO escreve nada no Pipedrive real.
  // Só cria de verdade quando PIPEDRIVE_SAFE_MODE for explicitamente "false".
  const safeMode = process.env.PIPEDRIVE_SAFE_MODE !== "false";
  if (safeMode) {
    return res.status(200).json({
      ok: true,
      simulado: true,
      mensagem: "Modo seguro ativo: nada foi criado no Pipedrive real.",
    });
  }

  const base = "https://api.pipedrive.com/v1";
  const q = `api_token=${encodeURIComponent(token)}`;

  try {
    // 1) Organização
    const org = await (await fetch(`${base}/organizations?${q}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: lead.empresa }),
    })).json();

    // 2) Pessoa (contato)
    let personId;
    if (lead.contato) {
      const person = await (await fetch(`${base}/persons?${q}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: lead.contato, org_id: org?.data?.id }),
      })).json();
      personId = person?.data?.id;
    }

    // 3) Negócio (deal)
    const deal = await (await fetch(`${base}/deals?${q}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `${lead.empresa} — proposta`,
        org_id: org?.data?.id,
        person_id: personId,
      }),
    })).json();

    if (!deal?.success) return res.status(502).json({ erro: "Falha ao criar negócio no Pipedrive", detalhe: deal });
    return res.status(200).json({ ok: true, dealId: deal.data.id });
  } catch (e) {
    return res.status(502).json({ erro: "Erro de rede ao chamar o Pipedrive", detalhe: String(e) });
  }
}
