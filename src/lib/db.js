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

export async function listarFunil() {
  const [{ data: prospects, error }, reunioes] = await Promise.all([
    supabase.from("prospects").select("*").order("created_at", { ascending: false }),
    supabase.from("reunioes").select("id, prospect_id, data").order("data", { ascending: false }),
  ]);
  if (error) throw error;
  const ultima = {};
  (reunioes.data || []).forEach((r) => { if (!ultima[r.prospect_id]) ultima[r.prospect_id] = r; });
  const cards = (prospects || []).map((p) => ({
    ...p,
    ultimaReuniaoId: ultima[p.id] ? ultima[p.id].id : null,
    ultimaData: ultima[p.id] ? ultima[p.id].data : null,
  }));
  return ETAPAS.map((e) => ({
    etapa: e,
    nome: ETAPA_LABEL[e],
    cor: ETAPA_COR[e],
    cards: cards.filter((p) => (p.etapa || "novo") === e),
  }));
}

export async function listarPassosAbertos() {
  const { data, error } = await supabase
    .from("proximos_passos")
    .select("*, prospects(empresa)")
    .eq("feito", false)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getReuniao(id) {
  const { data: r, error } = await supabase.from("reunioes").select("*, prospects(*)").eq("id", id).single();
  if (error) throw error;
  const [parts, atas, passos] = await Promise.all([
    supabase.from("participantes").select("*").eq("reuniao_id", id),
    supabase.from("atas").select("*").eq("reuniao_id", id).order("versao", { ascending: false }).limit(1),
    supabase.from("proximos_passos").select("*").eq("reuniao_id", id).order("created_at", { ascending: true }),
  ]);
  return {
    reuniao: r,
    participantes: parts.data || [],
    ata: (atas.data || [])[0] || null,
    passos: passos.data || [],
  };
}

export async function togglePasso(id, feito) {
  const { error } = await supabase.from("proximos_passos").update({ feito }).eq("id", id);
  if (error) throw error;
}

// Cria prospect + reuniao + participantes + ata + passos a partir do resultado da Tess.
export async function criarReuniaoCompleta({ titulo, participantes, transcricao, ata }) {
  const lead = (ata && ata.lead) || {};

  const { data: prospect, error: e1 } = await supabase
    .from("prospects")
    .insert({
      empresa: lead.empresa || titulo,
      contato: lead.contato || null,
      cargo: lead.cargo || null,
      segmento: lead.segmento || null,
      etapa: (lead.etapa || "novo").toLowerCase(),
      valor_estimado: parseValor(lead.valor),
    })
    .select()
    .single();
  if (e1) throw e1;

  const { data: reuniao, error: e2 } = await supabase
    .from("reunioes")
    .insert({
      prospect_id: prospect.id,
      titulo,
      transcricao,
      origem: "colar",
      status: "ata_gerada",
      data: new Date().toISOString().slice(0, 10),
    })
    .select()
    .single();
  if (e2) throw e2;

  const parts = (participantes || []).filter((p) => p && p.nome);
  if (parts.length) {
    await supabase.from("participantes").insert(
      parts.map((p, i) => ({ reuniao_id: reuniao.id, speaker: `Speaker ${i + 1}`, nome: p.nome, empresa: p.empresa || null, papel: p.papel || null }))
    );
  }

  await supabase.from("atas").insert({
    reuniao_id: reuniao.id,
    resumo: (ata && ata.resumo) || "",
    decisoes: (ata && ata.decisoes) || [],
    produtos: (ata && ata.produtos) || [],
    lead,
  });

  const passos = ((ata && ata.proximos_passos) || []).map((t) => ({
    reuniao_id: reuniao.id,
    prospect_id: prospect.id,
    titulo: typeof t === "string" ? t : t.titulo || "",
    responsavel: t.responsavel || null,
    prazo: t.prazo || null,
  }));
  if (passos.length) await supabase.from("proximos_passos").insert(passos);

  return reuniao.id;
}
