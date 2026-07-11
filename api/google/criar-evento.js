// Cria um evento no Google Calendar do usuario (escrita; scope calendar.events).
import { admin, refreshAccessToken } from "../../server/google.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ erro: "Método não permitido" });
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const { data: u } = await admin().auth.getUser(token);
  const user = u && u.user;
  if (!user) return res.status(401).json({ erro: "não autenticado" });

  const { titulo, inicio, fim, timeZone, participantes, local, descricao } = req.body || {};
  if (!titulo || !inicio || !fim) return res.status(400).json({ erro: "Informe título, início e fim." });

  const { data: row } = await admin().from("google_conta").select("refresh_token").eq("user_id", user.id).maybeSingle();
  if (!row || !row.refresh_token) return res.status(400).json({ erro: "Conecte o Google Calendar primeiro." });

  const tok = await refreshAccessToken(row.refresh_token);
  if (!tok.access_token) return res.status(400).json({ erro: "Sessão do Google expirou, reconecte." });

  const tz = timeZone || "America/Sao_Paulo";
  const body = {
    summary: titulo,
    location: local || undefined,
    description: descricao || undefined,
    start: { dateTime: inicio, timeZone: tz },
    end: { dateTime: fim, timeZone: tz },
    attendees: (participantes || []).filter(Boolean).map((e) => ({ email: e })),
  };

  // sendUpdates=none: cria sem disparar e-mail pros convidados (evita spam em teste).
  const r = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=none", {
    method: "POST",
    headers: { Authorization: `Bearer ${tok.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const ev = await r.json();
  if (ev.error) return res.status(502).json({ erro: ev.error.message || "Erro ao criar evento" });
  return res.status(200).json({ ok: true, id: ev.id });
}
