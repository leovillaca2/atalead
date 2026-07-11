// Cliente que fala com as funcoes de servidor (/api).
// As chaves da Tess, Evernote e Pipedrive vivem SO no servidor.

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

// Le um funil do Pipedrive (negocios agrupados por etapa).
export function funilPipedrive(pipelineId) {
  const qs = pipelineId ? `?pipeline=${encodeURIComponent(pipelineId)}` : "";
  return get("/api/pipedrive-funil" + qs);
}

// Cria/atualiza o negocio no Pipedrive. Com dealId + expectedUpdateTime, checa conflito.
export function enviarPipedrive({ lead, ata, dealId, expectedUpdateTime, force }) {
  return post("/api/enviar-pipedrive", { lead, ata, dealId, expectedUpdateTime, force });
}
