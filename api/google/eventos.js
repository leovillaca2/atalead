// Le os proximos eventos do Google Calendar do usuario (servidor, token protegido).
import { admin, refreshAccessToken } from "../../server/google.js";

export default async function handler(req, res) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const { data: u } = await admin().auth.getUser(token);
  const user = u && u.user;
  if (!user) return res.status(401).json({ erro: "não autenticado" });

  const { data: row } = await admin().from("google_conta").select("refresh_token").eq("user_id", user.id).maybeSingle();
  if (!row || !row.refresh_token) return res.status(200).json({ conectado: false, eventos: [] });

  const tok = await refreshAccessToken(row.refresh_token);
  if (!tok.access_token) return res.status(200).json({ conectado: false, eventos: [], erro: "reautenticar" });

  const now = Date.now();
  const timeMin = new Date(now - 7 * 864e5).toISOString();
  const timeMax = new Date(now + 30 * 864e5).toISOString();
  const url =
    "https://www.googleapis.com/calendar/v3/calendars/primary/events" +
    `?singleEvents=true&orderBy=startTime&maxResults=50&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`;

  const data = await (await fetch(url, { headers: { Authorization: `Bearer ${tok.access_token}` } })).json();
  if (data.error) return res.status(502).json({ conectado: true, eventos: [], erro: data.error.message || "Erro no Calendar" });

  const eventos = (data.items || []).map((e) => ({
    id: e.id,
    titulo: e.summary || "(sem título)",
    inicio: (e.start && (e.start.dateTime || e.start.date)) || null,
    fim: (e.end && (e.end.dateTime || e.end.date)) || null,
    local: e.location || null,
    participantes: (e.attendees || [])
      .filter((a) => !a.self && !a.resource)
      .map((a) => ({
        nome: a.displayName || (a.email ? a.email.split("@")[0] : ""),
        email: a.email || "",
        empresa: a.email ? (a.email.split("@")[1] || "").split(".")[0] : "",
      })),
  }));
  return res.status(200).json({ conectado: true, eventos });
}
