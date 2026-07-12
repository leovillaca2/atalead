import ModelosEditor from "../components/ModelosEditor.jsx";

export default function Modelos() {
  return (
    <div className="screen" style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 720 }}>
      <div>
        <h1>Modelos de ata</h1>
        <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 2 }}>
          Cada tipo de reunião muda o foco de como a Tess processa a transcrição. O formato da ata continua o mesmo (resumo, decisões, próximos passos, lead).
        </div>
      </div>
      <ModelosEditor />
    </div>
  );
}
