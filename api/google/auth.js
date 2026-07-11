// Inicia o fluxo OAuth: redireciona pro consentimento do Google.
// Anti-CSRF: gera um state aleatorio e o amarra ao usuario num cookie httpOnly,
// conferido na volta (callback). Sem isso, o state (id do usuario) seria forjavel.
import { randomBytes } from "crypto";
import { userFromToken } from "../../server/google.js";

export default async function handler(req, res) {
  const user = await userFromToken(req.query.token);
  if (!user) return res.status(401).send("Sessão inválida. Entre no AtaLead e tente de novo.");

  const nonce = randomBytes(16).toString("hex");
  const scope = process.env.GOOGLE_SCOPE || "https://www.googleapis.com/auth/calendar.events";
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    scope,
    state: nonce,
  });
  // nonce + id do usuario, so no servidor (httpOnly), curto (10 min), SameSite=Lax
  // pra sobreviver ao retorno de navegacao vindo do Google.
  const cookie = `g_oauth=${nonce}.${user.id}; Path=/; Max-Age=600; HttpOnly; Secure; SameSite=Lax`;
  res.setHeader("Set-Cookie", cookie);
  res.writeHead(302, { Location: "https://accounts.google.com/o/oauth2/v2/auth?" + p.toString() });
  res.end();
}
