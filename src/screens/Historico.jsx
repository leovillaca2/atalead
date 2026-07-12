import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../components/Icons.jsx";
import Modal from "../components/Modal.jsx";
import { listarReunioes, excluirReuniao, fmtValor } from "../lib/db.js";

function Stat({ label, valor }) {
  return (
    <div className="card" style={{ flex: 1, minWidth: 150, padding: "14px 16px", boxShadow: "var(--shadow)" }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--text3)", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 23, fontWeight: 700, letterSpacing: "-0.02em", marginTop: 4 }}>{valor}</div>
    </div>
  );
}

const STATUS = {
  ata_gerada: { label: "Ata gerada", cls: "ok" },
  agendada: { label: "Agendada", cls: "muted" },
  cancelada: { label: "Cancelada", cls: "muted" },
  nova: { label: "Nova", cls: "muted" },
};

const COLS = [
  { h: "Data", k: (r) => r.data || (r.created_at || "").slice(0, 10) },
  { h: "Título", k: (r) => r.titulo || "" },
  { h: "Empresa", k: (r) => (r.prospects && r.prospects.empresa) || "" },
  { h: "Contato", k: (r) => (r.prospects && r.prospects.contato) || "" },
  { h: "Participantes", k: (r) => (r.participantes && r.participantes[0] && r.participantes[0].count) ?? 0 },
  { h: "Próximos passos", k: (r) => (r.proximos_passos && r.proximos_passos[0] && r.proximos_passos[0].count) ?? 0 },
  { h: "Status", k: (r) => (STATUS[r.status] && STATUS[r.status].label) || r.status || "" },
  { h: "No Pipedrive", k: (r) => (r.pipedrive_deal_id ? "Sim" : "Não") },
  { h: "Valor estimado", k: (r) => ((r.prospects && r.prospects.valor_estimado) || "") },
];

export default function Historico() {
  const nav = useNavigate();
  const [todas, setTodas] = useState(null);
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [paraExcluir, setParaExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    listarReunioes().then(setTodas).catch((e) => setErro(e.message || "Erro"));
  }, []);

  if (erro) return <div className="screen" style={{ color: "var(--danger)" }}>{erro}</div>;
  if (!todas) return <div className="screen" style={{ color: "var(--text3)" }}>Carregando…</div>;

  const mesAtual = new Date().toISOString().slice(0, 7);
  const noMes = todas.filter((r) => (r.data || r.created_at || "").slice(0, 7) === mesAtual).length;
  const valorTotal = todas.reduce((s, r) => s + ((r.prospects && r.prospects.valor_estimado) || 0), 0);
  function abrir(r) { if (r.status === "ata_gerada") nav(`/reuniao/${r.id}`); else nav("/"); }

  const b = busca.trim().toLowerCase();
  const lista = b
    ? todas.filter((r) => (r.titulo || "").toLowerCase().includes(b) || (r.prospects && r.prospects.empresa || "").toLowerCase().includes(b))
    : todas;

  async function excluir() {
    if (!paraExcluir) return;
    setExcluindo(true); setAviso("");
    const alvo = paraExcluir;
    try {
      await excluirReuniao(alvo.id);
      setTodas((t) => t.filter((x) => x.id !== alvo.id));
      setParaExcluir(null);
    } catch (e) {
      setAviso(e.message || "Falha ao excluir.");
      setParaExcluir(null);
    } finally { setExcluindo(false); }
  }

  async function exportarExcel() {
    if (!lista.length) return;
    setExportando(true); setAviso("");
    try {
      const mod = await import("exceljs");
      const ExcelJS = mod.default || mod;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Reuniões", { views: [{ showGridLines: false }] });
      ws.columns = COLS.map((c) => ({ header: c.h, key: c.h }));
      lista.forEach((r) => ws.addRow(COLS.map((c) => c.k(r))));

      // largura pelo conteudo (pra nao precisar expandir), tudo centralizado
      ws.columns.forEach((col, i) => {
        let max = COLS[i].h.length;
        col.eachCell({ includeEmpty: true }, (cell) => {
          const v = cell.value == null ? "" : String(cell.value);
          if (v.length > max) max = v.length;
        });
        col.width = Math.min(Math.max(max + 2, 10), 45);
        col.alignment = { horizontal: "center", vertical: "middle" };
      });

      // cabecalho com cor diferente
      const head = ws.getRow(1);
      head.height = 20;
      head.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0E7C74" } };
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });

      // grade só na tabela (gridlines do sheet ja desligadas)
      const borda = { style: "thin", color: { argb: "FFBFC8CC" } };
      ws.eachRow((row) => row.eachCell((cell) => { cell.border = { top: borda, bottom: borda, left: borda, right: borda }; }));

      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reunioes-atalead-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setAviso(e.message || "Falha ao exportar.");
    } finally { setExportando(false); }
  }

  return (
    <div className="screen" style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 900 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1>Reuniões</h1>
          <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 2 }}>Histórico de atas geradas</div>
        </div>
        <button className="btn" onClick={exportarExcel} disabled={exportando || !lista.length}>
          <Icon name="upload" size={15} /><span>{exportando ? "Gerando..." : "Exportar Excel"}</span>
        </button>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Stat label="Reuniões no mês" valor={noMes} />
        <Stat label="Total de reuniões" valor={todas.length} />
        <Stat label="Valor estimado" valor={fmtValor(valorTotal)} />
      </div>

      {aviso && <div style={{ fontSize: 13, color: "var(--danger)", background: "var(--danger-soft)", padding: "10px 12px", borderRadius: 9 }}>{aviso}</div>}

      <input className="input" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por empresa ou título..." />

      <div className="card" style={{ overflow: "hidden" }}>
        {lista.length === 0 && <div style={{ padding: 24, textAlign: "center", color: "var(--text3)", fontSize: 13 }}>Nenhuma reunião encontrada.</div>}
        {lista.map((r) => (
          <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 18px", borderBottom: "1px solid var(--border)", opacity: r.status === "cancelada" ? 0.55 : 1 }}>
            <div onClick={() => abrir(r)} style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0, cursor: "pointer" }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: "var(--primary-soft)", color: "var(--primary)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <Icon name={r.status === "ata_gerada" ? "doc" : "calendar"} size={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.titulo}</div>
                <div style={{ fontSize: 12.5, color: "var(--text3)", marginTop: 1 }}>
                  {(r.prospects && r.prospects.empresa) || "—"}{r.data ? " · " + r.data : ""}
                </div>
              </div>
              <span className={"pill " + ((STATUS[r.status] && STATUS[r.status].cls) || "muted")} style={{ fontSize: 11, flexShrink: 0 }}>{(STATUS[r.status] && STATUS[r.status].label) || r.status}</span>
              {r.prospects && r.prospects.valor_estimado > 0 && (
                <span style={{ fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{fmtValor(r.prospects.valor_estimado)}</span>
              )}
            </div>
            <button className="btn ghost icon-btn" title="Excluir reunião" style={{ color: "var(--danger)", flexShrink: 0 }} onClick={() => setParaExcluir(r)}><Icon name="trash" size={15} /></button>
          </div>
        ))}
      </div>

      <Modal
        open={!!paraExcluir}
        tone="warn"
        title="Excluir esta reunião?"
        onClose={() => setParaExcluir(null)}
        footer={<>
          <button className="btn" onClick={() => setParaExcluir(null)}>Voltar</button>
          <button className="btn primary" style={{ background: "var(--danger)", borderColor: "var(--danger)" }} onClick={excluir} disabled={excluindo}>{excluindo ? "Excluindo..." : "Excluir"}</button>
        </>}
      >
        <p>Isso apaga a ata, os participantes e os próximos passos de "{paraExcluir?.titulo}" aqui no AtaLead. Não mexe no que já foi enviado ao Pipedrive, e não dá pra desfazer.</p>
      </Modal>
    </div>
  );
}
