import { createClient } from "@supabase/supabase-js";

// O navegador usa APENAS a chave anon (publica por design, protegida por RLS).
// Nenhuma chave secreta (service_role, Tess, Evernote, Pipedrive) chega aqui.
const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && anon ? createClient(url, anon) : null;
