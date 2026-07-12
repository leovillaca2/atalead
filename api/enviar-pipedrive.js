// FUNÇÃO DE SERVIDOR. O token do Pipedrive vive em process.env e NUNCA vai ao navegador.
// Cria negocio, ou anexa a um existente (apenasAnexar), ou atualiza. Checa conflito (update_time).
// MODO SEGURO (PIPEDRIVE_SAFE_MODE != "false"): a leitura de conflito acontece, mas NADA e escrito.
import { exigirLogin } from "../server/google.js";

const BASE = "https://api.pipedrive.com/v1";
const jf = (o) => ({ method: o.m, headers: { "Content-Type": "application/json" }, body: JSON.stringify(o.b) });

function parseValor(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = String(v).replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const f = parseFloat(n);
  return isNaN(f) ? null : f;
}

// Registra a reuniao no negocio: 1) a REUNIAO como atividade concluida (anotacao = resumo,
// data = quando ocorreu); 2) decisoes/produtos como nota; 3) proximos passos como tarefas abertas.
async function anexarAtaEtarefas(dealId, ata, q, opts = {}) {
  if (!ata) return;
  const { dataReuniao, titulo } = opts;

  // 1) A reuniao em si, como atividade CONCLUIDA, com o resumo na anotacao.
  if (ata.resumo) {
    const b = { subject: "Reunião" + (titulo ? " — " + titulo : ""), deal_id: Number(dealId), done: 1, type: "meeting", note: ata.resumo };
    if (dataReuniao) b.due_date = dataReuniao;
    await fetch(`${BASE}/activities?${q}`, jf({ m: "POST", b }));
  }

  // 2) Decisoes e produtos como nota (se houver).
  const linhas = [];
  if (ata.decisoes && ata.decisoes.length) linhas.push("DECISÕES\n- " + ata.decisoes.join("\n- "));
  if (ata.produtos && ata.produtos.length) linhas.push("PRODUTOS\n- " + ata.produtos.join("\n- "));
  if (linhas.length) await fetch(`${BASE}/notes?${q}`, jf({ m: "POST", b: { deal_id: Number(dealId), content: linhas.join("\n\n") } }));

  // 3) Proximos passos como atividades abertas (tarefas).
  for (const t of ata.proximos_passos || []) {
    const subj = typeof t === "string" ? t : t.titulo;
    if (subj) await fetch(`${BASE}/activities?${q}`, jf({ m: "POST", b: { subject: subj, deal_id: Number(dealId), done: 0, type: "task" } }));
  }
}

async function updateTimeDe(dealId, q) {
  try {
    const re = await (await fetch(`${BASE}/deals/${dealId}?${q}`)).json();
    return (re && re.data && re.data.update_time) || null;
  } catch { return null; }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ erro: "Método não permitido" });
  if (!(await exigirLogin(req))) return res.status(401).json({ erro: "não autenticado" });
  const token = process.env.PIPEDRIVE_API_TOKEN;
  if (!token) return res.status(500).json({ erro: "PIPEDRIVE_API_TOKEN não configurado" });

  const { lead, ata, dealId, expectedUpdateTime, force, apenasAnexar, dataReuniao, pipelineId: ppBody, stageId: stBody } = req.body || {};
  if (!lead || !lead.empresa) return res.status(400).json({ erro: "Lead sem empresa" });

  const q = `api_token=${encodeURIComponent(token)}`;
  const pipelineId = ppBody || process.env.PIPEDRIVE_PIPELINE_ID || "1";
  const stageId = stBody || process.env.PIPEDRIVE_STAGE_ID || null;
  const safeMode = process.env.PIPEDRIVE_SAFE_MODE === "true"; // escrita ligada por padrao

  try {
    // A) VINCULAR a um negocio existente: atualiza valor/etapa preenchidos e anexa ata + tarefas.
    // (nao sobrescreve o TITULO do negocio existente)
    if (dealId && apenasAnexar) {
      if (safeMode) return res.status(200).json({ ok: true, simulado: true, mensagem: "Modo seguro: nada foi escrito no Pipedrive." });
      const patch = {};
      const v = parseValor(lead.valor); if (v != null) { patch.value = v; patch.currency = "BRL"; }
      if (stageId) patch.stage_id = Number(stageId);
      if (Object.keys(patch).length) await fetch(`${BASE}/deals/${dealId}?${q}`, jf({ m: "PUT", b: patch }));
      await anexarAtaEtarefas(dealId, ata, q, { dataReuniao, titulo: lead.empresa });
      return res.status(200).json({ ok: true, dealId, update_time: await updateTimeDe(dealId, q) });
    }

    // B) CHECK DE CONFLITO (leitura), antes de qualquer escrita de atualizacao.
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

    // C) MODO SEGURO: para aqui, sem escrever.
    if (safeMode) {
      return res.status(200).json({ ok: true, simulado: true, mensagem: "Modo seguro: nada foi escrito no Pipedrive." });
    }

    // D) ATUALIZAR negocio ja vinculado: valor + etapa. NAO mexe no titulo (pode ser deal externo).
    if (dealId) {
      const bodyUpd = {};
      const valorUpd = parseValor(lead.valor);
      if (valorUpd != null) { bodyUpd.value = valorUpd; bodyUpd.currency = "BRL"; }
      if (stageId) bodyUpd.stage_id = Number(stageId);
      if (!Object.keys(bodyUpd).length) return res.status(200).json({ ok: true, dealId, update_time: await updateTimeDe(dealId, q) });
      const upd = await (await fetch(`${BASE}/deals/${dealId}?${q}`, jf({ m: "PUT", b: bodyUpd }))).json();
      if (!upd.success) return res.status(502).json({ erro: "Falha ao atualizar negócio", detalhe: upd });
      return res.status(200).json({ ok: true, dealId, update_time: upd.data.update_time });
    }

    // E) CRIAR: reusa organizacao/pessoa se ja existirem (evita duplicar), senao cria.
    let orgId = null;
    const orgBusca = await (await fetch(`${BASE}/organizations/search?term=${encodeURIComponent(lead.empresa)}&exact_match=true&${q}`)).json();
    if (orgBusca && orgBusca.data && orgBusca.data.items && orgBusca.data.items.length) {
      orgId = orgBusca.data.items[0].item.id;
    } else {
      const org = await (await fetch(`${BASE}/organizations?${q}`, jf({ m: "POST", b: { name: lead.empresa } }))).json();
      orgId = org && org.data && org.data.id;
    }

    let personId = null;
    if (lead.contato) {
      const pBusca = await (await fetch(`${BASE}/persons/search?term=${encodeURIComponent(lead.contato)}&${q}`)).json();
      if (pBusca && pBusca.data && pBusca.data.items && pBusca.data.items.length) {
        personId = pBusca.data.items[0].item.id;
      } else {
        const person = await (await fetch(`${BASE}/persons?${q}`, jf({ m: "POST", b: { name: lead.contato, org_id: orgId } }))).json();
        personId = person && person.data && person.data.id;
      }
    }

    const dealBody = { title: `${lead.empresa} — proposta`, org_id: orgId, person_id: personId, pipeline_id: Number(pipelineId) };
    if (stageId) dealBody.stage_id = Number(stageId);
    const v = parseValor(lead.valor);
    if (v) { dealBody.value = v; dealBody.currency = "BRL"; }
    const deal = await (await fetch(`${BASE}/deals?${q}`, jf({ m: "POST", b: dealBody }))).json();
    if (!deal.success) return res.status(502).json({ erro: "Falha ao criar negócio", detalhe: deal });
    const novoDealId = deal.data.id;

    await anexarAtaEtarefas(novoDealId, ata, q, { dataReuniao, titulo: lead.empresa });

    // Nota e atividades mudam o negocio: releia pra guardar o update_time FINAL.
    const updateTime = (await updateTimeDe(novoDealId, q)) || deal.data.update_time;
    return res.status(200).json({ ok: true, dealId: novoDealId, orgId, personId, update_time: updateTime });
  } catch (e) {
    return res.status(502).json({ erro: "Erro de rede ao chamar o Pipedrive", detalhe: String(e) });
  }
}
