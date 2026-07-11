// Extrai texto de PDF, Word (.docx) ou TXT NO NAVEGADOR.
// O arquivo nunca sai da maquina do usuario: so o texto extraido segue pra Tess.
// As libs pesadas (pdf.js, mammoth) sao carregadas SOB DEMANDA (import dinamico),
// pra nao pesar no carregamento inicial do app.

export async function extrairTexto(file) {
  const nome = (file.name || "").toLowerCase();

  if (nome.endsWith(".txt") || (file.type || "").startsWith("text/")) {
    return (await file.text()).trim();
  }

  if (nome.endsWith(".docx")) {
    const mammoth = (await import("mammoth/mammoth.browser")).default;
    const arrayBuffer = await file.arrayBuffer();
    const { value } = await mammoth.extractRawText({ arrayBuffer });
    return (value || "").trim();
  }

  if (nome.endsWith(".pdf") || file.type === "application/pdf") {
    const pdfjsLib = await import("pdfjs-dist");
    const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
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
