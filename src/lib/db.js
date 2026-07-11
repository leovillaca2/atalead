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

export async function criarReuniaoCompleta({ titulo, participantes, transcricao, ata }) {
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

  const reuniao = await run(() =>
    supabase.from("reunioes").insert({
      prospect_id: prospect.id, titulo, transcricao, origem: "colar", status: "ata_gerada",
      data: new Date().toISOString().slice(0, 10),
    }).select().single()
  );

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
  }).select());

  const passos = ((ata && ata.proximos_passos) || []).map((t) => ({
    reuniao_id: reuniao.id, prospect_id: prospect.id,
    titulo: typeof t === "string" ? t : t.titulo || "",
    responsavel: t.responsavel || null, prazo: t.prazo || null,
  })).filter((p) => p.titulo);
  if (passos.length) await run(() => supabase.from("proximos_passos").insert(passos).select());

  return reuniao.id;
}
