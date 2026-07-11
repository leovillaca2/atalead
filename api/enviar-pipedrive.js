// FUNÇÃO DE SERVIDOR. O token do Pipedrive vive em process.env e NUNCA vai ao navegador.
// Cria OU atualiza o negocio. Checa conflito (update_time) antes de sobrescrever.
// MODO SEGURO (PIPEDRIVE_SAFE_MODE != "false"): a leitura de conflito acontece, mas
// NADA e escrito no Pipedrive real.

const BASE = "https://api.pipedrive.com/v1";

function parseValor(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = String(v).replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const f = parseFloat(n);
  return isNaN(f) ? null : f;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ erro: "Método não permitido" });
  const token = process.env.PIPEDRIVE_API_TOKEN;
  if (!token) return res.status(500).json({ erro: "PIPEDRIVE_API_TOKEN não configurado" });

  const { lead, ata, dealId, expectedUpdateTime, force, pipelineId: ppBody, stageId: stBody } = req.body || {};
  if (!lead || !lead.empresa) return res.status(400).json({ erro: "Lead sem empresa" });

  const q = `api_token=${encodeURIComponent(token)}`;
  const pipelineId = ppBody || process.env.PIPEDRIVE_PIPELINE_ID || "1";
  const stageId = stBody || process.env.PIPEDRIVE_STAGE_ID || null; // etapa de entrada escolhida
  const jf = (o) => ({ method: o.m, headers: { "Content-Type": "application/json" }, body: JSON.stringify(o.b) });

  try {
    // 1) CHECK DE CONFLITO (leitura), antes de qualquer escrita.
    if (dealId) {
      const cur = await (await fetch(`${BASE}/deals/${dealId}?${q}`)).json();
      const atual = cur && cur.data;
      if (atual && expectedUpdateTime && !force && atual.update_time !== expectedUpdateTime) {
        return res.status(200).json({
          conflito: true,
          update_time: atual.update_time,
          atual: { titulo: atual.title, valor: atual.value, stage_id: atual.stage_id },
        });
      }
    }

    // 2) MODO SEGURO: para aqui, sem escrever.
    const safeMode = process.env.PIPEDRIVE_SAFE_MODE !== "false";
    if (safeMode) {
      return res.status(200).json({ ok: true, simulado: true, mensagem: "Modo seguro: nada foi escrito no Pipedrive." });
    }

    // 3) ATUALIZAR negocio existente.
    if (dealId) {
      const upd = await (await fetch(`${BASE}/deals/${dealId}?${q}`, jf({ m: "PUT", b: {
        title: `${lead.empresa} — proposta`,
        value: parseValor(lead.valor) || undefined,
      } }))).json();
      if (!upd.success) return res.status(502).json({ erro: "Falha ao atualizar negócio", detalhe: upd });
      return res.status(200).json({ ok: true, dealId, update_time: upd.data.update_time });
    }

    // 4) CRIAR do zero: organizacao, pessoa, negocio, nota (a ata) e tarefas.
    const org = await (await fetch(`${BASE}/organizations?${q}`, jf({ m: "POST", b: { name: lead.empresa } }))).json();
    const orgId = org && org.data && org.data.id;

    let personId = null;
    if (lead.contato) {
      const person = await (await fetch(`${BASE}/persons?${q}`, jf({ m: "POST", b: { name: lead.contato, org_id: orgId } }))).json();
      personId = person && person.data && person.data.id;
    }

    const dealBody = { title: `${lead.empresa} — proposta`, org_id: orgId, person_id: personId, pipeline_id: Number(pipelineId) };
    if (stageId) dealBody.stage_id = Number(stageId);
    const v = parseValor(lead.valor);
    if (v) { dealBody.value = v; dealBody.currency = "BRL"; }
    const deal = await (await fetch(`${BASE}/deals?${q}`, jf({ m: "POST", b: dealBody }))).json();
    if (!deal.success) return res.status(502).json({ erro: "Falha ao criar negócio", detalhe: deal });
    const novoDealId = deal.data.id;

    // Nota com a ata.
    if (ata) {
      const linhas = [];
      if (ata.resumo) linhas.push("RESUMO\n" + ata.resumo);
      if (ata.decisoes && ata.decisoes.length) linhas.push("DECISOES\n- " + ata.decisoes.join("\n- "));
      if (ata.produtos && ata.produtos.length) linhas.push("PRODUTOS\n- " + ata.produtos.join("\n- "));
      await fetch(`${BASE}/notes?${q}`, jf({ m: "POST", b: { deal_id: novoDealId, content: linhas.join("\n\n") } }));
    }

    // Tarefas (proximos passos).
    for (const t of (ata && ata.proximos_passos) || []) {
      const subj = typeof t === "string" ? t : t.titulo;
      if (subj) await fetch(`${BASE}/activities?${q}`, jf({ m: "POST", b: { subject: subj, deal_id: novoDealId, done: 0 } }));
    }

    return res.status(200).json({ ok: true, dealId: novoDealId, orgId, personId, update_time: deal.data.update_time });
  } catch (e) {
    return res.status(502).json({ erro: "Erro de rede ao chamar o Pipedrive", detalhe: String(e) });
  }
}
