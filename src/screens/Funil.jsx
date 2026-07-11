import { useNavigate } from "react-router-dom";
import { colunas, tarefasAbertas } from "../lib/mock.js";

export default function Funil() {
  const nav = useNavigate();
  const total = colunas.reduce((n, c) => n + c.cards.length, 0);
  return (
    <div className="screen" style={{ display: "flex", gap: 22, alignItems: "flex-start" }}>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <h1>Funil</h1>
          <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 2 }}>{total} prospects ativos</div>
        </div>
        <div className="kanban">
          {colunas.map((col) => (
            <div className="kcol" key={col.nome}>
              <div className="kcol-head">
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: col.cor, flexShrink: 0 }} />
                <span>{col.nome}</span>
                <span className="cnt">{col.cards.length}</span>
              </div>
              {col.cards.map((c) => (
                <div className="kcard" key={c.id} onClick={() => nav(c.id === "r1" ? "/reuniao/r1" : "/reuniao/r1")}>
                  <div className="emp">{c.empresa}</div>
                  <div className="cont">{c.contato}</div>
                  <div className="row">
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{c.valor}</span>
                    <span style={{ fontSize: 11.5, color: "var(--text3)" }}>reunião {c.ultima}</span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <aside className="card" style={{ width: 300, flexShrink: 0, position: "sticky", top: 76 }}>
        <div className="card-head" style={{ padding: "13px 16px" }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>Próximos passos em aberto</span>
          <span className="pill warn" style={{ fontSize: 11.5 }}>{tarefasAbertas.length}</span>
        </div>
        <div style={{ padding: "4px 16px" }}>
          {tarefasAbertas.map((t) => (
            <div key={t.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "11px 0", borderBottom: "1px solid var(--border)" }}>
              <div className="chk" style={{ width: 16, height: 16 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.35 }}>{t.titulo}</div>
                <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 1 }}>{t.prospect} · {t.prazo}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: "10px 16px 14px" }}>
          <button className="btn block" style={{ boxShadow: "none", color: "var(--primary)" }} onClick={() => nav("/passos")}>Ver todos os próximos passos</button>
        </div>
      </aside>
    </div>
  );
}
