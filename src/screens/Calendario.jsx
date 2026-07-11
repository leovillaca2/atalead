import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Icon from "../components/Icons.jsx";
import { googleEventos, googleConectarUrl } from "../lib/api.js";

function fmtData(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const temHora = iso.length > 10;
  return d.toLocaleString("pt-BR", {
    weekday: "short", day: "2-digit", month: "short",
    hour: temHora ? "2-digit" : undefined, minute: temHora ? "2-digit" : undefined,
  });
}

export default function Calendario() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [estado, setEstado] = useState("carregando"); // carregando | desconectado | ok
  const [eventos, setEventos] = useState([]);
  const [erro, setErro] = useState(sp.get("erro") ? "Não consegui conectar (" + sp.get("erro") + "). Tente de novo." : "");

  useEffect(() => {
    googleEventos()
      .then((d) => {
        if (!d.conectado) { setEstado("desconectado"); if (d.erro) setErro("Reconecte sua conta Google."); }
        else { setEventos(d.eventos || []); setEstado("ok"); if (d.erro) setErro(d.erro); }
      })
      .catch((e) => { setErro(e.message || "Erro"); setEstado("desconectado"); });
  }, []);

  async function conectar() {
    window.location.href = await googleConectarUrl();
  }

  if (estado === "carregando") return <div className="screen" style={{ color: "var(--text3)" }}>Carregando…</div>;

  return (
    <div className="screen" style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 820 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1>Calendário</h1>
          <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 2 }}>Suas reuniões do Google Calendar</div>
        </div>
        {estado === "ok" && <button className="btn" onClick={conectar} title="Reconectar"><Icon name="calendar" size={15} /><span>Reconectar</span></button>}
      </div>

      {erro && <div style={{ fontSize: 13, color: "var(--danger)", background: "var(--danger-soft)", padding: "10px 12px", borderRadius: 9 }}>{erro}</div>}

      {estado === "desconectado" ? (
        <div className="card" style={{ padding: 28, textAlign: "center", display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--primary-soft)", color: "var(--primary)", display: "grid", placeItems: "center" }}>
            <Icon name="calendar" size={24} />
          </div>
          <div style={{ fontSize: 14.5, color: "var(--text2)", maxWidth: 420 }}>
            Conecte seu Google Calendar pra puxar as reuniões (título, participantes, e-mails, data e hora) e gerar a ata a partir delas.
          </div>
          <button className="btn primary" onClick={conectar}><Icon name="calendar" size={15} /><span>Conectar Google Calendar</span></button>
        </div>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          {eventos.length === 0 && <div style={{ padding: 24, textAlign: "center", color: "var(--text3)", fontSize: 13 }}>Nenhuma reunião nos próximos dias.</div>}
          {eventos.map((ev) => (
            <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 18px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ width: 40, height: 40, borderRadius: 9, background: "var(--surface2)", color: "var(--primary)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <Icon name="calendar" size={17} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ev.titulo}</div>
                <div style={{ fontSize: 12.5, color: "var(--text3)", marginTop: 1 }}>
                  {fmtData(ev.inicio)}{ev.participantes.length ? " · " + ev.participantes.length + " participantes" : ""}
                </div>
              </div>
              <button className="btn" style={{ boxShadow: "none", color: "var(--primary)", flexShrink: 0 }} onClick={() => nav("/nova", { state: { evento: ev } })}>Gerar ata</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
