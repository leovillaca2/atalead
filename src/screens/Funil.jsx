import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { pipelinesPipedrive, funilPipedrive, usersPipedrive } from "../lib/api.js";
import { fmtValor } from "../lib/db.js";

const SAVE_PIPE = "atalead-funil-pipeline";
const SAVE_OWNER = "atalead-funil-owner";
const DEFAULT_PIPE = "1"; // Novas Marcas (novos negocios)
const DEFAULT_OWNER = "1586234"; // Augusto Mello
const MAX_CARDS = 60;

export default function Funil() {
  const nav = useNavigate();
  const [funis, setFunis] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [pipelineId, setPipelineId] = useState(localStorage.getItem(SAVE_PIPE) || DEFAULT_PIPE);
  const [ownerId, setOwnerId] = useState(localStorage.getItem(SAVE_OWNER) ?? DEFAULT_OWNER);
  const [colunas, setColunas] = useState(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    pipelinesPipedrive().then((d) => setFunis(d.funis || [])).catch((e) => setErro(e.message || "Erro"));
    usersPipedrive().then((d) => setUsuarios(d.usuarios || [])).catch(() => {});
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
    <div className="screen" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1>Funil</h1>
          <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 2 }}>Direto do Pipedrive{colunas ? ` · ${total} negócios` : ""}</div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {usuarios.length > 0 && (
            <select className="input" style={{ width: 190, cursor: "pointer" }} value={ownerId} onChange={(e) => setOwnerId(e.target.value)} aria-label="Dono do lead">
              <option value="">Todos os donos</option>
              {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          )}
          {funis.length > 0 && (
            <select className="input" style={{ width: 220, cursor: "pointer" }} value={pipelineId} onChange={(e) => setPipelineId(e.target.value)} aria-label="Funil">
              {funis.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          )}
        </div>
      </div>

      {!colunas ? (
        <div style={{ color: "var(--text3)", fontSize: 13 }}>Carregando funil…</div>
      ) : total === 0 ? (
        <div className="card" style={{ padding: 28, textAlign: "center", color: "var(--text3)" }}>
          Nenhum negócio nesse funil pra esse dono. Troque o filtro acima.
        </div>
      ) : (
        <div className="kanban">
          {colunas.map((col) => (
            <div className="kcol" key={col.id}>
              <div className="kcol-head">
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--primary)", flexShrink: 0 }} />
                <span>{col.nome}</span><span className="cnt">{col.cards.length}</span>
              </div>
              <div className="kcol-cards">
                {col.cards.slice(0, MAX_CARDS).map((c) => (
                  <div className="kcard" key={c.id} onClick={() => nav(`/negocio/${c.id}`, { state: { etapa: col.nome } })}>
                    <div className="emp">{c.titulo}</div>
                    {(c.org || c.pessoa) && <div className="cont">{c.org || c.pessoa}</div>}
                    {c.valor > 0 && <div className="row"><span style={{ fontSize: 13, fontWeight: 700 }}>{fmtValor(c.valor)}</span></div>}
                  </div>
                ))}
                {col.cards.length > MAX_CARDS && <div style={{ fontSize: 12, color: "var(--text3)", padding: "4px 2px" }}>+{col.cards.length - MAX_CARDS} outros</div>}
                {col.cards.length === 0 && <div style={{ fontSize: 12, color: "var(--faint)", padding: "6px 2px" }}>Vazio</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
