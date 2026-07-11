import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../components/Icons.jsx";
import { gerarAta } from "../lib/api.js";
import { criarReuniaoCompleta } from "../lib/db.js";

export default function NovaReuniao() {
  const nav = useNavigate();
  const [titulo, setTitulo] = useState("");
  const [transcricao, setTranscricao] = useState("");
  const [participantes, setParticipantes] = useState([{ nome: "", empresa: "", papel: "" }]);
  const [estado, setEstado] = useState("idle"); // idle | gerando | salvando
  const [erro, setErro] = useState("");

  const setP = (i, campo, v) => setParticipantes((ps) => ps.map((p, k) => (k === i ? { ...p, [campo]: v } : p)));
  const addP = () => setParticipantes((ps) => [...ps, { nome: "", empresa: "", papel: "" }]);
  const rmP = (i) => setParticipantes((ps) => ps.filter((_, k) => k !== i));

  async function gerar() {
    setErro("");
    setEstado("gerando");
    try {
      const r = await gerarAta({ transcricao, participantes });
      // r.ata = JSON estruturado; se a IA nao devolveu JSON, cai no texto cru como resumo.
      const ata = r.ata || { resumo: r.output || "", decisoes: [], proximos_passos: [], produtos: [], lead: { empresa: titulo } };
      if (!ata.lead) ata.lead = { empresa: titulo };
      setEstado("salvando");
      const reuniaoId = await criarReuniaoCompleta({ titulo, participantes, transcricao, ata });
      nav(`/reuniao/${reuniaoId}`);
    } catch (e) {
      setErro(e.message || "Falha ao gerar a ata.");
      setEstado("idle");
    }
  }

  const podeGerar = titulo.trim() && transcricao.trim() && estado === "idle";
  const rotulo = estado === "gerando" ? "Gerando ata com a Tess..." : estado === "salvando" ? "Salvando..." : "Gerar ata com a Tess";

  return (
    <div className="screen" style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 820 }}>
      <div>
        <h1>Nova reunião</h1>
        <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 2 }}>Cole a transcrição e a Tess gera a ata executiva e o lead</div>
      </div>

      <div className="card" style={{ padding: 22, display: "flex", flexDirection: "column", gap: 20 }}>
        <div className="field">
          <label>Título da reunião</label>
          <input className="input" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Reunião de prospecção — Nome da empresa" />
        </div>

        <div className="field">
          <label>Participantes</label>
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
          <textarea className="textarea" value={transcricao} onChange={(e) => setTranscricao(e.target.value)} placeholder="Cole aqui a transcrição copiada do Evernote..." />
          <div style={{ fontSize: 12, color: "var(--text3)" }}>Em breve: puxar direto da nota do Evernote pela API (a chave fica no servidor).</div>
        </div>

        {erro && <div style={{ fontSize: 13, color: "var(--danger)", background: "var(--danger-soft)", padding: "10px 12px", borderRadius: 9 }}>{erro}</div>}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn primary" disabled={!podeGerar} onClick={gerar} style={{ opacity: podeGerar ? 1 : 0.55 }}>
            <Icon name="doc" size={15} /><span>{rotulo}</span>
          </button>
          <button className="btn" disabled title="Disponível quando a chave do Evernote for liberada">
            <Icon name="mic" size={15} /><span>Puxar do Evernote</span>
          </button>
        </div>
      </div>
    </div>
  );
}
