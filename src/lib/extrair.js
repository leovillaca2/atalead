// Extrai texto de PDF, Word (.docx) ou TXT NO NAVEGADOR.
// O arquivo nunca sai da maquina do usuario: so o texto extraido segue pra Tess.
import * as pdfjsLib from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import mammoth from "mammoth/mammoth.browser";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export async function extrairTexto(file) {
  const nome = (file.name || "").toLowerCase();

  if (nome.endsWith(".txt") || (file.type || "").startsWith("text/")) {
    return (await file.text()).trim();
  }

  if (nome.endsWith(".docx")) {
    const arrayBuffer = await file.arrayBuffer();
    const { value } = await mammoth.extractRawText({ arrayBuffer });
    return (value || "").trim();
  }

  if (nome.endsWith(".pdf") || file.type === "application/pdf") {
    const data = new Uint8Array(await file.arrayBuffer());
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    let texto = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      texto += content.items.map((it) => it.str).join(" ") + "\n";
    }
    return texto.trim();
  }

  throw new Error("Formato não suportado. Use PDF, Word (.docx) ou TXT.");
}
