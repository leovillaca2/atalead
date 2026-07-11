import { useEffect, useState } from "react";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import Icon from "./components/Icons.jsx";
import Funil from "./screens/Funil.jsx";
import Reuniao from "./screens/Reuniao.jsx";
import Passos from "./screens/Passos.jsx";
import NovaReuniao from "./screens/NovaReuniao.jsx";
import { colunas, tarefasAbertas } from "./lib/mock.js";

function useTheme() {
  const [tema, setTema] = useState(() => localStorage.getItem("atalead-tema") || "claro");
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", tema);
    localStorage.setItem("atalead-tema", tema);
  }, [tema]);
  return [tema, () => setTema((t) => (t === "claro" ? "escuro" : "claro"))];
}

function Sidebar() {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const totalProspects = colunas.reduce((n, c) => n + c.cards.length, 0);
  const items = [
    { to: "/", name: "Funil", icon: "funil", badge: totalProspects, match: (p) => p === "/" },
    { to: "/reuniao/r1", name: "Reuniões", icon: "reunioes", badge: 12, match: (p) => p.startsWith("/reuniao") },
    { to: "/passos", name: "Próximos passos", icon: "passos", badge: tarefasAbertas.length, match: (p) => p === "/passos" },
  ];
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="mark"><svg width="16" height="16" viewBox="0 0 24 24" fill="var(--on-primary)"><path d="M12 2 L20 12 L12 22 L4 12 Z" /></svg></div>
        <div className="name"><span>Ata</span><span className="accent">Lead</span></div>
      </div>
      <div className="nav-label">TRABALHO</div>
      {items.map((it) => (
        <button key={it.to} className={"navitem" + (it.match(pathname) ? " active" : "")} onClick={() => nav(it.to)}>
          <Icon name={it.icon} size={17} />
          <span>{it.name}</span>
          <span className="badge">{it.badge}</span>
        </button>
      ))}
      <div className="nav-label mt">SISTEMA</div>
      <button className="navitem"><Icon name="settings" size={17} /><span>Integrações</span></button>
      <button className="navitem"><Icon name="team" size={17} /><span>Equipe</span></button>
      <div className="side-foot">
        <div className="av">AM</div>
        <div className="who"><b>Augusto Mello</b><small>PGMais</small></div>
      </div>
    </aside>
  );
}

function TopBar({ tema, toggleTema }) {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const isReuniao = pathname.startsWith("/reuniao");
  return (
    <div className="topbar">
      <div className="crumbs">
        {isReuniao ? (
          <>
            <span className="link" onClick={() => nav("/")}>Funil</span>
            <span>/</span>
            <span>Horizonte Cobranças</span>
            <span>/</span>
            <span className="cur">Reunião 08 jul</span>
          </>
        ) : (
          <span className="cur">
            {pathname === "/" ? "Funil" : pathname === "/passos" ? "Próximos passos" : "Nova reunião"}
          </span>
        )}
      </div>
      <div className="top-actions">
        <button className="btn" onClick={() => nav("/nova")}><Icon name="plus" size={15} strokeWidth={2.2} /><span>Nova reunião</span></button>
        <button className="btn icon-btn" title="Alternar tema" onClick={toggleTema}>
          <Icon name={tema === "claro" ? "moon" : "sun"} size={16} />
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [tema, toggleTema] = useTheme();
  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        <TopBar tema={tema} toggleTema={toggleTema} />
        <Routes>
          <Route path="/" element={<Funil />} />
          <Route path="/reuniao/:id" element={<Reuniao />} />
          <Route path="/passos" element={<Passos />} />
          <Route path="/nova" element={<NovaReuniao />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
