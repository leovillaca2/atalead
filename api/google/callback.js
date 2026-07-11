// Recebe o retorno do Google, troca o code por tokens e guarda o refresh token (servidor).
import { admin } from "../../server/google.js";

export default async function handler(req, res) {
  const { code, state, error } = req.query;
  if (error) { res.writeHead(302, { Location: "/calendario?erro=" + encodeURIComponent(error) }); return res.end(); }
  if (!code || !state) return res.status(400).send("Requisição inválida.");

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

  if (!tok.access_token) { res.writeHead(302, { Location: "/calendario?erro=token" }); return res.end(); }

  const row = { user_id: state, atualizado_em: new Date().toISOString() };
  if (tok.refresh_token) row.refresh_token = tok.refresh_token; // só vem no 1o consentimento
  await admin().from("google_conta").upsert(row);

  res.writeHead(302, { Location: "/calendario?conectado=1" });
  res.end();
}
