import { useEffect, useState } from "react";
import { listarModelos, criarModelo, atualizarModelo, excluirModelo } from "../lib/db.js";

// Editor reutilizavel de modelos de ata (usado na aba Modelos e no atalho da Nova reuniao).
export default function ModelosEditor({ onChange }) {
  const [itens, setItens] = useState(null);
  const [novo, setNovo] = useState({ nome: "", instrucoes: "" });
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");

  async function carregar() {
    const ms = await listarModelos();
    setItens(ms);
    if (onChange) onChange(ms);
  }
  useEffect(() => { carregar().catch((e) => setErro(e.message || "Erro ao carregar")); }, []); // eslint-disable-line

  const setItem = (id, campo, v) => setItens((l) => l.map((x) => (x.id === id ? { ...x, [campo]: v } : x)));

  async function salvar(m) {
    setBusy(true); setErro("");
    try { await atualizarModelo(m.id, { nome: m.nome, instrucoes: m.instrucoes }); await carregar(); }
    catch (e) { setErro(e.message || "Falha ao salvar"); }
    finally { setBusy(false); }
  }
  async function remover(m) {
    if (!window.confirm(`Excluir o modelo "${m.nome}"?`)) return;
    setBusy(true); setErro("");
    try { await excluirModelo(m.id); await carregar(); }
    catch (e) { setErro(e.message || "Falha ao excluir"); }
    finally { setBusy(false); }
  }
  async function adicionar() {
    if (!novo.nome.trim()) return;
    setBusy(true); setErro("");
    try { await criarModelo(novo); setNovo({ nome: "", instrucoes: "" }); await carregar(); }
    catch (e) { setErro(e.message || "Falha ao criar"); }
    finally { setBusy(false); }
  }

  if (!itens) return <div style={{ color: "var(--text3)", fontSize: 13 }}>Carregando…</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {erro && <div style={{ fontSize: 13, color: "var(--danger)" }}>{erro}</div>}
      {itens.map((m) => (
        <div key={m.id} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <input className="input" value={m.nome} onChange={(e) => setItem(m.id, "nome", e.target.value)} placeholder="Nome do tipo" />
          <textarea className="textarea" style={{ minHeight: 90 }} value={m.instrucoes || ""} onChange={(e) => setItem(m.id, "instrucoes", e.target.value)} placeholder="Instruções pra Tess: o foco desse tipo de reunião, o que destacar e extrair." />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn" style={{ color: "var(--danger)", boxShadow: "none" }} onClick={() => remover(m)} disabled={busy}>Excluir</button>
            <button className="btn primary" onClick={() => salvar(m)} disabled={busy}>Salvar</button>
          </div>
        </div>
      ))}

      <div style={{ border: "1px dashed var(--border)", borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="eyebrow">NOVO MODELO</div>
        <input className="input" value={novo.nome} onChange={(e) => setNovo((n) => ({ ...n, nome: e.target.value }))} placeholder="Nome (ex: Negociação, Kickoff, Suporte)" />
        <textarea className="textarea" style={{ minHeight: 80 }} value={novo.instrucoes} onChange={(e) => setNovo((n) => ({ ...n, instrucoes: e.target.value }))} placeholder="Instruções pra Tess" />
        <button className="btn primary" style={{ alignSelf: "flex-start" }} onClick={adicionar} disabled={busy || !novo.nome.trim()}>Adicionar modelo</button>
      </div>
    </div>
  );
}
