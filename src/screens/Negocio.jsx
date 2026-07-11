import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import Icon from "../components/Icons.jsx";
import { dealPipedrive, adicionarNotaPipedrive } from "../lib/api.js";
import { fmtValor } from "../lib/db.js";

const fmtData = (s) => (s && s.length >= 10 ? s.slice(8, 10) + "/" + s.slice(5, 7) + "/" + s.slice(0, 4) : s || "");

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

  useEffect(() => {
    dealPipedrive(id).then(setD).catch((e) => setErro(e.message || "Erro"));
  }, [id]);

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

  const linhaAtiv = (a, i, atrasada) => (
    <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 10, fontSize: 13.5, color: "var(--text2)", padding: "4px 0", borderTop: i > 0 ? "1px solid var(--border)" : "none" }}>
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
