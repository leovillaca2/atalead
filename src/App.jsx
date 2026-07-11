import { useEffect, useState } from "react";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import Icon from "./components/Icons.jsx";
import Funil from "./screens/Funil.jsx";
import Reuniao from "./screens/Reuniao.jsx";
import Passos from "./screens/Passos.jsx";
import NovaReuniao from "./screens/NovaReuniao.jsx";
import Login from "./screens/Login.jsx";
import { supabase } from "./lib/supabase.js";

function useTheme() {
  const [tema, setTema] = useState(() => localStorage.getItem("atalead-tema") || "claro");
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", tema);
    localStorage.setItem("atalead-tema", tema);
  }, [tema]);
  return [tema, () => setTema((t) => (t === "claro" ? "escuro" : "claro"))];
}

function Sidebar({ email }) {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const items = [
    { to: "/", name: "Funil", icon: "funil", match: (p) => p === "/" },
    { to: "/nova", name: "Nova reunião", icon: "reunioes", match: (p) => p.startsWith("/reuniao") || p === "/nova" },
    { to: "/passos", name: "Próximos passos", icon: "passos", match: (p) => p === "/passos" },
  ];
  const nome = email
    ? email.split("@")[0].split(/[._-]/).filter(Boolean).map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" ")
    : "Usuário";
  const iniciais = nome.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="mark"><svg width="16" height="16" viewBox="0 0 24 24" fill="var(--on-primary)"><path d="M12 2 L20 12 L12 22 L4 12 Z" /></svg></div>
        <div className="name"><span>Ata</span><span className="accent">Lead</span></div>
      </div>
      <div className="nav-label">TRABALHO</div>
      {items.map((it) => (
        <button key={it.to} className={"navitem" + (it.match(pathname) ? " active" : "")} onClick={() => nav(it.to)}>
          <Icon name={it.icon} size={17} /><span>{it.name}</span>
        </button>
      ))}
      <div className="nav-label mt">SISTEMA</div>
      <button className="navitem"><Icon name="settings" size={17} /><span>Integrações</span></button>
      <button className="navitem" onClick={() => supabase?.auth.signOut()}><Icon name="team" size={17} /><span>Sair</span></button>
      <div className="side-foot">
        <div className="av">{iniciais}</div>
        <div className="who"><b>{nome}</b><small>PGMais</small></div>
      </div>
    </aside>
  );
}

function TopBar({ tema, toggleTema }) {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const titulo = pathname.startsWith("/reuniao") ? "Reunião" : pathname === "/passos" ? "Próximos passos" : pathname === "/nova" ? "Nova reunião" : "Funil";
  return (
    <div className="topbar">
      <div className="crumbs"><span className="cur">{titulo}</span></div>
      <div className="top-actions">
        <button className="btn" onClick={() => nav("/nova")}><Icon name="plus" size={15} strokeWidth={2.2} /><span>Nova reunião</span></button>
        <button className="btn icon-btn" title="Alternar tema" onClick={toggleTema}><Icon name={tema === "claro" ? "moon" : "sun"} size={16} /></button>
      </div>
    </div>
  );
}

export default function App() {
  const [tema, toggleTema] = useTheme();
  const [sessao, setSessao] = useState(undefined); // undefined = carregando

  useEffect(() => {
    if (!supabase) { setSessao(null); return; }
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session);
      // Renova o token de cara pra evitar "JWT issued at future" por desvio de relogio.
      if (data.session) supabase.auth.refreshSession().catch(() => {});
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSessao(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (sessao === undefined) {
    return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "var(--text3)" }}>Carregando…</div>;
  }
  if (!sessao) return <Login />;

  const email = sessao.user?.email;
  return (
    <div className="app">
      <Sidebar email={email} />
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
