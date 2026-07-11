import { useEffect, useState } from "react";
import Icon from "../components/Icons.jsx";
import { listarPassosAbertos, togglePasso } from "../lib/db.js";

export default function Passos() {
  const [passos, setPassos] = useState(null);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    listarPassosAbertos().then(setPassos).catch((e) => setErro(e.message || "Erro ao carregar"));
  }, []);

  async function concluir(p) {
    setAviso("");
    setPassos((ps) => ps.filter((x) => x.id !== p.id));
    try { await togglePasso(p.id, true); }
    catch {
      setPassos((ps) => [p, ...ps]); // desfaz: devolve o passo à lista
      setAviso("Não consegui concluir esse passo. Tente de novo.");
    }
  }

  if (erro) return <div className="screen" style={{ color: "var(--danger)" }}>{erro}</div>;
  if (!passos) return <div className="screen" style={{ color: "var(--text3)" }}>Carregando…</div>;

  return (
    <div className="screen" style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 900 }}>
      <div>
        <h1>Próximos passos</h1>
        <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 2 }}>{passos.length} em aberto em todas as reuniões</div>
      </div>

      {aviso && <div style={{ fontSize: 13, color: "var(--danger)", background: "var(--danger-soft)", padding: "10px 12px", borderRadius: 9 }}>{aviso}</div>}

      <div className="card" style={{ overflow: "hidden" }}>
        {passos.length === 0 && <div style={{ padding: 24, textAlign: "center", color: "var(--text3)", fontSize: 13 }}>Nada em aberto.</div>}
        {passos.map((t) => (
          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 18px", borderBottom: "1px solid var(--border)" }}>
            <div className="chk" onClick={() => concluir(t)} title="Marcar como feito" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{t.titulo}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
                <span className="pill muted" style={{ fontSize: 11.5 }}>{t.prospects?.empresa || "—"}</span>
                {t.responsavel && <span style={{ fontSize: 12, color: "var(--text3)" }}>Responsável: {t.responsavel}</span>}
              </div>
            </div>
            {t.prazo && <span className="pill muted" style={{ fontSize: 12 }}>{t.prazo}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
