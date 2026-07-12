import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Icon from "../components/Icons.jsx";
import Modal from "../components/Modal.jsx";
import { googleEventos, googleConectarUrl, criarEventoGoogle, excluirEventoGoogle } from "../lib/api.js";

function fmtData(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const temHora = iso.length > 10;
  return d.toLocaleString("pt-BR", {
    weekday: "short", day: "2-digit", month: "short",
    hour: temHora ? "2-digit" : undefined, minute: temHora ? "2-digit" : undefined,
  });
}

const STATUS = {
  accepted: { cor: "#15803D", label: "confirmou" },
  declined: { cor: "#B4231C", label: "recusou" },
  tentative: { cor: "#B45309", label: "talvez" },
  needsAction: { cor: "#7E9196", label: "aguardando" },
};

function pad(n) { return String(n).padStart(2, "0"); }
function localMaisMin(localStr, min) {
  const d = new Date(localStr);
  d.setMinutes(d.getMinutes() + Number(min));
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

export default function Calendario() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [estado, setEstado] = useState("carregando");
  const [eventos, setEventos] = useState([]);
  const [erro, setErro] = useState(sp.get("erro") ? "Não consegui conectar (" + sp.get("erro") + "). Tente de novo." : "");

  const [form, setForm] = useState(false);
  const [fTitulo, setFTitulo] = useState("");
  const [fData, setFData] = useState("");
  const [fDur, setFDur] = useState("30");
  const [fPart, setFPart] = useState("");
  const [fLocal, setFLocal] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState("");
  const [paraCancelar, setParaCancelar] = useState(null);
  const [cancelando, setCancelando] = useState(false);
  const [expandido, setExpandido] = useState(null);

  function carregar() {
    return googleEventos()
      .then((d) => {
        if (!d.conectado) { setEstado("desconectado"); if (d.erro) setErro("Reconecte sua conta Google."); }
        else { setEventos(d.eventos || []); setEstado("ok"); }
      })
      .catch((e) => { setErro(e.message || "Erro"); setEstado("desconectado"); });
  }
  useEffect(() => { carregar(); }, []);

  async function conectar() { window.location.href = await googleConectarUrl(); }

  async function agendar() {
    setErroForm("");
    if (!fTitulo.trim() || !fData) { setErroForm("Preencha título e início."); return; }
    setSalvando(true);
    try {
      const participantes = fPart.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
      await criarEventoGoogle({
        titulo: fTitulo,
        inicio: fData + ":00",
        fim: localMaisMin(fData, fDur),
        participantes,
        local: fLocal || undefined,
      });
      setForm(false);
      setFTitulo(""); setFData(""); setFDur("30"); setFPart(""); setFLocal("");
      await carregar();
    } catch (e) {
      setErroForm(e.message || "Falha ao agendar.");
    } finally { setSalvando(false); }
  }

  async function cancelarEvento() {
    if (!paraCancelar) return;
    setCancelando(true);
    try {
      await excluirEventoGoogle(paraCancelar.id);
      setParaCancelar(null);
      await carregar();
    } catch (e) {
      setErro(e.message || "Falha ao cancelar.");
      setParaCancelar(null);
    } finally { setCancelando(false); }
  }

  if (estado === "carregando") return <div className="screen" style={{ color: "var(--text3)" }}>Carregando…</div>;

  return (
    <div className="screen" style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 820 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1>Calendário</h1>
          <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 2 }}>Suas reuniões do Google Calendar</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {estado === "ok" && <button className="btn primary" onClick={() => setForm(true)}><Icon name="plus" size={15} strokeWidth={2.2} /><span>Agendar reunião</span></button>}
          {estado === "ok" && <button className="btn" onClick={conectar} title="Reconectar"><Icon name="calendar" size={15} /></button>}
        </div>
      </div>

      {erro && <div style={{ fontSize: 13, color: "var(--danger)", background: "var(--danger-soft)", padding: "10px 12px", borderRadius: 9 }}>{erro}</div>}

      {estado === "desconectado" ? (
        <div className="card" style={{ padding: 28, textAlign: "center", display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--primary-soft)", color: "var(--primary)", display: "grid", placeItems: "center" }}>
            <Icon name="calendar" size={24} />
          </div>
          <div style={{ fontSize: 14.5, color: "var(--text2)", maxWidth: 420 }}>
            Conecte seu Google Calendar pra ver e agendar reuniões aqui, e gerar a ata a partir delas.
          </div>
          <button className="btn primary" onClick={conectar}><Icon name="calendar" size={15} /><span>Conectar Google Calendar</span></button>
        </div>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          {eventos.length === 0 && <div style={{ padding: 24, textAlign: "center", color: "var(--text3)", fontSize: 13 }}>Nenhuma reunião nos próximos dias. Clique em "Agendar reunião" pra criar uma.</div>}
          {eventos.map((ev) => {
            const aberto = expandido === ev.id;
            return (
              <div key={ev.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 18px" }}>
                  <div onClick={() => setExpandido(aberto ? null : ev.id)} style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0, cursor: "pointer" }}>
                    <div style={{ width: 40, height: 40, borderRadius: 9, background: "var(--surface2)", color: "var(--primary)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                      <Icon name="calendar" size={17} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ev.titulo}</div>
                      <div style={{ fontSize: 12.5, color: "var(--text3)", marginTop: 1 }}>
                        {fmtData(ev.inicio)}{ev.participantes.length ? " · " + ev.participantes.length + " convidado" + (ev.participantes.length > 1 ? "s" : "") : ""}
                      </div>
                    </div>
                    <Icon name="arrow" size={15} style={{ color: "var(--text3)", flexShrink: 0, transform: aberto ? "rotate(90deg)" : "none", transition: "transform .15s" }} />
                  </div>
                  <button className="btn ghost icon-btn" title="Cancelar reunião" style={{ color: "var(--danger)", flexShrink: 0 }} onClick={() => setParaCancelar(ev)}><Icon name="trash" size={15} /></button>
                  <button className="btn" style={{ boxShadow: "none", color: "var(--primary)", flexShrink: 0 }} onClick={() => nav("/nova", { state: { evento: ev } })}>Gerar ata</button>
                </div>

                {aberto && (
                  <div style={{ padding: "0 18px 16px 72px", display: "flex", flexDirection: "column", gap: 14 }}>
                    {(ev.link || ev.htmlLink) && (
                      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
                        {ev.link && <a href={ev.link} target="_blank" rel="noreferrer" className="btn primary" style={{ padding: "7px 12px", textDecoration: "none" }}><Icon name="mic" size={14} /><span>Entrar na reunião</span></a>}
                        {ev.htmlLink && <a href={ev.htmlLink} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: "var(--primary)" }}>Abrir no Google Calendar</a>}
                      </div>
                    )}
                    {ev.local && <div style={{ fontSize: 13, color: "var(--text2)", wordBreak: "break-word" }}><span style={{ color: "var(--text3)" }}>Local:</span> {ev.local}</div>}
                    <div>
                      <div className="eyebrow">CONVIDADOS ({ev.participantes.length})</div>
                      {ev.participantes.length ? ev.participantes.map((p, i) => {
                        const st = STATUS[p.status] || STATUS.needsAction;
                        return (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0", fontSize: 13, color: "var(--text2)" }}>
                            <span title={st.label} style={{ width: 9, height: 9, borderRadius: "50%", background: st.cor, flexShrink: 0 }} />
                            <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.email || p.nome}</span>
                            <span style={{ fontSize: 11.5, color: "var(--text3)", flexShrink: 0 }}>{p.organizador ? "organizador" : st.label}</span>
                          </div>
                        );
                      }) : <div style={{ fontSize: 13, color: "var(--text3)" }}>Sem convidados.</div>}
                    </div>
                    {ev.descricao && (
                      <div>
                        <div className="eyebrow">DESCRIÇÃO</div>
                        <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{ev.descricao}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={form}
        title="Agendar reunião"
        onClose={() => setForm(false)}
        footer={<>
          <button className="btn" onClick={() => setForm(false)}>Cancelar</button>
          <button className="btn primary" onClick={agendar} disabled={salvando}>{salvando ? "Agendando..." : "Agendar no Google"}</button>
        </>}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="field"><label>Título</label><input className="input" value={fTitulo} onChange={(e) => setFTitulo(e.target.value)} placeholder="Reunião de prospecção — Empresa" /></div>
          <div style={{ display: "flex", gap: 10 }}>
            <div className="field" style={{ flex: 2 }}><label>Início</label><input className="input" type="datetime-local" value={fData} onChange={(e) => setFData(e.target.value)} /></div>
            <div className="field" style={{ flex: 1 }}><label>Duração</label>
              <select className="input" value={fDur} onChange={(e) => setFDur(e.target.value)}>
                <option value="30">30 min</option><option value="45">45 min</option><option value="60">1 hora</option><option value="90">1h30</option>
              </select>
            </div>
          </div>
          <div className="field"><label>Participantes (e-mails, separados por vírgula)</label><textarea className="textarea" style={{ minHeight: 70 }} value={fPart} onChange={(e) => setFPart(e.target.value)} placeholder="fulano@empresa.com, ciclano@empresa.com" /></div>
          <div className="field"><label>Local / link (opcional)</label><input className="input" value={fLocal} onChange={(e) => setFLocal(e.target.value)} placeholder="Google Meet, sala, endereço..." /></div>
          {erroForm && <div style={{ fontSize: 13, color: "var(--danger)" }}>{erroForm}</div>}
        </div>
      </Modal>

      <Modal
        open={!!paraCancelar}
        tone="warn"
        title="Cancelar esta reunião?"
        onClose={() => setParaCancelar(null)}
        footer={<>
          <button className="btn" onClick={() => setParaCancelar(null)}>Voltar</button>
          <button className="btn primary" style={{ background: "var(--danger)", borderColor: "var(--danger)" }} onClick={cancelarEvento} disabled={cancelando}>{cancelando ? "Cancelando..." : "Cancelar reunião"}</button>
        </>}
      >
        <p>Isso apaga "{paraCancelar?.titulo}" do Google Calendar e envia um aviso de cancelamento aos participantes. Não dá pra desfazer.</p>
      </Modal>
    </div>
  );
}
