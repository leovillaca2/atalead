import { useState } from "react";
import Icon from "../components/Icons.jsx";
import { reuniaoDemo } from "../lib/mock.js";
// import { enviarPipedrive } from "../lib/api.js"; // ligado na Fase 1c (servidor)

export default function Reuniao() {
  const r = reuniaoDemo;
  const [tarefas, setTarefas] = useState(r.tarefas);
  const [enviado, setEnviado] = useState(false);

  const toggle = (id) =>
    setTarefas((ts) => ts.map((t) => (t.id === id ? { ...t, feito: !t.feito } : t)));

  async function enviar() {
    // Fase 1c: chamada real protegida -> await enviarPipedrive({ lead: r.lead, ata: r.ata })
    setEnviado(true);
  }

  return (
    <div className="screen" style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 1480 }}>
      {/* Cabecalho */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="mhead-top">
          <h1 style={{ fontSize: 26 }}>{r.titulo}</h1>
          <span className="pill primary"><Icon name="check" size={12} strokeWidth={3} />Ata gerada</span>
        </div>
        <div className="mmeta">
          <span><Icon name="calendar" size={14} />{r.data}</span>
          <span><Icon name="clock" size={14} />{r.duracao}</span>
          <span><Icon name="team" size={14} />{r.participantes.length} participantes</span>
          <span className="pill muted"><span className="dot" />Origem: {r.origem}</span>
        </div>
      </div>

      {/* Etapas */}
      <div className="steps">
        <div className="step done"><div className="circ"><Icon name="check" size={14} strokeWidth={3} /></div><div><div className="t">Transcrição</div><div className="s">Recebida · 4 falantes</div></div></div>
        <div className="step done"><div className="circ"><Icon name="check" size={14} strokeWidth={3} /></div><div><div className="t">Ata executiva</div><div className="s">Gerada pela Tess</div></div></div>
        <div className={"step" + (enviado ? " done" : " current")}><div className="circ">{enviado ? <Icon name="check" size={14} strokeWidth={3} /> : "3"}</div><div><div className="t">Lead</div><div className="s">{enviado ? "Aprovado" : "Em revisão"}</div></div></div>
        <div className={"step" + (enviado ? " done" : "")}><div className="circ">{enviado ? <Icon name="check" size={14} strokeWidth={3} /> : "4"}</div><div><div className="t">Pipedrive</div><div className="s">{enviado ? "Negócio criado" : "Aguardando envio"}</div></div></div>
      </div>

      {/* Colunas */}
      <div className="cols">
        {/* Ata */}
        <div className="col-main card">
          <div className="card-head">
            <div className="card-title"><Icon name="doc" size={16} /><span>Ata executiva</span></div>
            <button className="btn ghost icon-btn" title="Editar ata"><Icon name="edit" size={14} /></button>
          </div>
          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="ata-block">
              <div className="eyebrow">RESUMO</div>
              <p className="ata-p">{r.ata.resumo}</p>
            </div>
            <div className="divider" />
            <div className="ata-block">
              <div className="eyebrow">DECISÕES</div>
              {r.ata.decisoes.map((d, i) => (
                <div className="bullet" key={i}><Icon name="check" size={15} strokeWidth={2.6} /><span>{d}</span></div>
              ))}
            </div>
            <div className="divider" />
            <div className="ata-block">
              <div className="eyebrow">PRÓXIMOS PASSOS</div>
              {tarefas.map((t) => (
                <div className={"checkline" + (t.feito ? " done" : "")} key={t.id}>
                  <div className={"chk" + (t.feito ? " on" : "")} onClick={() => toggle(t.id)}>
                    {t.feito && <Icon name="check" size={11} strokeWidth={3.4} />}
                  </div>
                  <div className="body"><div className="ttl">{t.titulo}</div><div className="sub">{t.sub}</div></div>
                  <div className="resp">{t.resp}</div>
                </div>
              ))}
            </div>
            <div className="divider" />
            <div className="ata-block">
              <div className="eyebrow">PRODUTOS PARA A PROPOSTA</div>
              <div className="tags">{r.ata.produtos.map((p, i) => <span className="tag" key={i}>{p}</span>)}</div>
            </div>
          </div>
        </div>

        {/* Lateral */}
        <div className="col-side">
          {/* Lead */}
          <div className="card" style={{ borderColor: "var(--primary)", borderWidth: 1.5, overflow: "hidden" }}>
            <div className="card-head" style={{ background: "var(--primary-soft)", borderBottom: "1px solid var(--border)" }}>
              <div className="card-title"><Icon name="target" size={15} /><span>Lead para o CRM</span></div>
            </div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="kv"><span className="k">Empresa</span><span className="v">{r.lead.empresa}</span></div>
              <div className="kv"><span className="k">Contato</span><span className="v">{r.lead.contato}</span></div>
              <div className="kv"><span className="k">Cargo</span><span className="v">{r.lead.cargo}</span></div>
              <div className="kv"><span className="k">Segmento</span><span className="v">{r.lead.segmento}</span></div>
              <div className="kv"><span className="k">Etapa sugerida</span><span className="v">{r.lead.etapa}</span></div>
              <div className="divider" style={{ margin: "4px 0" }} />
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.09em", color: "var(--text3)" }}>VALOR ESTIMADO</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span className="value-big">{r.lead.valor}</span>
                <span style={{ fontSize: 13, color: "var(--text3)" }}>{r.lead.periodo}</span>
              </div>
              {enviado ? (
                <>
                  <div className="pill ok block" style={{ justifyContent: "center", padding: "11px 16px", marginTop: 4 }}>
                    <Icon name="check" size={15} strokeWidth={2.6} /><span>Enviado ao Pipedrive</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text3)", textAlign: "center" }}>Negócio criado no funil de vendas do Pipedrive</div>
                </>
              ) : (
                <>
                  <button className="btn primary block" style={{ marginTop: 4 }} onClick={enviar}>
                    <Icon name="arrow" size={15} strokeWidth={2.2} /><span>Revisar e enviar ao Pipedrive</span>
                  </button>
                  <div style={{ fontSize: 12, color: "var(--text3)", textAlign: "center" }}>Você confere os dados antes de criar o negócio no CRM</div>
                </>
              )}
            </div>
          </div>

          {/* Participantes */}
          <div className="card">
            <div className="card-head"><div className="card-title"><Icon name="team" size={15} /><span>Participantes</span></div></div>
            <div className="card-body" style={{ paddingTop: 8, paddingBottom: 14 }}>
              {r.participantes.map((p) => (
                <div className="speaker" key={p.speaker}>
                  <span className="sp-badge mono">{p.speaker}</span>
                  <Icon name="arrow" size={13} style={{ color: "var(--text3)", flexShrink: 0 }} />
                  <div><div className="sp-name">{p.nome}</div><div className="sp-role">{p.desc}</div></div>
                </div>
              ))}
            </div>
          </div>

          {/* Transcricao */}
          <div className="card">
            <div className="card-head">
              <div className="card-title"><Icon name="mic" size={15} /><span>Transcrição</span></div>
              <span className="pill muted" style={{ fontSize: 11.5 }}>fonte</span>
            </div>
            <div className="transcript mono">
              {r.transcricao.map((l, i) => (
                <div key={i}><span className="ts">[{l.ts}]</span> <strong>{l.quem}:</strong> {l.texto}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
