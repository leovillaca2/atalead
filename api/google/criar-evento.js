// Cria (POST) ou CANCELA (DELETE) um evento no Google Calendar do usuario (scope calendar.events).
import { admin, refreshAccessToken } from "../../server/google.js";

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "DELETE") return res.status(405).json({ erro: "Método não permitido" });
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const { data: u } = await admin().auth.getUser(token);
  const user = u && u.user;
  if (!user) return res.status(401).json({ erro: "não autenticado" });

  const { data: row } = await admin().from("google_conta").select("refresh_token").eq("user_id", user.id).maybeSingle();
  if (!row || !row.refresh_token) return res.status(400).json({ erro: "Conecte o Google Calendar primeiro." });
  const tok = await refreshAccessToken(row.refresh_token);
  if (!tok.access_token) return res.status(400).json({ erro: "Sessão do Google expirou, reconecte." });

  // CANCELAR: apaga o evento e avisa os participantes (sendUpdates=all).
  if (req.method === "DELETE") {
    const id = req.query && req.query.id;
    if (!id) return res.status(400).json({ erro: "Informe o evento." });
    const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(id)}?sendUpdates=all`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tok.access_token}` },
    });
    if (r.status === 204 || r.ok) return res.status(200).json({ ok: true });
    const err = await r.json().catch(() => ({}));
    return res.status(502).json({ erro: (err.error && err.error.message) || "Erro ao cancelar o evento" });
  }

  // CRIAR
  const { titulo, inicio, fim, timeZone, participantes, local, descricao } = req.body || {};
  if (!titulo || !inicio || !fim) return res.status(400).json({ erro: "Informe título, início e fim." });

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
