// FUNÇÃO DE SERVIDOR. Leitura do funil do Pipedrive (token protegido no servidor).
// Le negocios ABERTOS do pipeline configurado e agrupa por etapa. Nao escreve nada.

export default async function handler(req, res) {
  const token = process.env.PIPEDRIVE_API_TOKEN;
  if (!token) return res.status(500).json({ erro: "PIPEDRIVE_API_TOKEN não configurado" });
  const pipelineId = process.env.PIPEDRIVE_PIPELINE_ID || "25";

  const base = "https://api.pipedrive.com/v1";
  const q = `api_token=${encodeURIComponent(token)}`;
  try {
    const [stagesR, dealsR] = await Promise.all([
      fetch(`${base}/stages?pipeline_id=${pipelineId}&${q}`),
      fetch(`${base}/deals?stage_id=&status=open&limit=200&${q}`),
    ]);
    const stages = ((await stagesR.json()).data || []).sort((a, b) => a.order_nr - b.order_nr);
    const dealsAll = (await dealsR.json()).data || [];
    const deals = dealsAll.filter((d) => d.pipeline_id === Number(pipelineId));

    const colunas = stages.map((s) => ({
      id: s.id,
      nome: s.name,
      cards: deals
        .filter((d) => d.stage_id === s.id)
        .map((d) => ({
          id: d.id,
          titulo: d.title,
          org: d.org_id && d.org_id.name ? d.org_id.name : d.org_name || null,
          pessoa: d.person_id && d.person_id.name ? d.person_id.name : d.person_name || null,
          valor: d.value || 0,
          moeda: d.currency || "BRL",
        })),
    }));
    return res.status(200).json({ pipelineId, colunas });
  } catch (e) {
    return res.status(502).json({ erro: "Erro ao ler o Pipedrive", detalhe: String(e) });
  }
}
