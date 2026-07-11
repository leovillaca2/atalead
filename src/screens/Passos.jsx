import { useState } from "react";
import Icon from "../components/Icons.jsx";
import { tarefasAbertas } from "../lib/mock.js";

const FILTROS = [
  { id: "todos", label: "Todos" },
  { id: "atrasado", label: "Atrasados" },
  { id: "semana", label: "Esta semana" },
];

export default function Passos() {
  const [filtro, setFiltro] = useState("todos");
  const [feitas, setFeitas] = useState({});

  const lista = tarefasAbertas.filter((t) => filtro === "todos" || t.status === filtro);
  const toggle = (id) => setFeitas((f) => ({ ...f, [id]: !f[id] }));

  const pill = (t) =>
    t.status === "atrasado"
      ? { cls: "warn", label: t.prazo }
      : { cls: "muted", label: t.prazo };

  return (
    <div className="screen" style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 900 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1>Próximos passos</h1>
          <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 2 }}>{tarefasAbertas.length} em aberto em todas as reuniões</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {FILTROS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className="btn"
              style={{
                borderRadius: 99,
                boxShadow: "none",
                padding: "7px 14px",
                fontSize: 12.5,
                background: filtro === f.id ? "var(--primary-soft)" : "var(--surface)",
                borderColor: filtro === f.id ? "var(--primary)" : "var(--border)",
                color: filtro === f.id ? "var(--primary)" : "var(--text2)",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        {lista.map((t) => {
          const p = pill(t);
          const done = !!feitas[t.id];
          return (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 18px", borderBottom: "1px solid var(--border)" }}>
              <div className={"chk" + (done ? " on" : "")} onClick={() => toggle(t.id)}>
                {done && <Icon name="check" size={11} strokeWidth={3.4} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: done ? "var(--text3)" : "var(--text)", textDecoration: done ? "line-through" : "none" }}>{t.titulo}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
                  <span className="pill muted" style={{ fontSize: 11.5 }}>{t.prospect}</span>
                  <span style={{ fontSize: 12, color: "var(--text3)" }}>Responsável: {t.resp}</span>
                </div>
              </div>
              <span className={"pill " + p.cls} style={{ fontSize: 12 }}>{p.label}</span>
            </div>
          );
        })}
        {lista.length === 0 && (
          <div style={{ padding: 24, textAlign: "center", color: "var(--text3)", fontSize: 13 }}>Nada por aqui neste filtro.</div>
        )}
      </div>
    </div>
  );
}
