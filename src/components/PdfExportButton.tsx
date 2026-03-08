import jsPDF from "jspdf";

export default function PdfExportButton({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  const exportPdf = () => {
    const pdf = new jsPDF();
    pdf.setFontSize(14);
    pdf.text(title, 10, 10);
    pdf.setFontSize(11);
    pdf.text(content, 10, 20);
    pdf.save(`${title}.pdf`);
  };

  return (
    <button
      onClick={exportPdf}
      style={{
        padding: "10px 16px",
        background: "#22c55e",
        color: "#000",
        borderRadius: "8px",
        border: "none",
        cursor: "pointer",
        marginBottom: "16px",
      }}
    >
      📄 Export as PDF
    </button>
  );
}
