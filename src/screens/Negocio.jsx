import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import Icon from "../components/Icons.jsx";
import { dealPipedrive } from "../lib/api.js";
import { fmtValor } from "../lib/db.js";

export default function Negocio() {
  const { id } = useParams();
  const nav = useNavigate();
  const loc = useLocation();
  const etapa = loc.state && loc.state.etapa;
  const [d, setD] = useState(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    dealPipedrive(id).then(setD).catch((e) => setErro(e.message || "Erro"));
  }, [id]);

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
                {d.criado && <div className="kv"><span className="k">Criado</span><span className="v">{d.criado}</span></div>}
                {d.atualizado && <div className="kv"><span className="k">Atualizado</span><span className="v">{d.atualizado}</span></div>}
              </div>
            </div>

            <div className="col-side">
              <div className="card">
                <div className="card-head"><div className="card-title"><Icon name="passos" size={15} /><span>Próximas atividades</span></div></div>
                <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {d.atividades?.length ? d.atividades.map((a, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, fontSize: 13.5, color: "var(--text2)" }}>
                      <span style={{ color: "var(--text3)" }}>○</span><span>{a.assunto}{a.vencimento ? " · " + a.vencimento : ""}</span>
                    </div>
                  )) : <div style={{ fontSize: 13, color: "var(--text3)" }}>Nenhuma em aberto.</div>}
                  {d.atividadesAbertas > (d.atividades?.length || 0) && <div style={{ fontSize: 12, color: "var(--text3)" }}>+{d.atividadesAbertas - d.atividades.length} em aberto</div>}
                  {d.atividadesFeitas > 0 && <div style={{ fontSize: 12, color: "var(--text3)" }}>{d.atividadesFeitas} já concluídas</div>}
                </div>
              </div>

              {d.notas?.length > 0 && (
                <div className="card">
                  <div className="card-head"><div className="card-title"><Icon name="doc" size={15} /><span>Notas recentes</span></div></div>
                  <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {d.notas.map((n, i) => (
                      <div key={i} style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.5, paddingBottom: 8, borderBottom: i < d.notas.length - 1 ? "1px solid var(--border)" : "none" }}>{n.conteudo}{n.criado ? " · " + n.criado : ""}</div>
                    ))}
                    {d.totalNotas > d.notas.length && <div style={{ fontSize: 12, color: "var(--text3)" }}>+{d.totalNotas - d.notas.length} notas</div>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
