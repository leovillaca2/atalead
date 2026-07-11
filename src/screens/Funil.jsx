import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { pipelinesPipedrive, funilPipedrive, usersPipedrive } from "../lib/api.js";
import { listarPassosAbertos, fmtValor } from "../lib/db.js";

const SAVE_PIPE = "atalead-funil-pipeline";
const SAVE_OWNER = "atalead-funil-owner";
const DEFAULT_PIPE = "1"; // Novas Marcas (novos negocios)
const DEFAULT_OWNER = "1586234"; // Augusto Mello
const MAX_CARDS = 40;

export default function Funil() {
  const nav = useNavigate();
  const [funis, setFunis] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [pipelineId, setPipelineId] = useState(localStorage.getItem(SAVE_PIPE) || DEFAULT_PIPE);
  const [ownerId, setOwnerId] = useState(localStorage.getItem(SAVE_OWNER) ?? DEFAULT_OWNER);
  const [colunas, setColunas] = useState(null);
  const [passos, setPassos] = useState([]);
  const [erro, setErro] = useState("");

  useEffect(() => {
    pipelinesPipedrive().then((d) => setFunis(d.funis || [])).catch((e) => setErro(e.message || "Erro"));
    usersPipedrive().then((d) => setUsuarios(d.usuarios || [])).catch(() => {});
    listarPassosAbertos().then(setPassos).catch(() => {});
  }, []);

  useEffect(() => {
    if (!pipelineId) return;
    setColunas(null);
    localStorage.setItem(SAVE_PIPE, pipelineId);
    localStorage.setItem(SAVE_OWNER, ownerId);
    funilPipedrive(pipelineId, ownerId).then((d) => setColunas(d.colunas || [])).catch((e) => setErro(e.message || "Erro"));
  }, [pipelineId, ownerId]);

  if (erro) return <div className="screen" style={{ color: "var(--danger)" }}>Não consegui ler o Pipedrive: {erro}</div>;

  const total = colunas ? colunas.reduce((n, c) => n + c.cards.length, 0) : 0;

  return (
    <div className="screen" style={{ display: "flex", gap: 22, alignItems: "flex-start" }}>
      <div style={{ flex: 1, minWidth: 0, overflow: "hidden", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1>Funil</h1>
            <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 2 }}>Direto do Pipedrive{colunas ? ` · ${total} negócios` : ""}</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {usuarios.length > 0 && (
              <select className="input" style={{ maxWidth: 200, cursor: "pointer" }} value={ownerId} onChange={(e) => setOwnerId(e.target.value)} aria-label="Dono do lead">
                <option value="">Todos os donos</option>
                {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            )}
            {funis.length > 0 && (
              <select className="input" style={{ maxWidth: 260, cursor: "pointer" }} value={pipelineId} onChange={(e) => setPipelineId(e.target.value)} aria-label="Funil">
                {funis.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            )}
          </div>
        </div>

        {!colunas ? (
          <div style={{ color: "var(--text3)", fontSize: 13 }}>Carregando funil…</div>
        ) : (
          <div className="kanban">
            {colunas.map((col) => (
              <div className="kcol" key={col.id}>
                <div className="kcol-head">
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--primary)", flexShrink: 0 }} />
                  <span>{col.nome}</span><span className="cnt">{col.cards.length}</span>
                </div>
                {col.cards.slice(0, MAX_CARDS).map((c) => (
                  <div className="kcard" key={c.id} style={{ cursor: "default" }}>
                    <div className="emp">{c.titulo}</div>
                    {(c.org || c.pessoa) && <div className="cont">{c.org || c.pessoa}</div>}
                    {c.valor > 0 && <div className="row"><span style={{ fontSize: 13, fontWeight: 700 }}>{fmtValor(c.valor)}</span></div>}
                  </div>
                ))}
                {col.cards.length > MAX_CARDS && <div style={{ fontSize: 12, color: "var(--text3)", padding: "4px 2px" }}>+{col.cards.length - MAX_CARDS} outros</div>}
                {col.cards.length === 0 && <div style={{ fontSize: 12, color: "var(--text3)", padding: "6px 2px" }}>—</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      <aside className="card" style={{ width: 300, flexShrink: 0, position: "sticky", top: 76 }}>
        <div className="card-head" style={{ padding: "13px 16px" }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>Próximos passos em aberto</span>
          <span className="pill warn" style={{ fontSize: 11.5 }}>{passos.length}</span>
        </div>
        <div style={{ padding: "4px 16px" }}>
          {passos.length === 0 && <div style={{ padding: "14px 0", fontSize: 13, color: "var(--text3)" }}>Nada em aberto.</div>}
          {passos.map((t) => (
            <div key={t.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "11px 0", borderBottom: "1px solid var(--border)" }}>
              <div className="chk" style={{ width: 16, height: 16 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.35 }}>{t.titulo}</div>
                <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 1 }}>{t.prospects?.empresa || "—"}{t.prazo ? " · " + t.prazo : ""}</div>
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
