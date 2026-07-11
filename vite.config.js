import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Somente variaveis com prefixo VITE_ vao para o navegador.
// TESS_API_KEY, EVERNOTE_DEV_TOKEN, PIPEDRIVE_API_TOKEN e SERVICE_ROLE
// nunca sao expostas ao cliente: elas so existem nas funcoes /api (servidor).
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
});
