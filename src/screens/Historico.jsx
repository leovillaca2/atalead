import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../components/Icons.jsx";
import { listarReunioes, fmtValor } from "../lib/db.js";

function Stat({ label, valor }) {
  return (
    <div className="card" style={{ flex: 1, minWidth: 150, padding: "14px 16px", boxShadow: "var(--shadow)" }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--text3)", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 23, fontWeight: 700, letterSpacing: "-0.02em", marginTop: 4 }}>{valor}</div>
    </div>
  );
}

export default function Historico() {
  const nav = useNavigate();
  const [todas, setTodas] = useState(null);
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    listarReunioes().then(setTodas).catch((e) => setErro(e.message || "Erro"));
  }, []);

  if (erro) return <div className="screen" style={{ color: "var(--danger)" }}>{erro}</div>;
  if (!todas) return <div className="screen" style={{ color: "var(--text3)" }}>Carregando…</div>;

  const now = new Date();
  const noMes = todas.filter((r) => {
    const d = new Date(r.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const valorTotal = todas.reduce((s, r) => s + ((r.prospects && r.prospects.valor_estimado) || 0), 0);

  const b = busca.trim().toLowerCase();
  const lista = b
    ? todas.filter((r) => (r.titulo || "").toLowerCase().includes(b) || (r.prospects && r.prospects.empresa || "").toLowerCase().includes(b))
    : todas;

  return (
    <div className="screen" style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 900 }}>
      <div>
        <h1>Reuniões</h1>
        <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 2 }}>Histórico de atas geradas</div>
      </div>

      {/* Mini painel (#9) */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Stat label="Reuniões no mês" valor={noMes} />
        <Stat label="Total de reuniões" valor={todas.length} />
        <Stat label="Valor estimado" valor={fmtValor(valorTotal)} />
      </div>

      <input className="input" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por empresa ou título..." />

      <div className="card" style={{ overflow: "hidden" }}>
        {lista.length === 0 && <div style={{ padding: 24, textAlign: "center", color: "var(--text3)", fontSize: 13 }}>Nenhuma reunião encontrada.</div>}
        {lista.map((r) => (
          <div key={r.id} onClick={() => nav(`/reuniao/${r.id}`)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 18px", borderBottom: "1px solid var(--border)", cursor: "pointer" }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: "var(--primary-soft)", color: "var(--primary)", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <Icon name="doc" size={16} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.titulo}</div>
              <div style={{ fontSize: 12.5, color: "var(--text3)", marginTop: 1 }}>
                {(r.prospects && r.prospects.empresa) || "—"}{r.data ? " · " + r.data : ""}
              </div>
            </div>
            {r.prospects && r.prospects.valor_estimado > 0 && (
              <span style={{ fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{fmtValor(r.prospects.valor_estimado)}</span>
            )}
            <Icon name="arrow" size={15} style={{ color: "var(--text3)", flexShrink: 0 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
