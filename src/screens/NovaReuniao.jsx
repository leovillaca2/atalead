import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../components/Icons.jsx";
import { gerarAta } from "../lib/api.js";
import { criarReuniaoCompleta } from "../lib/db.js";
import { extrairTexto } from "../lib/extrair.js";

export default function NovaReuniao() {
  const nav = useNavigate();
  const [titulo, setTitulo] = useState("");
  const [transcricao, setTranscricao] = useState("");
  const [participantes, setParticipantes] = useState([{ nome: "", empresa: "", papel: "" }]);
  const [estado, setEstado] = useState("idle"); // idle | gerando | salvando
  const [erro, setErro] = useState("");
  const [arquivo, setArquivo] = useState("");
  const [lendo, setLendo] = useState(false);

  const setP = (i, campo, v) => setParticipantes((ps) => ps.map((p, k) => (k === i ? { ...p, [campo]: v } : p)));
  const addP = () => setParticipantes((ps) => [...ps, { nome: "", empresa: "", papel: "" }]);
  const rmP = (i) => setParticipantes((ps) => ps.filter((_, k) => k !== i));

  async function onArquivo(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = ""; // permite reanexar o mesmo arquivo
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
    } finally {
      setLendo(false);
    }
  }

  async function gerar() {
    setErro("");
    setEstado("gerando");
    try {
      const r = await gerarAta({ transcricao, participantes });
      const ata = r.ata || { resumo: r.output || "", decisoes: [], proximos_passos: [], produtos: [], lead: {} };
      if (!ata.lead) ata.lead = {};
      // Auto-preenche titulo e participantes se o usuario deixou em branco (a Tess detecta).
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
        <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 2 }}>Anexe um arquivo ou cole o texto e a Tess gera a ata executiva e o lead</div>
      </div>

      <div className="card" style={{ padding: 22, display: "flex", flexDirection: "column", gap: 20 }}>
        <div className="field">
          <label>Título da reunião <span style={{ color: "var(--text3)", fontWeight: 400 }}>(opcional, a Tess preenche)</span></label>
          <input className="input" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Reunião de prospecção — Nome da empresa" />
        </div>

        <div className="field">
          <label>Participantes <span style={{ color: "var(--text3)", fontWeight: 400 }}>(opcional, a Tess identifica)</span></label>
          {participantes.map((p, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input className="input" style={{ flex: 2 }} value={p.nome} onChange={(e) => setP(i, "nome", e.target.value)} placeholder={`Nome (Speaker ${i + 1})`} />
              <input className="input" style={{ flex: 2 }} value={p.empresa} onChange={(e) => setP(i, "empresa", e.target.value)} placeholder="Empresa" />
              <input className="input" style={{ flex: 2 }} value={p.papel} onChange={(e) => setP(i, "papel", e.target.value)} placeholder="Papel" />
              {participantes.length > 1 && <button className="btn ghost icon-btn" title="Remover" onClick={() => rmP(i)}>×</button>}
            </div>
          ))}
          <button className="btn" style={{ boxShadow: "none", alignSelf: "flex-start", color: "var(--primary)" }} onClick={addP}>
            <Icon name="plus" size={14} strokeWidth={2.2} /> Adicionar participante
          </button>
        </div>

        <div className="field">
          <label>Transcrição</label>

          {/* Anexar arquivo (lido no navegador) */}
          <label className="dropzone">
            <input type="file" accept=".pdf,.docx,.txt,text/plain,application/pdf" onChange={onArquivo} hidden />
            <Icon name="upload" size={18} />
            <span>{lendo ? "Lendo arquivo..." : arquivo ? `Anexado: ${arquivo} (clique para trocar)` : "Anexar PDF, Word (.docx) ou TXT"}</span>
          </label>

          <textarea className="textarea" value={transcricao} onChange={(e) => setTranscricao(e.target.value)} placeholder="Ou cole aqui a transcrição / suas notas..." />
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
