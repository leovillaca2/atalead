// FUNÇÃO DE SERVIDOR (só leitura). Metadados do Pipedrive num endpoint só, pra economizar
// funcoes serverless (limite do plano). ?tipo=pipelines|users|stages|labels
import { exigirLogin } from "../server/google.js";

const BASE = "https://api.pipedrive.com/v1";

export default async function handler(req, res) {
  if (!(await exigirLogin(req))) return res.status(401).json({ erro: "não autenticado" });
  const token = process.env.PIPEDRIVE_API_TOKEN;
  if (!token) return res.status(500).json({ erro: "PIPEDRIVE_API_TOKEN não configurado" });

  const tipo = (req.query && req.query.tipo) || "";
  const q = `api_token=${encodeURIComponent(token)}`;

  try {
    if (tipo === "pipelines") {
      const data = (await (await fetch(`${BASE}/pipelines?${q}`)).json()).data || [];
      const funis = data.filter((p) => p.name && !p.name.trim().startsWith("<")).map((p) => ({ id: p.id, nome: p.name.trim() }));
      return res.status(200).json({ funis });
    }
    if (tipo === "users") {
      const data = (await (await fetch(`${BASE}/users?${q}`)).json()).data || [];
      const usuarios = data.filter((u) => u.active_flag).map((u) => ({ id: u.id, nome: u.name })).sort((a, b) => a.nome.localeCompare(b.nome));
      return res.status(200).json({ usuarios });
    }
    if (tipo === "stages") {
      const pipeline = (req.query && req.query.pipeline) || "1";
      const data = (await (await fetch(`${BASE}/stages?pipeline_id=${pipeline}&${q}`)).json()).data || [];
      const etapas = data.sort((a, b) => a.order_nr - b.order_nr).map((s) => ({ id: s.id, nome: s.name }));
      return res.status(200).json({ etapas });
    }
    if (tipo === "negocios") {
      // Negocios ABERTOS da mesma empresa (pra evitar duplicar na hora de criar).
      const empresa = ((req.query && req.query.empresa) || "").trim();
      if (empresa.length < 2) return res.status(200).json({ negocios: [] });
      const busca = await (await fetch(`${BASE}/organizations/search?term=${encodeURIComponent(empresa)}&${q}`)).json();
      const orgs = (((busca.data && busca.data.items) || []).map((i) => i.item).filter(Boolean)).slice(0, 5);
      const vistos = new Set();
      const negocios = [];
      for (const o of orgs) {
        const ds = ((await (await fetch(`${BASE}/organizations/${o.id}/deals?status=open&${q}`)).json()).data) || [];
        for (const d of ds) {
          if (vistos.has(d.id)) continue;
          vistos.add(d.id);
          negocios.push({
            id: d.id,
            titulo: d.title,
            org: (d.org_id && d.org_id.name) || o.name || null,
            contato: (d.person_id && d.person_id.name) || null,
            dono: (d.user_id && d.user_id.name) || null,
            valor: d.value || 0,
            atualizado: (d.update_time || "").slice(0, 10),
          });
        }
        if (negocios.length >= 10) break;
      }
      return res.status(200).json({ negocios: negocios.slice(0, 10) });
    }
    if (tipo === "segmentos") {
      // Procura um campo (de negocio ou organizacao) que represente segmento/setor e devolve as opcoes.
      const alvo = /segment|setor|ind[uú]str|vertical|ramo|nicho/i;
      const coletar = async (url) => {
        const campos = (await (await fetch(url)).json()).data || [];
        const c = campos.find((f) => f.options && f.options.length && (alvo.test(f.name || "") || alvo.test(f.key || "")));
        return c ? c.options.map((o) => o.label) : null;
      };
      let segmentos = await coletar(`${BASE}/dealFields?${q}`);
      if (!segmentos) segmentos = await coletar(`${BASE}/organizationFields?${q}`);
      return res.status(200).json({ segmentos: segmentos || [] });
    }
    if (tipo === "labels") {
      // O "termometro" do lead no Pipedrive e o campo Label do negocio (ex.: Quente/Morno/Frio).
      const campos = (await (await fetch(`${BASE}/dealFields?${q}`)).json()).data || [];
      const campo = campos.find((c) => c.key === "label");
      const labels = ((campo && campo.options) || []).map((o) => ({ id: o.id, nome: o.label, cor: o.color || null }));
      return res.status(200).json({ labels });
    }
    return res.status(400).json({ erro: "tipo inválido" });
  } catch (e) {
    return res.status(502).json({ erro: "Erro ao ler metadados do Pipedrive", detalhe: String(e) });
  }
}
