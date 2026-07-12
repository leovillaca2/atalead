import { supabase } from "./supabase.js";

export const ETAPAS = ["novo", "qualificado", "proposta", "ganho", "perdido"];
export const ETAPA_LABEL = { novo: "Novo", qualificado: "Qualificado", proposta: "Proposta", ganho: "Ganho", perdido: "Perdido" };
export const ETAPA_COR = { novo: "#7E9196", qualificado: "#1D5FD1", proposta: "#B45309", ganho: "#15803D", perdido: "#B4231C" };

function parseValor(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = String(v).replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const f = parseFloat(n);
  return isNaN(f) ? null : f;
}

export function fmtValor(n) {
  if (n === null || n === undefined) return "—";
  return "R$ " + Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

// Erros de relógio/token: renova a sessão e tenta de novo uma vez.
function ehErroToken(e) {
  const m = (e && (e.message || e.msg || e.error_description)) || "";
  return /jwt|issued at future|token|expired|clock/i.test(String(m));
}

async function run(build) {
  let res = await build();
  if (res.error && ehErroToken(res.error)) {
    try { await supabase.auth.refreshSession(); } catch { /* segue */ }
    res = await build();
  }
  if (res.error) throw res.error;
  return res.data;
}

export async function listarFunil() {
  const [prospects, reunioes] = await Promise.all([
    run(() => supabase.from("prospects").select("*").order("created_at", { ascending: false })),
    run(() => supabase.from("reunioes").select("id, prospect_id, data").order("data", { ascending: false })),
  ]);
  const ultima = {};
  (reunioes || []).forEach((r) => { if (!ultima[r.prospect_id]) ultima[r.prospect_id] = r; });
  const cards = (prospects || []).map((p) => ({
    ...p,
    ultimaReuniaoId: ultima[p.id] ? ultima[p.id].id : null,
    ultimaData: ultima[p.id] ? ultima[p.id].data : null,
  }));
  return ETAPAS.map((e) => ({
    etapa: e, nome: ETAPA_LABEL[e], cor: ETAPA_COR[e],
    cards: cards.filter((p) => (p.etapa || "novo") === e),
  }));
}

export async function listarPassosAbertos() {
  return run(() =>
    supabase.from("proximos_passos").select("*, prospects(empresa)").eq("feito", false).order("created_at", { ascending: true })
  ) || [];
}

export async function getReuniao(id) {
  const reuniao = await run(() => supabase.from("reunioes").select("*, prospects(*)").eq("id", id).single());
  const [participantes, atas, passos] = await Promise.all([
    run(() => supabase.from("participantes").select("*").eq("reuniao_id", id)),
    run(() => supabase.from("atas").select("*").eq("reuniao_id", id).order("versao", { ascending: false }).limit(1)),
    run(() => supabase.from("proximos_passos").select("*").eq("reuniao_id", id).order("created_at", { ascending: true })),
  ]);
  return { reuniao, participantes: participantes || [], ata: (atas || [])[0] || null, passos: passos || [] };
}

export async function togglePasso(id, feito) {
  await run(() => supabase.from("proximos_passos").update({ feito }).eq("id", id).select());
}

export async function updateAta(ataId, campos) {
  await run(() => supabase.from("atas").update(campos).eq("id", ataId).select());
}

export async function listarReunioes() {
  return run(() =>
    supabase
      .from("reunioes")
      .select("id, titulo, data, created_at, status, notas, google_event_id, pipedrive_deal_id, prospects(empresa, contato, valor_estimado), participantes(count), proximos_passos(count)")
      .order("data", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(400)
  ) || [];
}

// Modelos de ata (tipos de reuniao). Cada um muda o foco do processamento da Tess.
export async function listarModelos() {
  return run(() => supabase.from("modelos_ata").select("*").order("ordem", { ascending: true }).order("created_at", { ascending: true })) || [];
}
export async function criarModelo({ nome, instrucoes }) {
  return run(() => supabase.from("modelos_ata").insert({ nome, instrucoes: instrucoes || "", ordem: 100 }).select().single());
}
export async function atualizarModelo(id, { nome, instrucoes }) {
  await run(() => supabase.from("modelos_ata").update({ nome, instrucoes: instrucoes || "" }).eq("id", id).select());
}
export async function excluirModelo(id) {
  await run(() => supabase.from("modelos_ata").delete().eq("id", id).select());
}

// Sincroniza os eventos do Google com os registros do AtaLead (chamado ao abrir o Calendario).
// Insere os que faltam como 'agendada' e marca 'cancelada' os que sumiram do Google (na janela).
export async function sincronizarAgenda(eventos) {
  if (!Array.isArray(eventos)) return;
  const existentes = await run(() =>
    supabase.from("reunioes").select("id, google_event_id, status, data").not("google_event_id", "is", null)
  ) || [];
  const porEvento = {};
  existentes.forEach((r) => { porEvento[r.google_event_id] = r; });

  const novos = eventos
    .filter((e) => e.id && !porEvento[e.id])
    .map((e) => ({
      titulo: e.titulo || "(sem título)",
      data: (e.inicio || "").slice(0, 10) || null,
      origem: "calendario",
      status: "agendada",
      google_event_id: e.id,
    }));
  if (novos.length) await run(() => supabase.from("reunioes").insert(novos).select());

  // Reconciliar cancelamentos: agendadas dentro da janela (-7d/+30d) que sumiram do Google.
  const presentes = new Set(eventos.map((e) => e.id));
  const hoje = new Date();
  const min = new Date(hoje.getTime() - 7 * 864e5).toISOString().slice(0, 10);
  const max = new Date(hoje.getTime() + 30 * 864e5).toISOString().slice(0, 10);
  const sumiram = existentes.filter((r) => r.status === "agendada" && !presentes.has(r.google_event_id) && r.data && r.data >= min && r.data <= max);
  for (const r of sumiram) await run(() => supabase.from("reunioes").update({ status: "cancelada" }).eq("id", r.id).select());
}

// Exclui a reuniao e tudo dela (participantes/atas/passos caem por cascade). Nao mexe no Pipedrive.
export async function excluirReuniao(id) {
  const r = await run(() => supabase.from("reunioes").select("prospect_id").eq("id", id).maybeSingle());
  await run(() => supabase.from("reunioes").delete().eq("id", id).select());
  const pid = r && r.prospect_id;
  if (pid) {
    const outras = await run(() => supabase.from("reunioes").select("id").eq("prospect_id", pid).limit(1));
    if (!outras || outras.length === 0) await run(() => supabase.from("prospects").delete().eq("id", pid).select());
  }
}

export async function salvarNotas(reuniaoId, notas) {
  await run(() => supabase.from("reunioes").update({ notas }).eq("id", reuniaoId).select());
}

export async function salvarVinculoPipedrive(reuniaoId, v) {
  await run(() =>
    supabase.from("reunioes").update({
      pipedrive_deal_id: v.dealId || null,
      pipedrive_org_id: v.orgId || null,
      pipedrive_person_id: v.personId || null,
      pipedrive_update_time: v.update_time || null,
      pipedrive_synced_at: new Date().toISOString(),
    }).eq("id", reuniaoId).select()
  );
}

export async function criarReuniaoCompleta({ titulo, participantes, transcricao, ata, googleEventId }) {
  const lead = (ata && ata.lead) || {};

  const prospect = await run(() =>
    supabase.from("prospects").insert({
      empresa: lead.empresa || titulo,
      contato: lead.contato || null,
      cargo: lead.cargo || null,
      segmento: lead.segmento || null,
      etapa: (lead.etapa || "novo").toLowerCase(),
      valor_estimado: parseValor(lead.valor),
    }).select().single()
  );

  // Se veio de um evento do calendario ja registrado, ATUALIZA aquele registro (nao duplica).
  let reuniao = null;
  if (googleEventId) {
    const existente = await run(() => supabase.from("reunioes").select("id").eq("google_event_id", googleEventId).maybeSingle());
    if (existente) {
      reuniao = await run(() =>
        supabase.from("reunioes").update({
          prospect_id: prospect.id, titulo, transcricao, origem: "calendario", status: "ata_gerada",
        }).eq("id", existente.id).select().single()
      );
    }
  }
  if (!reuniao) {
    reuniao = await run(() =>
      supabase.from("reunioes").insert({
        prospect_id: prospect.id, titulo, transcricao, origem: googleEventId ? "calendario" : "colar", status: "ata_gerada",
        data: new Date().toISOString().slice(0, 10), google_event_id: googleEventId || null,
      }).select().single()
    );
  }

  const parts = (participantes || []).filter((p) => p && p.nome);
  if (parts.length) {
    await run(() => supabase.from("participantes").insert(
      parts.map((p, i) => ({ reuniao_id: reuniao.id, speaker: `Speaker ${i + 1}`, nome: p.nome, empresa: p.empresa || null, papel: p.papel || null }))
    ).select());
  }

  await run(() => supabase.from("atas").insert({
    reuniao_id: reuniao.id,
    resumo: (ata && ata.resumo) || "",
    decisoes: (ata && ata.decisoes) || [],
    produtos: (ata && ata.produtos) || [],
    lead,
    analise: {
      temperatura: (ata && ata.temperatura) || null,
      probabilidade: (ata && ata.probabilidade) || null,
      nota: ata && ata.avaliacao ? ata.avaliacao.nota : null,
      comentario: ata && ata.avaliacao ? ata.avaliacao.comentario : null,
    },
  }).select());

  const passos = ((ata && ata.proximos_passos) || []).map((t) => ({
    reuniao_id: reuniao.id, prospect_id: prospect.id,
    titulo: typeof t === "string" ? t : t.titulo || "",
    responsavel: t.responsavel || null, prazo: t.prazo || null,
  })).filter((p) => p.titulo);
  if (passos.length) await run(() => supabase.from("proximos_passos").insert(passos).select());

  return reuniao.id;
}
