import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Icon from "../components/Icons.jsx";
import { gerarAta } from "../lib/api.js";
import { criarReuniaoCompleta } from "../lib/db.js";
import { extrairTexto } from "../lib/extrair.js";

const OWN_DOMAIN = "pgmais.com.br"; // dominio do seu time; outros = lado do lead

function empresaDoEmail(email) {
  const dom = (email.split("@")[1] || "").toLowerCase();
  const w = dom.split(".")[0];
  return w ? w.charAt(0).toUpperCase() + w.slice(1) : "";
}
function ehTime(email) {
  return !!email && email.toLowerCase().endsWith("@" + OWN_DOMAIN);
}

export default function NovaReuniao() {
  const nav = useNavigate();
  const loc = useLocation();
  const [titulo, setTitulo] = useState("");
  const [transcricao, setTranscricao] = useState("");
  const [participantes, setParticipantes] = useState([{ nome: "", empresa: "", papel: "", email: "" }]);
  const [leadEmpresa, setLeadEmpresa] = useState("");
  const [leadContato, setLeadContato] = useState("");
  const [doEvento, setDoEvento] = useState(false);
  const [estado, setEstado] = useState("idle");
  const [erro, setErro] = useState("");
  const [arquivo, setArquivo] = useState("");
  const [lendo, setLendo] = useState(false);

  useEffect(() => {
    const ev = loc.state && loc.state.evento;
    if (!ev) return;
    setDoEvento(true);
    if (ev.titulo) setTitulo(ev.titulo);
    const parts = (ev.participantes || []).map((p) => ({ nome: p.nome || "", empresa: p.empresa || "", papel: "", email: p.email || "" }));
    if (parts.length) setParticipantes(parts);
    const leadP = (ev.participantes || []).find((p) => p.email && !ehTime(p.email));
    if (leadP) {
      setLeadEmpresa(empresaDoEmail(leadP.email) || leadP.empresa || "");
      setLeadContato(leadP.nome || "");
    }
  }, []); // eslint-disable-line

  const setP = (i, campo, v) => setParticipantes((ps) => ps.map((p, k) => (k === i ? { ...p, [campo]: v } : p)));
  const addP = () => setParticipantes((ps) => [...ps, { nome: "", empresa: "", papel: "", email: "" }]);
  const rmP = (i) => setParticipantes((ps) => ps.filter((_, k) => k !== i));

  async function onArquivo(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setErro(""); setLendo(true);
    try {
      const texto = await extrairTexto(file);
      if (!texto) throw new Error("Não consegui ler texto desse arquivo.");
      setTranscricao((prev) => (prev.trim() ? prev.trim() + "\n\n" + texto : texto));
      setArquivo(file.name);
      if (!titulo.trim()) setTitulo(file.name.replace(/\.[^.]+$/, ""));
    } catch (err) {
      setErro(err.message || "Falha ao ler o arquivo.");
    } finally { setLendo(false); }
  }

  async function gerar() {
    setErro("");
    setEstado("gerando");
    try {
      const r = await gerarAta({ transcricao, participantes });
      const ata = r.ata || { resumo: r.output || "", decisoes: [], proximos_passos: [], produtos: [], lead: {} };
      if (!ata.lead) ata.lead = {};
      // Empresa/contato do lead vem do calendario (confiavel); Tess preenche o resto.
      if (leadEmpresa) ata.lead.empresa = leadEmpresa;
      if (leadContato) ata.lead.contato = leadContato;
      const empresa = ata.lead.empresa || "";
      const tituloFinal = titulo.trim() || ata.titulo || (empresa ? `Reunião de prospecção — ${empresa}` : "Nova reunião");
      if (!ata.lead.empresa) ata.lead.empresa = tituloFinal;
      const temParts = participantes.some((p) => p.nome && p.nome.trim());
      const partsFinal = temParts ? participantes : (Array.isArray(ata.participantes) && ata.participantes.length ? ata.participantes : participantes);
      setEstado("salvando");
      const reuniaoId = await criarReuniaoCompleta({ titulo: tituloFinal, participantes: partsFinal, transcricao, ata });
      nav(`/reuniao/${reuniaoId}`);
    } catch (e) {
      setErro(e.message || "Falha ao gerar a ata.");
      setEstado("idle");
    }
  }

  const podeGerar = transcricao.trim() && estado === "idle";
  const rotulo = estado === "gerando" ? "Gerando ata com a Tess..." : estado === "salvando" ? "Salvando..." : "Gerar ata com a Tess";

  return (
    <div className="screen" style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 820 }}>
      <div>
        <h1>Nova reunião</h1>
        <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 2 }}>
          {doEvento ? "Dados vindos do calendário. Cole a transcrição e a Tess gera a ata." : "Anexe um arquivo ou cole o texto e a Tess gera a ata e o lead."}
        </div>
      </div>

      <div className="card" style={{ padding: 22, display: "flex", flexDirection: "column", gap: 20 }}>
        <div className="field">
          <label>Título da reunião <span style={{ color: "var(--text3)", fontWeight: 400 }}>(opcional, a Tess preenche)</span></label>
          <input className="input" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Reunião de prospecção — Nome da empresa" />
        </div>

        {/* Lead que vai pro Pipedrive (deduzido do calendário) */}
        <div className="field">
          <label>Lead <span style={{ color: "var(--text3)", fontWeight: 400 }}>(vai pro Pipedrive)</span></label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input className="input" style={{ flex: 1, minWidth: 180 }} value={leadEmpresa} onChange={(e) => setLeadEmpresa(e.target.value)} placeholder="Empresa do lead" />
            <input className="input" style={{ flex: 1, minWidth: 180 }} value={leadContato} onChange={(e) => setLeadContato(e.target.value)} placeholder="Contato (pessoa)" />
          </div>
          {doEvento && <div style={{ fontSize: 12, color: "var(--text3)" }}>Deduzido dos convidados de fora da PGMais. Ajuste se precisar.</div>}
        </div>

        <div className="field">
          <label>Participantes <span style={{ color: "var(--text3)", fontWeight: 400 }}>(a Tess usa pra identificar quem falou)</span></label>
          {participantes.map((p, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input className="input" style={{ flex: 2 }} value={p.nome} onChange={(e) => setP(i, "nome", e.target.value)} placeholder={`Nome (Speaker ${i + 1})`} />
              <input className="input" style={{ flex: 2 }} value={p.empresa} onChange={(e) => setP(i, "empresa", e.target.value)} placeholder="Empresa" />
              {p.email
                ? <span className="pill" style={{ fontSize: 11, flexShrink: 0, background: ehTime(p.email) ? "var(--surface2)" : "var(--primary-soft)", color: ehTime(p.email) ? "var(--text2)" : "var(--primary)" }}>{ehTime(p.email) ? "time" : "lead"}</span>
                : <input className="input" style={{ flex: 1.5 }} value={p.papel} onChange={(e) => setP(i, "papel", e.target.value)} placeholder="Papel" />}
              {participantes.length > 1 && <button className="btn ghost icon-btn" title="Remover" onClick={() => rmP(i)}>×</button>}
            </div>
          ))}
          <button className="btn" style={{ boxShadow: "none", alignSelf: "flex-start", color: "var(--primary)" }} onClick={addP}>
            <Icon name="plus" size={14} strokeWidth={2.2} /> Adicionar participante
          </button>
        </div>

        <div className="field">
          <label>Transcrição</label>
          <label className="dropzone">
            <input type="file" accept=".pdf,.docx,.txt,text/plain,application/pdf" onChange={onArquivo} hidden />
            <Icon name="upload" size={18} />
            <span>{lendo ? "Lendo arquivo..." : arquivo ? `Anexado: ${arquivo} (clique para trocar)` : "Anexar PDF, Word (.docx) ou TXT"}</span>
          </label>
          <textarea className="textarea" value={transcricao} onChange={(e) => setTranscricao(e.target.value)} placeholder="Ou cole aqui a transcrição / suas notas (do Evernote)..." />
          <div style={{ fontSize: 12, color: "var(--text3)" }}>O arquivo é lido aqui no seu navegador. Só o texto vai pra Tess.</div>
        </div>

        {erro && <div style={{ fontSize: 13, color: "var(--danger)", background: "var(--danger-soft)", padding: "10px 12px", borderRadius: 9 }}>{erro}</div>}

        <div>
          <button className="btn primary" disabled={!podeGerar} onClick={gerar} style={{ opacity: podeGerar ? 1 : 0.55 }}>
            <Icon name="doc" size={15} /><span>{rotulo}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
