import { useState } from "react";
import { supabase } from "../lib/supabase.js";

// Aceita "augusto.mello" e completa com o dominio, ou um e-mail completo.
function normalizarEmail(v) {
  const s = v.trim();
  if (!s) return s;
  return s.includes("@") ? s : `${s}@pgmais.com.br`;
}

export default function Login() {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: normalizarEmail(usuario),
      password: senha,
    });
    setCarregando(false);
    if (error) setErro("Usuário ou senha incorretos.");
    // Sucesso: o App detecta a sessão e troca de tela sozinho.
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg)", padding: 20 }}>
      <form onSubmit={entrar} className="card" style={{ width: "100%", maxWidth: 380, padding: 28, display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}>
          <div className="mark" style={{ width: 38, height: 38, borderRadius: 11, background: "var(--primary)", display: "grid", placeItems: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--on-primary)"><path d="M12 2 L20 12 L12 22 L4 12 Z" /></svg>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em" }}>Ata<span style={{ color: "var(--primary)" }}>Lead</span></div>
        </div>
        <div style={{ textAlign: "center", fontSize: 13, color: "var(--text3)", marginTop: -6 }}>Entre para continuar</div>

        <div className="field">
          <label>Usuário</label>
          <input className="input" value={usuario} onChange={(e) => setUsuario(e.target.value)} placeholder="augusto.mello" autoFocus autoComplete="username" />
        </div>
        <div className="field">
          <label>Senha</label>
          <input className="input" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="••••••" autoComplete="current-password" />
        </div>

        {erro && <div style={{ fontSize: 13, color: "var(--danger)", background: "var(--danger-soft)", padding: "8px 12px", borderRadius: 9 }}>{erro}</div>}

        <button className="btn primary block" type="submit" disabled={carregando || !usuario || !senha} style={{ opacity: carregando || !usuario || !senha ? 0.6 : 1 }}>
          {carregando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
