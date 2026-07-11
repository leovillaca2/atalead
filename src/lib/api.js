import { supabase } from "./supabase.js";

// Cliente que fala com as funcoes de servidor (/api).
// As chaves da Tess, Evernote, Pipedrive e Google vivem SO no servidor.

async function bearer() {
  const { data } = await supabase.auth.getSession();
  return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}

async function post(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.erro || `Falha em ${path}`);
  return data;
}

async function get(path) {
  const res = await fetch(path);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.erro || `Falha em ${path}`);
  return data;
}

// Gera a ata a partir da transcricao (servidor chama a Tess).
export function gerarAta({ transcricao, participantes }) {
  return post("/api/gerar-ata", { transcricao, participantes });
}

// Puxa a transcricao de uma nota do Evernote (servidor chama o Evernote).
export function buscarNotaEvernote({ titulo }) {
  return post("/api/evernote-nota", { titulo });
}

// Lista os funis do Pipedrive (pra popular o seletor).
export function pipelinesPipedrive() {
  return get("/api/pipedrive-pipelines");
}

// Lista os usuarios (donos) do Pipedrive (pro filtro de dono).
export function usersPipedrive() {
  return get("/api/pipedrive-users");
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
  return get(`/api/pipedrive-stages?pipeline=${encodeURIComponent(pipelineId)}`);
}

// Cria/atualiza o negocio no Pipedrive. Com dealId + expectedUpdateTime, checa conflito.
export function enviarPipedrive({ lead, ata, dealId, expectedUpdateTime, force, pipelineId, stageId }) {
  return post("/api/enviar-pipedrive", { lead, ata, dealId, expectedUpdateTime, force, pipelineId, stageId });
}

// Google Calendar: URL pra iniciar a conexao (leva o token do usuario no query).
export async function googleConectarUrl() {
  const { data } = await supabase.auth.getSession();
  return "/api/google/auth?token=" + encodeURIComponent((data.session && data.session.access_token) || "");
}

// Le os proximos eventos do Google Calendar do usuario.
export async function googleEventos() {
  const res = await fetch("/api/google/eventos", { headers: await bearer() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.erro || "Falha ao ler o calendário");
  return data;
}
