import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Icon from "../components/Icons.jsx";
import { gerarAta, buscarNegociosPipedrive } from "../lib/api.js";
import { criarReuniaoCompleta } from "../lib/db.js";
import { extrairTexto } from "../lib/extrair.js";

const OWN_DOMAIN = "pgmais.com.br"; // dominio do seu time; outros = lado do lead
// Provedores de e-mail pessoal: nao servem pra deduzir empresa.
const GENERICOS = new Set(["gmail", "hotmail", "outlook", "live", "yahoo", "icloud", "aol", "proton", "protonmail", "msn", "bol", "uol", "terra", "ig", "me", "globo"]);

function empresaDoEmail(email) {
  const dom = (email.split("@")[1] || "").toLowerCase();
  const w = dom.split(".")[0];
  if (!w || GENERICOS.has(w)) return ""; // e-mail pessoal: deixa em branco pra preencher
  return w.charAt(0).toUpperCase() + w.slice(1);
}
function ehTime(email) {
  return !!email && email.toLowerCase().endsWith("@" + OWN_DOMAIN);
}

// Acha os rotulos de falante na transcricao (Speaker 1, Orador 2, Falante 3...).
function detectarSpeakers(texto) {
  const re = /\b(?:speaker|orador|falante|participante)\s*\d+/gi;
  const vistos = new Map();
  let m;
  while ((m = re.exec(texto || ""))) {
    const s = m[0].replace(/\s+/g, " ").trim();
    const k = s.toLowerCase();
    if (!vistos.has(k)) vistos.set(k, s);
  }
  return [...vistos.values()].sort((a, b) => (parseInt(a.replace(/\D/g, "")) || 0) - (parseInt(b.replace(/\D/g, "")) || 0));
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
  const [eventoId, setEventoId] = useState(null);
  const [estado, setEstado] = useState("idle");
  const [erro, setErro] = useState("");
  const [arquivo, setArquivo] = useState("");
  const [lendo, setLendo] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [existentes, setExistentes] = useState(0);
  const [speakers, setSpeakers] = useState([]);
  const [speakerSel, setSpeakerSel] = useState({});

  useEffect(() => {
    const ev = loc.state && loc.state.evento;
    if (!ev) return;
    setDoEvento(true);
    if (ev.id) setEventoId(ev.id);
    if (ev.titulo) setTitulo(ev.titulo);
    const parts = (ev.participantes || []).map((p) => ({ nome: p.nome || "", empresa: p.empresa || "", papel: "", email: p.email || "" }));
    if (parts.length) setParticipantes(parts);
    const leadP = (ev.participantes || []).find((p) => p.email && !ehTime(p.email));
    if (leadP) {
      setLeadEmpresa(empresaDoEmail(leadP.email) || leadP.empresa || "");
      setLeadContato(leadP.nome || "");
    }
  }, []); // eslint-disable-line

  // Guarda contra perda de trabalho: transcricao colada/anexada e ainda nao gerada.
  const dirty = estado === "idle" && transcricao.trim().length > 0;
  useEffect(() => {
    window.__ataleadDirty = dirty;
    const h = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", h);
    return () => { window.removeEventListener("beforeunload", h); window.__ataleadDirty = false; };
  }, [dirty]);
  function voltar() {
    if (dirty && !window.confirm("Você tem uma transcrição que ainda não virou ata. Sair mesmo assim?")) return;
    window.__ataleadDirty = false;
    nav(-1);
  }

  // Barra de progresso: sem progresso real da Tess, avanca desacelerando ate um teto
  // (nunca crava 100% antes de terminar). Reflete as duas fases: gerando e salvando.
  useEffect(() => {
    if (estado === "idle") { setProgresso(0); return; }
    const inicio = Date.now();
    const id = setInterval(() => {
      const t = (Date.now() - inicio) / 1000;
      if (estado === "gerando") setProgresso(92 * (1 - Math.exp(-t / 16)));
      else setProgresso(92 + 7 * (1 - Math.exp(-t / 2))); // salvando: 92 -> ~99
    }, 150);
    return () => clearInterval(id);
  }, [estado]);

  // Detecta os "Speaker N" da transcricao e propoe um mapeamento padrao (por ordem).
  useEffect(() => {
    const s = detectarSpeakers(transcricao);
    setSpeakers(s);
    setSpeakerSel((prev) => {
      const next = { ...prev };
      s.forEach((label) => {
        if (next[label] === undefined) {
          const n = (parseInt(label.replace(/\D/g, "")) || 0) - 1;
          next[label] = n >= 0 && participantes[n] && participantes[n].nome ? String(n) : "";
        }
      });
      return next;
    });
  }, [transcricao, participantes]);

  // Aviso cedo: essa empresa ja tem negocio no Pipedrive? (a decisao real e no envio)
  useEffect(() => {
    const emp = leadEmpresa.trim();
    if (emp.length < 2) { setExistentes(0); return; }
    const t = setTimeout(() => {
      buscarNegociosPipedrive({ empresa: emp }).then((r) => setExistentes((r.negocios || []).length)).catch(() => {});
    }, 600);
    return () => clearTimeout(t);
  }, [leadEmpresa]);

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
      const falantes = speakers.map((label) => {
        const idx = speakerSel[label];
        const p = idx !== "" && idx != null ? participantes[Number(idx)] : null;
        return p && p.nome ? { speaker: label, nome: p.nome, empresa: p.empresa || "", papel: p.papel || "" } : null;
      }).filter(Boolean);
      const r = await gerarAta({ transcricao, participantes, falantes });
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
      const reuniaoId = await criarReuniaoCompleta({ titulo: tituloFinal, participantes: partsFinal, transcricao, ata, googleEventId: eventoId });
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
      <button className="btn" style={{ alignSelf: "flex-start", boxShadow: "none" }} onClick={voltar}>
        <Icon name="arrow" size={15} style={{ transform: "scaleX(-1)" }} /> Voltar
      </button>
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
          {existentes > 0 && (
            <div style={{ fontSize: 12, color: "var(--primary)", background: "var(--primary-soft)", padding: "8px 10px", borderRadius: 8 }}>
              Essa empresa já tem {existentes} negócio{existentes > 1 ? "s" : ""} aberto{existentes > 1 ? "s" : ""} no Pipedrive. Na hora de enviar a ata, você poderá anexar a um deles em vez de criar outro.
            </div>
          )}
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

        {speakers.length > 0 && (
          <div className="field">
            <label>Quem é cada pessoa? <span style={{ color: "var(--text3)", fontWeight: 400 }}>(liga os "Speaker" da transcrição aos participantes)</span></label>
            {speakers.map((label) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text2)", minWidth: 84 }}>{label}</span>
                <Icon name="arrow" size={14} style={{ color: "var(--text3)", flexShrink: 0 }} />
                <select className="input" style={{ flex: 1, cursor: "pointer" }} value={speakerSel[label] ?? ""} onChange={(e) => setSpeakerSel((m) => ({ ...m, [label]: e.target.value }))}>
                  <option value="">Não sei / ignorar</option>
                  {participantes.map((p, i) => (p.nome ? <option key={i} value={String(i)}>{p.nome}{p.empresa ? " (" + p.empresa + ")" : ""}</option> : null))}
                </select>
              </div>
            ))}
            <div style={{ fontSize: 12, color: "var(--text3)" }}>Entrou alguém que não era convidado? Adicione em "Participantes" acima (botão +) que ele aparece aqui.</div>
          </div>
        )}

        {erro && <div style={{ fontSize: 13, color: "var(--danger)", background: "var(--danger-soft)", padding: "10px 12px", borderRadius: 9 }}>{erro}</div>}

        <div>
          <button className="btn primary" disabled={!podeGerar} onClick={gerar} style={{ opacity: podeGerar ? 1 : 0.55 }}>
            {estado === "idle" && <Icon name="doc" size={15} />}<span>{rotulo}</span>
          </button>
          {estado !== "idle" && (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              <div className="pbar"><i style={{ width: progresso + "%" }} /></div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12, color: "var(--text3)" }}>
                <span>{estado === "gerando" ? "A Tess está lendo a transcrição e montando a ata. Não feche a página." : "Salvando a ata e o lead"}</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{Math.round(progresso)}%</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
