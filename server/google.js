// Helpers de servidor pra integracao Google (usados pelas funcoes /api/google/*).
// NUNCA importado pelo front: usa a service_role do Supabase e o secret do Google.
import { createClient } from "@supabase/supabase-js";

export function admin() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function userFromToken(token) {
  if (!token) return null;
  const { data } = await admin().auth.getUser(token);
  return (data && data.user) || null;
}

export async function refreshAccessToken(refreshToken) {
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  return r.json();
}
