import { supabase } from "./supabase.js";

// Cliente que fala com as funcoes de servidor (/api).
// As chaves da Tess, Evernote, Pipedrive e Google vivem SO no servidor.

async function bearer() {
  const { data } = await supabase.auth.getSession();
  return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}

// fetch com timeout: evita a UI ficar "Enviando..." pra sempre se a rede pendurar.
async function fetchT(path, opts = {}, ms = 45000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(path, { ...opts, signal: ctrl.signal });
  } catch (e) {
    if (e.name === "AbortError") throw new Error("A operação demorou demais. Tente de novo.");
    throw e;
  } finally {
    clearTimeout(t);
  }
}

async function post(path, body, ms) {
  const res = await fetchT(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await bearer()) },
    body: JSON.stringify(body || {}),
  }, ms);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.erro || `Falha em ${path}`);
  return data;
}

async function get(path, ms) {
  const res = await fetchT(path, { headers: await bearer() }, ms);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.erro || `Falha em ${path}`);
  return data;
}

// Gera a ata a partir da transcricao (servidor chama a Tess). Timeout maior: a Tess demora.
// falantes: mapa explicito [{ speaker, nome, empresa, papel }] pra Tess saber quem e quem.
// instrucoes: foco do tipo de reuniao (modelo de ata escolhido).
export function gerarAta({ transcricao, participantes, falantes, instrucoes }) {
  return post("/api/gerar-ata", { transcricao, participantes, falantes, instrucoes }, 110000);
}

// Puxa a transcricao de uma nota do Evernote (servidor chama o Evernote).
export function buscarNotaEvernote({ titulo }) {
  return post("/api/evernote-nota", { titulo });
}

// Lista os funis do Pipedrive (pra popular o seletor).
export function pipelinesPipedrive() {
  return get("/api/pipedrive-meta?tipo=pipelines");
}

// Lista os usuarios (donos) do Pipedrive (pro filtro de dono).
export function usersPipedrive() {
  return get("/api/pipedrive-meta?tipo=users");
}

// Lista as opcoes de temperatura (campo Label do negocio: Quente/Morno/Frio...).
export function labelsPipedrive() {
  return get("/api/pipedrive-meta?tipo=labels");
}

// Lista as opcoes de segmento/setor configuradas no Pipedrive (pra sugerir no lead).
export function segmentosPipedrive() {
  return get("/api/pipedrive-meta?tipo=segmentos");
}

// Detalhe completo de um negocio do Pipedrive (exige login).
export async function dealPipedrive(id) {
  const res = await fetchT("/api/pipedrive-deal?id=" + encodeURIComponent(id), { headers: await bearer() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.erro || "Falha ao ler o negócio");
  return data;
}

// Le um funil do Pipedrive (negocios agrupados por etapa), com filtro opcional de dono.
export function funilPipedrive(pipelineId, owner) {
  const qs = new URLSearchParams();
  if (pipelineId) qs.set("pipeline", pipelineId);
  if (owner) qs.set("owner", owner);
  const s = qs.toString();
  return get("/api/pipedrive-funil" + (s ? "?" + s : ""));
}

// Lista as etapas de um funil (pra escolher onde entra o negocio).
export function stagesPipedrive(pipelineId) {
  return get(`/api/pipedrive-meta?tipo=stages&pipeline=${encodeURIComponent(pipelineId)}`);
}

// Adiciona uma nota a um negocio no Pipedrive (escrita).
export function adicionarNotaPipedrive({ dealId, conteudo }) {
  return post("/api/pipedrive-acao", { action: "nota", dealId, conteudo });
}

// Conclui (ou reabre) uma atividade do negocio no Pipedrive.
export function concluirAtividadePipedrive({ dealId, activityId, feito = true }) {
  return post("/api/pipedrive-acao", { action: "atividade-feita", dealId, activityId, feito });
}

// Cria uma nova atividade no negocio no Pipedrive (tipo, data, hora, duracao, nota).
export function novaAtividadePipedrive({ dealId, assunto, tipo, data, hora, duracao, nota }) {
  return post("/api/pipedrive-acao", { action: "atividade-nova", dealId, assunto, tipo, data, hora, duracao, nota });
}

// Edita uma atividade existente (assunto, tipo, data, hora, duracao, nota, feito).
export function editarAtividadePipedrive({ dealId, activityId, assunto, tipo, data, hora, duracao, nota, feito }) {
  return post("/api/pipedrive-acao", { action: "atividade-editar", dealId, activityId, assunto, tipo, data, hora, duracao, nota, feito });
}

// Tipos de atividade configurados no Pipedrive (ligacao, reuniao, tarefa...).
export function tiposAtividadePipedrive() {
  return get("/api/pipedrive-meta?tipo=tipos-atividade");
}

// Busca negocios ABERTOS da mesma empresa (pra evitar duplicar antes de criar).
export function buscarNegociosPipedrive({ empresa }) {
  return get("/api/pipedrive-meta?tipo=negocios&empresa=" + encodeURIComponent(empresa || ""));
}

// Muda a temperatura (Label) do negocio no Pipedrive.
export function setLabelPipedrive({ dealId, labelId }) {
  return post("/api/pipedrive-acao", { action: "label", dealId, labelId });
}

// Cria/atualiza o negocio no Pipedrive. Com dealId + expectedUpdateTime, checa conflito.
// apenasAnexar=true: vincula a um negocio existente (so anexa ata + tarefas, sem sobrescrever).
export function enviarPipedrive({ lead, ata, dealId, expectedUpdateTime, force, apenasAnexar, dataReuniao, pipelineId, stageId }) {
  return post("/api/enviar-pipedrive", { lead, ata, dealId, expectedUpdateTime, force, apenasAnexar, dataReuniao, pipelineId, stageId });
}

// Google Calendar: URL pra iniciar a conexao (leva o token do usuario no query).
export async function googleConectarUrl() {
  const { data } = await supabase.auth.getSession();
  return "/api/google/auth?token=" + encodeURIComponent((data.session && data.session.access_token) || "");
}

// Le os proximos eventos do Google Calendar do usuario.
export async function googleEventos() {
  const res = await fetchT("/api/google/eventos", { headers: await bearer() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.erro || "Falha ao ler o calendário");
  return data;
}

// Cancela (apaga) um evento no Google Calendar, avisando os participantes.
export async function excluirEventoGoogle(eventId) {
  const res = await fetchT("/api/google/criar-evento?id=" + encodeURIComponent(eventId), { method: "DELETE", headers: await bearer() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.erro || "Falha ao cancelar o evento");
  return data;
}

// Cria um evento no Google Calendar (escreve na agenda).
export async function criarEventoGoogle(dados) {
  const res = await fetchT("/api/google/criar-evento", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await bearer()) },
    body: JSON.stringify(dados),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.erro || "Falha ao criar evento");
  return data;
}
