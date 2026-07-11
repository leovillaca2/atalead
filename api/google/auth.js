// Inicia o fluxo OAuth: redireciona pro consentimento do Google.
import { userFromToken } from "../../server/google.js";

export default async function handler(req, res) {
  const user = await userFromToken(req.query.token);
  if (!user) return res.status(401).send("Sessão inválida. Entre no AtaLead e tente de novo.");

  const scope = process.env.GOOGLE_SCOPE || "https://www.googleapis.com/auth/calendar.events";
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    scope,
    state: user.id,
  });
  res.writeHead(302, { Location: "https://accounts.google.com/o/oauth2/v2/auth?" + p.toString() });
  res.end();
}
