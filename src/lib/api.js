// Cliente que fala com as funcoes de servidor (/api).
// As chaves da Tess, Evernote e Pipedrive vivem SO no servidor.
// O navegador nunca ve nenhuma delas: manda os dados, recebe o resultado.

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

// Gera a ata a partir da transcricao (servidor chama a Tess).
export function gerarAta({ transcricao, participantes }) {
  return post("/api/gerar-ata", { transcricao, participantes });
}

// Puxa a transcricao de uma nota do Evernote pelo titulo (servidor chama o Evernote).
export function buscarNotaEvernote({ titulo }) {
  return post("/api/evernote-nota", { titulo });
}

// Envia o lead aprovado para o Pipedrive (servidor chama o Pipedrive).
export function enviarPipedrive({ lead, ata }) {
  return post("/api/enviar-pipedrive", { lead, ata });
}
