import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../components/Icons.jsx";
// import { gerarAta, buscarNotaEvernote } from "../lib/api.js"; // ligado na Fase 1c (servidor)

export default function NovaReuniao() {
  const nav = useNavigate();
  const [titulo, setTitulo] = useState("");
  const [transcricao, setTranscricao] = useState("");
  const [participantes, setParticipantes] = useState([
    { nome: "", empresa: "", papel: "" },
  ]);
  const [gerando, setGerando] = useState(false);

  const setP = (i, campo, v) =>
    setParticipantes((ps) => ps.map((p, k) => (k === i ? { ...p, [campo]: v } : p)));
  const addP = () => setParticipantes((ps) => [...ps, { nome: "", empresa: "", papel: "" }]);
  const rmP = (i) => setParticipantes((ps) => ps.filter((_, k) => k !== i));

  async function gerar() {
    setGerando(true);
    // Fase 1c: chamada real protegida no servidor ->
    //   const { ata, lead } = await gerarAta({ transcricao, participantes });
    // Por enquanto (Fase 1a) abrimos a reuniao de exemplo pra mostrar o fluxo.
    setTimeout(() => nav("/reuniao/r1"), 400);
  }

  const podeGerar = titulo.trim() && transcricao.trim();

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
              <input className="input" style={{ flex: 2 }} value={p.nome} onChange={(e) => setP(i, "nome", e.target.value)} placeholder="Nome" />
              <input className="input" style={{ flex: 2 }} value={p.empresa} onChange={(e) => setP(i, "empresa", e.target.value)} placeholder="Empresa" />
              <input className="input" style={{ flex: 2 }} value={p.papel} onChange={(e) => setP(i, "papel", e.target.value)} placeholder="Papel" />
              {participantes.length > 1 && (
                <button className="btn ghost icon-btn" title="Remover" onClick={() => rmP(i)}>×</button>
              )}
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

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn primary" disabled={!podeGerar || gerando} onClick={gerar} style={{ opacity: podeGerar && !gerando ? 1 : 0.55 }}>
            <Icon name="doc" size={15} /><span>{gerando ? "Gerando ata..." : "Gerar ata com a Tess"}</span>
          </button>
          <button className="btn" disabled title="Disponível quando a chave do Evernote for liberada">
            <Icon name="mic" size={15} /><span>Puxar do Evernote</span>
          </button>
        </div>
      </div>
    </div>
  );
}
