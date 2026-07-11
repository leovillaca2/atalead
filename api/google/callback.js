// Recebe o retorno do Google, troca o code por tokens e guarda o refresh token (servidor).
// Anti-CSRF: confere o state recebido contra o cookie amarrado ao usuario (setado em auth.js).
// O user_id vem do COOKIE (confiavel), nunca do parametro state (que veio pela URL).
import { admin } from "../../server/google.js";

function lerCookie(req, nome) {
  const raw = req.headers.cookie || "";
  for (const parte of raw.split(";")) {
    const [k, ...v] = parte.trim().split("=");
    if (k === nome) return v.join("=");
  }
  return null;
}

export default async function handler(req, res) {
  const { code, state, error } = req.query;
  const limpaCookie = "g_oauth=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax";
  if (error) { res.setHeader("Set-Cookie", limpaCookie); res.writeHead(302, { Location: "/calendario?erro=" + encodeURIComponent(error) }); return res.end(); }
  if (!code || !state) return res.status(400).send("Requisição inválida.");

  // Confere o state contra o cookie (anti-CSRF) e extrai o dono real.
  const cookie = lerCookie(req, "g_oauth");
  const ponto = cookie ? cookie.indexOf(".") : -1;
  const nonceCookie = ponto > 0 ? cookie.slice(0, ponto) : null;
  const userId = ponto > 0 ? cookie.slice(ponto + 1) : null;
  if (!nonceCookie || !userId || nonceCookie !== state) {
    res.setHeader("Set-Cookie", limpaCookie);
    res.writeHead(302, { Location: "/calendario?erro=state" });
    return res.end();
  }

  const body = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    grant_type: "authorization_code",
  });
  const tok = await (await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })).json();

  res.setHeader("Set-Cookie", limpaCookie);
  if (!tok.access_token) { res.writeHead(302, { Location: "/calendario?erro=token" }); return res.end(); }

  const row = { user_id: userId, atualizado_em: new Date().toISOString() };
  if (tok.refresh_token) row.refresh_token = tok.refresh_token; // só vem no 1o consentimento
  await admin().from("google_conta").upsert(row);

  res.writeHead(302, { Location: "/calendario?conectado=1" });
  res.end();
}
