import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import Icon from "../components/Icons.jsx";
import { dealPipedrive, adicionarNotaPipedrive, labelsPipedrive, setLabelPipedrive, concluirAtividadePipedrive, novaAtividadePipedrive } from "../lib/api.js";
import { fmtValor } from "../lib/db.js";

const fmtData = (s) => (s && s.length >= 10 ? s.slice(8, 10) + "/" + s.slice(5, 7) + "/" + s.slice(0, 4) : s || "");
const CORES = { green: "#15803D", red: "#B4231C", yellow: "#B45309", purple: "#7C3AED", blue: "#1D5FD1", gray: "#7E9196", "dark-gray": "#4B5563", orange: "#C2410C", pink: "#DB2777", "light-blue": "#0EA5E9" };

export default function Negocio() {
  const { id } = useParams();
  const nav = useNavigate();
  const loc = useLocation();
  const etapa = loc.state && loc.state.etapa;
  const [d, setD] = useState(null);
  const [erro, setErro] = useState("");

  const [novaNota, setNovaNota] = useState("");
  const [salvandoNota, setSalvandoNota] = useState(false);
  const [msgNota, setMsgNota] = useState("");

  const [labels, setLabels] = useState([]);
  const [tempSel, setTempSel] = useState("");
  const [salvandoTemp, setSalvandoTemp] = useState(false);
  const [msgTemp, setMsgTemp] = useState("");

  const [ativBusy, setAtivBusy] = useState(false);
  const [msgAtiv, setMsgAtiv] = useState("");
  const [novoAtiv, setNovoAtiv] = useState("");
  const [novoAtivData, setNovoAtivData] = useState("");

  useEffect(() => {
    dealPipedrive(id).then((x) => { setD(x); setTempSel(x.label != null ? String(x.label) : ""); }).catch((e) => setErro(e.message || "Erro"));
    labelsPipedrive().then((r) => setLabels(r.labels || [])).catch(() => {});
  }, [id]);

  async function mudarTemp(v) {
    const anterior = tempSel;
    setTempSel(v); setSalvandoTemp(true); setMsgTemp("");
    try {
      const r = await setLabelPipedrive({ dealId: id, labelId: v || null });
      setMsgTemp(r.simulado ? "Modo seguro: não gravou" : "Atualizado no Pipedrive");
    } catch (e) {
      setTempSel(anterior); setMsgTemp(e.message || "Falha ao mudar");
    } finally { setSalvandoTemp(false); }
  }

  async function addNota() {
    if (!novaNota.trim()) return;
    setSalvandoNota(true); setMsgNota("");
    try {
      const r = await adicionarNotaPipedrive({ dealId: id, conteudo: novaNota });
      if (r.simulado) { setMsgNota("Modo seguro: não gravou"); return; }
      setNovaNota("");
      setMsgNota("Nota adicionada no Pipedrive");
      const novo = await dealPipedrive(id); // refresca pra mostrar a nota nova
      setD(novo);
    } catch (e) {
      setMsgNota(e.message || "Falha ao adicionar a nota");
    } finally {
      setSalvandoNota(false);
    }
  }

  async function concluirAtiv(a) {
    if (!a.id) return;
    setAtivBusy(true); setMsgAtiv("");
    try {
      const r = await concluirAtividadePipedrive({ dealId: id, activityId: a.id, feito: true });
      if (r.simulado) { setMsgAtiv("Modo seguro: não gravou"); return; }
      setD(await dealPipedrive(id));
    } catch (e) { setMsgAtiv(e.message || "Falha ao concluir"); }
    finally { setAtivBusy(false); }
  }

  async function addAtiv() {
    if (!novoAtiv.trim()) return;
    setAtivBusy(true); setMsgAtiv("");
    try {
      const r = await novaAtividadePipedrive({ dealId: id, assunto: novoAtiv, vencimento: novoAtivData || null });
      if (r.simulado) { setMsgAtiv("Modo seguro: não gravou"); return; }
      setNovoAtiv(""); setNovoAtivData("");
      setD(await dealPipedrive(id));
      setMsgAtiv("Atividade adicionada no Pipedrive");
    } catch (e) { setMsgAtiv(e.message || "Falha ao adicionar"); }
    finally { setAtivBusy(false); }
  }

  const linhaAtiv = (a, i, atrasada) => (
    <div key={a.id || i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, color: "var(--text2)", padding: "5px 0", borderTop: i > 0 ? "1px solid var(--border)" : "none" }}>
      <button className="chk" title="Marcar como concluída" onClick={() => concluirAtiv(a)} disabled={ativBusy || !a.id} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, minWidth: 0 }}>{a.assunto}</span>
      {a.vencimento && <span style={{ fontSize: 12, whiteSpace: "nowrap", color: atrasada ? "var(--danger)" : "var(--text3)" }}>{fmtData(a.vencimento)}</span>}
    </div>
  );

  const totalAbertas = d ? d.proximasTotal + d.atrasadasTotal : 0;

  return (
    <div className="screen" style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 1000 }}>
      <button className="btn" style={{ alignSelf: "flex-start", boxShadow: "none" }} onClick={() => nav("/funil")}>
        <Icon name="arrow" size={15} style={{ transform: "scaleX(-1)" }} /> Voltar ao funil
      </button>

      {erro && <div style={{ color: "var(--danger)" }}>{erro}</div>}
      {!erro && !d && <div style={{ color: "var(--text3)" }}>Carregando…</div>}

      {d && (
        <>
          <div className="mhead-top">
            <h1 style={{ fontSize: 25 }}>{d.titulo}</h1>
            {etapa && <span className="pill primary">{etapa}</span>}
          </div>

          <div className="cols">
            <div className="col-main card">
              <div className="card-head"><div className="card-title"><Icon name="target" size={16} /><span>Dados do lead</span></div></div>
              <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {labels.length > 0 && (
                  <div className="kv" style={{ alignItems: "center" }}>
                    <span className="k">Temperatura</span>
                    <span className="v" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      {(() => { const l = labels.find((x) => String(x.id) === tempSel); const c = l && l.cor ? (CORES[l.cor] || null) : null; return c ? <span style={{ width: 10, height: 10, borderRadius: "50%", background: c, flexShrink: 0 }} /> : null; })()}
                      <select className="input" style={{ padding: "6px 10px", cursor: "pointer", width: "auto" }} value={tempSel} onChange={(e) => mudarTemp(e.target.value)} disabled={salvandoTemp}>
                        <option value="">Sem temperatura</option>
                        {labels.map((l) => <option key={l.id} value={String(l.id)}>{l.nome}</option>)}
                      </select>
                      {msgTemp && <span style={{ fontSize: 11.5, color: msgTemp.startsWith("Atualizado") ? "var(--ok)" : "var(--text3)" }}>{msgTemp}</span>}
                    </span>
                  </div>
                )}
                {d.org && <div className="kv"><span className="k">Empresa</span><span className="v">{d.org}</span></div>}
                {d.pessoa?.nome && <div className="kv"><span className="k">Contato</span><span className="v">{d.pessoa.nome}</span></div>}
                {d.pessoa?.email && <div className="kv"><span className="k">E-mail</span><span className="v">{d.pessoa.email}</span></div>}
                {d.pessoa?.telefone && <div className="kv"><span className="k">Telefone</span><span className="v">{d.pessoa.telefone}</span></div>}
                {etapa && <div className="kv"><span className="k">Etapa</span><span className="v">{etapa}</span></div>}
                {d.dono && <div className="kv"><span className="k">Dono</span><span className="v">{d.dono}</span></div>}
                {d.valor > 0 && <div className="kv"><span className="k">Valor</span><span className="v">{fmtValor(d.valor)}</span></div>}
                {d.criado && <div className="kv"><span className="k">Criado</span><span className="v">{fmtData(d.criado)}</span></div>}
                {d.atualizado && <div className="kv"><span className="k">Atualizado</span><span className="v">{fmtData(d.atualizado)}</span></div>}
              </div>
            </div>

            <div className="col-side">
              <div className="card">
                <div className="card-head">
                  <div className="card-title"><Icon name="passos" size={15} /><span>Atividades</span></div>
                  {totalAbertas > 0 && <span className="pill muted" style={{ fontSize: 11.5 }}>{totalAbertas} em aberto</span>}
                </div>
                <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <div className="eyebrow">PRÓXIMAS{d.proximasTotal > 0 ? ` (${d.proximasTotal})` : ""}</div>
                    {d.proximas?.length ? d.proximas.map((a, i) => linhaAtiv(a, i, false)) : <div style={{ fontSize: 13, color: "var(--text3)" }}>Nenhuma agendada.</div>}
                    {d.proximasTotal > (d.proximas?.length || 0) && <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>+{d.proximasTotal - d.proximas.length} próximas</div>}
                  </div>

                  {d.atrasadasTotal > 0 && (
                    <div>
                      <div className="eyebrow" style={{ color: "var(--danger)" }}>ATRASADAS ({d.atrasadasTotal})</div>
                      {d.atrasadas.map((a, i) => linhaAtiv(a, i, true))}
                      {d.atrasadasTotal > d.atrasadas.length && <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>+{d.atrasadasTotal - d.atrasadas.length} atrasadas</div>}
                    </div>
                  )}

                  {d.atividadesFeitas > 0 && <div style={{ fontSize: 12, color: "var(--text3)" }}>{d.atividadesFeitas} já concluídas</div>}

                  <div className="divider" style={{ margin: "2px 0" }} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <input className="input" style={{ padding: "8px 10px" }} value={novoAtiv} onChange={(e) => { setNovoAtiv(e.target.value); if (msgAtiv) setMsgAtiv(""); }} placeholder="Nova atividade..." />
                    <div style={{ display: "flex", gap: 8 }}>
                      <input className="input" type="date" style={{ padding: "8px 10px", flex: 1, cursor: "pointer" }} value={novoAtivData} onChange={(e) => setNovoAtivData(e.target.value)} />
                      <button className="btn primary" style={{ padding: "8px 12px", flexShrink: 0 }} disabled={ativBusy || !novoAtiv.trim()} onClick={addAtiv}>{ativBusy ? "..." : "Adicionar"}</button>
                    </div>
                    {msgAtiv && <span style={{ fontSize: 12, color: msgAtiv.startsWith("Atividade") ? "var(--ok)" : "var(--text3)" }}>{msgAtiv}</span>}
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-head"><div className="card-title"><Icon name="edit" size={15} /><span>Notas</span></div></div>
                <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <textarea className="textarea" style={{ minHeight: 70 }} value={novaNota} onChange={(e) => { setNovaNota(e.target.value); if (msgNota) setMsgNota(""); }} placeholder="Escreva uma nota. Ela vai direto pro Pipedrive." />
                    <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "flex-end" }}>
                      {msgNota && <span style={{ fontSize: 12, color: msgNota.startsWith("Nota") ? "var(--ok)" : "var(--danger)" }}>{msgNota}</span>}
                      <button className="btn primary" style={{ padding: "7px 12px" }} disabled={salvandoNota || !novaNota.trim()} onClick={addNota}>
                        {salvandoNota ? "Enviando..." : "Adicionar nota"}
                      </button>
                    </div>
                  </div>

                  {d.notas?.length > 0 && (<>
                    <div className="divider" />
                    <div className="eyebrow">RECENTES</div>
                    {d.notas.map((n, i) => (
                      <div key={i} style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.5, paddingBottom: 8, borderBottom: i < d.notas.length - 1 ? "1px solid var(--border)" : "none" }}>{n.conteudo}{n.criado ? " · " + fmtData(n.criado) : ""}</div>
                    ))}
                    {d.totalNotas > d.notas.length && <div style={{ fontSize: 12, color: "var(--text3)" }}>+{d.totalNotas - d.notas.length} notas</div>}
                  </>)}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
