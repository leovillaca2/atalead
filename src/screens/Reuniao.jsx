import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Icon from "../components/Icons.jsx";
import Modal from "../components/Modal.jsx";
import { getReuniao, togglePasso, salvarVinculoPipedrive, updateAta, salvarNotas, fmtValor } from "../lib/db.js";
import { enviarPipedrive, pipelinesPipedrive, stagesPipedrive, buscarNegociosPipedrive, segmentosPipedrive } from "../lib/api.js";

const TEMP_COR = { quente: "#15803D", morno: "#B45309", frio: "#1D5FD1" };

// Formata o valor como 10.000,00 (aceita "10000", "10.000", "R$ 10.000,50" etc.).
function fmtMoeda(v) {
  if (v === null || v === undefined || v === "") return "";
  const n = typeof v === "number"
    ? v
    : parseFloat(String(v).replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
  if (isNaN(n)) return String(v);
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const CAMPOS_LEAD = [
  ["empresa", "Empresa"], ["contato", "Contato"], ["cargo", "Cargo"],
  ["segmento", "Segmento"], ["etapa", "Etapa sugerida"], ["valor", "Valor estimado"],
];

export default function Reuniao() {
  const { id } = useParams();
  const nav = useNavigate();
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");
  const [passos, setPassos] = useState([]);

  const [dealId, setDealId] = useState(null);
  const [updateTime, setUpdateTime] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [msgEnvio, setMsgEnvio] = useState("");
  const [conflito, setConflito] = useState(null);
  const [candidatos, setCandidatos] = useState(null);

  const [editando, setEditando] = useState(false);
  const [eResumo, setEResumo] = useState("");
  const [eLead, setELead] = useState({});
  const [eAnalise, setEAnalise] = useState({ nota: "", temperatura: "", probabilidade: "", comentario: "" });
  const [salvandoEdit, setSalvandoEdit] = useState(false);

  const [funis, setFunis] = useState([]);
  const [pipelineSel, setPipelineSel] = useState(localStorage.getItem("atalead-funil-pipeline") || "");
  const [etapas, setEtapas] = useState([]);
  const [stageSel, setStageSel] = useState("");
  const [segmentos, setSegmentos] = useState([]);

  const [notas, setNotas] = useState("");
  const [salvandoNotas, setSalvandoNotas] = useState(false);
  const [msgNotas, setMsgNotas] = useState("");

  useEffect(() => {
    getReuniao(id)
      .then((d) => {
        setDados(d); setPassos(d.passos);
        setEResumo((d.ata && d.ata.resumo) || "");
        setELead({ ...((d.ata && d.ata.lead) || {}) });
        { const an = (d.ata && d.ata.analise) || {}; setEAnalise({ nota: an.nota ?? "", temperatura: an.temperatura || "", probabilidade: an.probabilidade || "", comentario: an.comentario || "" }); }
        setDealId(d.reuniao.pipedrive_deal_id || null);
        setUpdateTime(d.reuniao.pipedrive_update_time || null);
        setNotas(d.reuniao.notas || "");
      })
      .catch((e) => setErro(e.message || "Reunião não encontrada"));
  }, [id]);

  useEffect(() => {
    pipelinesPipedrive().then((d) => {
      setFunis(d.funis || []);
      setPipelineSel((cur) => cur || (d.funis && d.funis[0] ? String(d.funis[0].id) : ""));
    }).catch(() => {});
    segmentosPipedrive().then((d) => setSegmentos(d.segmentos || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!pipelineSel) return;
    setEtapas([]); setStageSel("");
    stagesPipedrive(pipelineSel).then((d) => {
      setEtapas(d.etapas || []);
      setStageSel((d.etapas && d.etapas[0]) ? String(d.etapas[0].id) : "");
    }).catch(() => {});
  }, [pipelineSel]);

  if (erro) return <div className="screen" style={{ color: "var(--danger)" }}>{erro}</div>;
  if (!dados) return <div className="screen" style={{ color: "var(--text3)" }}>Carregando…</div>;

  const { reuniao, participantes, ata } = dados;
  const lead = (ata && ata.lead) || {};
  const decisoes = (ata && ata.decisoes) || [];
  const produtos = (ata && ata.produtos) || [];

  async function toggle(p) {
    const novo = !p.feito;
    setPassos((ps) => ps.map((x) => (x.id === p.id ? { ...x, feito: novo } : x)));
    try { await togglePasso(p.id, novo); }
    catch {
      setPassos((ps) => ps.map((x) => (x.id === p.id ? { ...x, feito: !novo } : x)));
      setMsgEnvio("Não consegui salvar esse passo. Tente de novo.");
    }
  }

  function iniciarEdicao() {
    setEResumo(ata ? ata.resumo || "" : "");
    setELead({ ...lead });
    const an = (ata && ata.analise) || {};
    setEAnalise({ nota: an.nota ?? "", temperatura: an.temperatura || "", probabilidade: an.probabilidade || "", comentario: an.comentario || "" });
    setEditando(true);
  }
  async function salvarEdicao() {
    if (!ata) return;
    setSalvandoEdit(true);
    try {
      const analise = {
        nota: eAnalise.nota === "" || eAnalise.nota === null ? null : Number(eAnalise.nota),
        temperatura: eAnalise.temperatura || null,
        probabilidade: eAnalise.probabilidade || null,
        comentario: eAnalise.comentario || null,
      };
      await updateAta(ata.id, { resumo: eResumo, lead: eLead, analise });
      setDados((d) => ({ ...d, ata: { ...d.ata, resumo: eResumo, lead: { ...eLead }, analise } }));
      setEditando(false);
    } catch (e) { setMsgEnvio(e.message || "Falha ao salvar."); }
    finally { setSalvandoEdit(false); }
  }

  async function salvarNotasFn() {
    setSalvandoNotas(true); setMsgNotas("");
    try { await salvarNotas(id, notas); setMsgNotas("Salvo"); }
    catch { setMsgNotas("Falha ao salvar"); }
    finally { setSalvandoNotas(false); }
  }

  // Clique no botao: se ainda nao vinculado, checa duplicados por empresa antes de criar.
  async function onEnviar() {
    if (jaTemDeal) return enviar({ force: false });
    setEnviando(true); setMsgEnvio("");
    let achou = [];
    try { const r = await buscarNegociosPipedrive({ empresa: lead.empresa }); achou = r.negocios || []; }
    catch { achou = []; }
    setEnviando(false);
    if (achou.length) { setCandidatos(achou); return; } // deixa o usuario escolher
    enviar({ force: false });
  }

  async function enviar({ force = false, linkDealId = null } = {}) {
    setEnviando(true); setMsgEnvio("");
    try {
      const alvo = linkDealId || dealId;
      // Inclui os proximos passos (tabela separada) no payload da ata, pra virarem tarefas no Pipedrive.
      const ataPayload = { ...(ata || {}), proximos_passos: (passos || []).map((p) => ({ titulo: p.titulo, responsavel: p.responsavel, prazo: p.prazo })) };
      const res = await enviarPipedrive({
        lead, ata: ataPayload, dealId: alvo, apenasAnexar: !!linkDealId,
        expectedUpdateTime: linkDealId ? undefined : updateTime,
        force, pipelineId: pipelineSel, stageId: stageSel,
      });
      if (res.conflito) { setConflito(res); return; }
      if (res.simulado) { setMsgEnvio(res.mensagem || "Modo seguro: nada foi escrito."); setCandidatos(null); return; }
      if (res.ok && res.dealId) {
        setDealId(res.dealId); setUpdateTime(res.update_time);
        await salvarVinculoPipedrive(id, { dealId: res.dealId, orgId: res.orgId, personId: res.personId, update_time: res.update_time });
        setMsgEnvio(linkDealId ? "Ata anexada ao negócio existente no Pipedrive." : (dealId ? "Atualizado no Pipedrive." : "Negócio criado no Pipedrive."));
        setCandidatos(null);
      }
    } catch (e) {
      setMsgEnvio(e.message || "Falha ao enviar.");
    } finally { setEnviando(false); }
  }

  const jaTemDeal = !!dealId;

  return (
    <div className="screen" style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 1480 }}>
      <button className="btn" style={{ alignSelf: "flex-start", boxShadow: "none" }} onClick={() => nav(-1)}>
        <Icon name="arrow" size={15} style={{ transform: "scaleX(-1)" }} /> Voltar
      </button>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="mhead-top">
          <h1 style={{ fontSize: 26 }}>{reuniao.titulo}</h1>
          <span className="pill primary"><Icon name="check" size={12} strokeWidth={3} />Ata gerada</span>
        </div>
        <div className="mmeta">
          {reuniao.data && <span><Icon name="calendar" size={14} />{reuniao.data}</span>}
          <span><Icon name="team" size={14} />{participantes.length} participantes</span>
          <span className="pill muted"><span className="dot" />Origem: {reuniao.origem}</span>
        </div>
      </div>

      <div className="steps">
        <div className="step done"><div className="circ"><Icon name="check" size={14} strokeWidth={3} /></div><div><div className="t">Transcrição</div><div className="s">Recebida</div></div></div>
        <div className="step done"><div className="circ"><Icon name="check" size={14} strokeWidth={3} /></div><div><div className="t">Ata executiva</div><div className="s">Gerada pela Tess</div></div></div>
        <div className={"step" + (jaTemDeal ? " done" : " current")}><div className="circ">{jaTemDeal ? <Icon name="check" size={14} strokeWidth={3} /> : "3"}</div><div><div className="t">Lead</div><div className="s">{jaTemDeal ? "No Pipedrive" : "Em revisão"}</div></div></div>
        <div className={"step" + (jaTemDeal ? " done" : "")}><div className="circ">{jaTemDeal ? <Icon name="check" size={14} strokeWidth={3} /> : "4"}</div><div><div className="t">Pipedrive</div><div className="s">{jaTemDeal ? "Sincronizado" : "Aguardando"}</div></div></div>
      </div>

      <div className="cols">
        <div className="col-main card">
          <div className="card-head">
            <div className="card-title"><Icon name="doc" size={16} /><span>Ata executiva</span></div>
            {editando ? (
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn" style={{ boxShadow: "none", padding: "7px 12px" }} onClick={() => setEditando(false)}>Cancelar</button>
                <button className="btn primary" style={{ padding: "7px 12px" }} onClick={salvarEdicao} disabled={salvandoEdit}>{salvandoEdit ? "Salvando..." : "Salvar"}</button>
              </div>
            ) : (
              <button className="btn ghost icon-btn" title="Editar ata e lead" onClick={iniciarEdicao}><Icon name="edit" size={14} /></button>
            )}
          </div>
          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="ata-block">
              <div className="eyebrow">RESUMO</div>
              {editando
                ? <textarea className="textarea" style={{ minHeight: 120 }} value={eResumo} onChange={(e) => setEResumo(e.target.value)} />
                : <p className="ata-p">{ata?.resumo || "—"}</p>}
            </div>
            {decisoes.length > 0 && (<><div className="divider" /><div className="ata-block"><div className="eyebrow">DECISÕES</div>{decisoes.map((d, i) => (<div className="bullet" key={i}><Icon name="check" size={15} strokeWidth={2.6} /><span>{d}</span></div>))}</div></>)}
            {passos.length > 0 && (<><div className="divider" /><div className="ata-block"><div className="eyebrow">PRÓXIMOS PASSOS</div>{passos.map((t) => (
              <div className={"checkline" + (t.feito ? " done" : "")} key={t.id}>
                <div className={"chk" + (t.feito ? " on" : "")} onClick={() => toggle(t)}>{t.feito && <Icon name="check" size={11} strokeWidth={3.4} />}</div>
                <div className="body"><div className="ttl">{t.titulo}</div>{t.prazo && <div className="sub">{t.prazo}</div>}</div>
                {t.responsavel && <div className="resp">{t.responsavel}</div>}
              </div>
            ))}</div></>)}
            {produtos.length > 0 && (<><div className="divider" /><div className="ata-block"><div className="eyebrow">PRODUTOS PARA A PROPOSTA</div><div className="tags">{produtos.map((p, i) => <span className="tag" key={i}>{p}</span>)}</div></div></>)}
            {editando ? (<>
              <div className="divider" />
              <div className="ata-block">
                <div className="eyebrow">ANÁLISE</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                  <div className="field" style={{ flex: "0 0 110px" }}>
                    <label style={{ fontSize: 12, color: "var(--text2)" }}>Nota (0-10)</label>
                    <input className="input" style={{ padding: "8px 11px" }} type="number" min="0" max="10" value={eAnalise.nota} onChange={(e) => setEAnalise((a) => ({ ...a, nota: e.target.value }))} />
                  </div>
                  <div className="field" style={{ flex: "0 0 150px" }}>
                    <label style={{ fontSize: 12, color: "var(--text2)" }}>Temperatura</label>
                    <select className="input" style={{ padding: "8px 11px", cursor: "pointer" }} value={eAnalise.temperatura} onChange={(e) => setEAnalise((a) => ({ ...a, temperatura: e.target.value }))}>
                      <option value="">-</option><option value="frio">Frio</option><option value="morno">Morno</option><option value="quente">Quente</option>
                    </select>
                  </div>
                  <div className="field" style={{ flex: 1, minWidth: 160 }}>
                    <label style={{ fontSize: 12, color: "var(--text2)" }}>Probabilidade</label>
                    <input className="input" style={{ padding: "8px 11px" }} value={eAnalise.probabilidade} onChange={(e) => setEAnalise((a) => ({ ...a, probabilidade: e.target.value }))} placeholder="ex: alta, média, 60%" />
                  </div>
                </div>
                <textarea className="textarea" style={{ minHeight: 80 }} value={eAnalise.comentario} onChange={(e) => setEAnalise((a) => ({ ...a, comentario: e.target.value }))} placeholder="Comentário sobre a apresentação e o lead" />
              </div>
            </>) : (ata?.analise && (ata.analise.nota > 0 || ata.analise.temperatura || ata.analise.probabilidade || ata.analise.comentario) && (<>
              <div className="divider" />
              <div className="ata-block">
                <div className="eyebrow">ANÁLISE</div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", marginBottom: ata.analise.comentario ? 8 : 0 }}>
                  {ata.analise.nota > 0 && <span style={{ fontSize: 13.5 }}>Nota da apresentação: <b>{ata.analise.nota}/10</b></span>}
                  {ata.analise.temperatura && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13.5, textTransform: "capitalize" }}>
                      <span style={{ width: 9, height: 9, borderRadius: "50%", background: TEMP_COR[String(ata.analise.temperatura).toLowerCase()] || "var(--text3)" }} />
                      {ata.analise.temperatura}
                    </span>
                  )}
                  {ata.analise.probabilidade && <span style={{ fontSize: 13.5, color: "var(--text2)" }}>Probabilidade: {ata.analise.probabilidade}</span>}
                </div>
                {ata.analise.comentario && <p className="ata-p">{ata.analise.comentario}</p>}
              </div>
            </>))}
          </div>
        </div>

        <div className="col-side">
          <div className="card" style={{ borderColor: "var(--primary)", borderWidth: 1.5, overflow: "hidden" }}>
            <div className="card-head" style={{ background: "var(--primary-soft)", borderBottom: "1px solid var(--border)" }}>
              <div className="card-title"><Icon name="target" size={15} /><span>Lead para o CRM</span></div>
            </div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {editando ? (
                CAMPOS_LEAD.map(([k, rotulo]) => {
                  const opcoes = k === "etapa" ? etapas.map((s) => s.nome) : k === "segmento" ? segmentos : null;
                  const listId = opcoes && opcoes.length ? `dl-${k}` : undefined;
                  return (
                    <div className="field" key={k}>
                      <label style={{ fontSize: 12, color: "var(--text2)" }}>{rotulo}</label>
                      <input className="input" style={{ padding: "8px 11px" }} list={listId} value={eLead[k] || ""} onChange={(e) => setELead((l) => ({ ...l, [k]: e.target.value }))} />
                      {listId && <datalist id={listId}>{opcoes.map((o, idx) => <option key={idx} value={o} />)}</datalist>}
                    </div>
                  );
                })
              ) : (<>
                {lead.empresa && <div className="kv"><span className="k">Empresa</span><span className="v">{lead.empresa}</span></div>}
                {lead.contato && <div className="kv"><span className="k">Contato</span><span className="v">{lead.contato}</span></div>}
                {lead.cargo && <div className="kv"><span className="k">Cargo</span><span className="v">{lead.cargo}</span></div>}
                {lead.segmento && <div className="kv"><span className="k">Segmento</span><span className="v">{lead.segmento}</span></div>}
                {lead.etapa && <div className="kv"><span className="k">Etapa sugerida</span><span className="v">{lead.etapa}</span></div>}
                {lead.valor && (<><div className="divider" style={{ margin: "4px 0" }} /><div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.09em", color: "var(--text3)" }}>VALOR ESTIMADO</div><div className="value-big">R$ {fmtMoeda(lead.valor)}</div></>)}
              </>)}

              {!editando && (<>
                {!jaTemDeal && funis.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                    <label style={{ fontSize: 12, color: "var(--text2)" }}>Enviar para o funil e etapa</label>
                    <select className="input" style={{ padding: "8px 11px", cursor: "pointer" }} value={pipelineSel} onChange={(e) => setPipelineSel(e.target.value)}>
                      {funis.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                    </select>
                    <select className="input" style={{ padding: "8px 11px", cursor: "pointer" }} value={stageSel} onChange={(e) => setStageSel(e.target.value)}>
                      {etapas.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                    </select>
                  </div>
                )}
                <button className="btn primary block" style={{ marginTop: 4 }} onClick={onEnviar} disabled={enviando}>
                  <Icon name="arrow" size={15} strokeWidth={2.2} /><span>{enviando ? "Enviando..." : jaTemDeal ? "Atualizar no Pipedrive" : "Revisar e enviar ao Pipedrive"}</span>
                </button>
                <div style={{ fontSize: 12, color: "var(--text3)", textAlign: "center" }}>{msgEnvio || "Você confere os dados antes de criar o negócio"}</div>
                {jaTemDeal && (
                  <button className="btn block" style={{ boxShadow: "none" }} onClick={() => nav(`/negocio/${dealId}`)}>
                    <Icon name="funil" size={14} /><span>Ver negócio no funil</span>
                  </button>
                )}
              </>)}
            </div>
          </div>

          {participantes.length > 0 && (
            <div className="card">
              <div className="card-head"><div className="card-title"><Icon name="team" size={15} /><span>Participantes</span></div></div>
              <div className="card-body" style={{ paddingTop: 8, paddingBottom: 14 }}>
                {participantes.map((p) => (
                  <div className="speaker" key={p.id}>
                    <span className="sp-badge mono">{p.speaker}</span>
                    <Icon name="arrow" size={13} style={{ color: "var(--text3)", flexShrink: 0 }} />
                    <div><div className="sp-name">{p.nome}</div>{(p.empresa || p.papel) && <div className="sp-role">{[p.empresa, p.papel].filter(Boolean).join(" · ")}</div>}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {reuniao.transcricao && (
            <div className="card">
              <div className="card-head"><div className="card-title"><Icon name="mic" size={15} /><span>Transcrição</span></div><span className="pill muted" style={{ fontSize: 11.5 }}>fonte</span></div>
              <div className="transcript mono" style={{ whiteSpace: "pre-wrap" }}>{reuniao.transcricao}</div>
            </div>
          )}

          <div className="card">
            <div className="card-head">
              <div className="card-title"><Icon name="edit" size={15} /><span>Notas</span></div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {msgNotas && <span style={{ fontSize: 12, color: msgNotas === "Salvo" ? "var(--ok)" : "var(--danger)" }}>{msgNotas}</span>}
                <button className="btn primary" style={{ padding: "6px 12px" }} onClick={salvarNotasFn} disabled={salvandoNotas}>{salvandoNotas ? "Salvando..." : "Salvar"}</button>
              </div>
            </div>
            <div className="card-body">
              <textarea className="textarea" style={{ minHeight: 110 }} value={notas} onChange={(e) => { setNotas(e.target.value); if (msgNotas) setMsgNotas(""); }} placeholder="Suas anotações sobre esta reunião..." />
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={!!conflito}
        tone="warn"
        title="Este negócio mudou no Pipedrive"
        onClose={() => setConflito(null)}
        footer={<>
          <button className="btn" onClick={() => setConflito(null)}>Cancelar</button>
          <button className="btn primary" onClick={() => { setConflito(null); enviar({ force: true }); }}>Sobrescrever mesmo assim</button>
        </>}
      >
        <p>Alguém alterou este negócio no Pipedrive depois da última vez que o AtaLead sincronizou. Se continuar, os dados do AtaLead vão sobrescrever o que está lá.</p>
        {conflito && (
          <div className="diff">
            <div className="box"><h4>No Pipedrive agora</h4><div>{conflito.atual?.titulo || "—"}</div><div style={{ marginTop: 4, fontWeight: 600 }}>{conflito.atual?.valor ? fmtValor(conflito.atual.valor) : "—"}</div></div>
            <div className="box novo"><h4>O AtaLead vai gravar</h4><div>{lead.empresa} — proposta</div><div style={{ marginTop: 4, fontWeight: 600 }}>{lead.valor || "—"}</div></div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!candidatos}
        title="Essa empresa já tem negócio no Pipedrive"
        onClose={() => setCandidatos(null)}
        footer={<>
          <button className="btn" onClick={() => setCandidatos(null)}>Cancelar</button>
          <button className="btn primary" onClick={() => enviar({ force: false })} disabled={enviando}>Criar um novo mesmo assim</button>
        </>}
      >
        <p>Encontramos negócios abertos dessa empresa. Você pode anexar esta ata e os próximos passos a um deles, em vez de criar um negócio duplicado.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
          {(candidatos || []).map((c) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{c.titulo}</div>
                <div style={{ fontSize: 12, color: "var(--text3)" }}>{[c.contato, c.dono, c.valor > 0 ? fmtValor(c.valor) : null, c.atualizado ? "atualizado " + c.atualizado : null].filter(Boolean).join(" · ")}</div>
              </div>
              <button className="btn primary" style={{ padding: "7px 12px", flexShrink: 0 }} onClick={() => enviar({ linkDealId: c.id })} disabled={enviando}>Usar este</button>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
