import PDFDocument from "pdfkit";

const PAGE_MARGIN = 36;
const ROW_HEIGHT = 20;
const FONT_SIZE = 9;

/**
 * Minimal tabular PDF renderer — a plain title + a left-aligned column table,
 * columns sized evenly across the page width. Deliberately simple (no
 * pagination-aware column repeats beyond a fresh header row per page, no
 * styling system) — this exists to make report data downloadable as a PDF,
 * not to be a general reporting engine.
 */
export function toPdfBuffer(title: string, headers: string[], rows: (string | number)[][]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: PAGE_MARGIN, size: "A4", layout: "landscape" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - PAGE_MARGIN * 2;
    const columnWidth = pageWidth / headers.length;

    doc.fontSize(16).text(title, { align: "left" });
    doc.moveDown(0.5);

    function drawRow(values: (string | number)[], y: number, bold: boolean) {
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(FONT_SIZE);
      values.forEach((value, i) => {
        doc.text(String(value ?? ""), PAGE_MARGIN + i * columnWidth, y, {
          width: columnWidth - 4,
          ellipsis: true,
        });
      });
    }

    let y = doc.y;
    drawRow(headers, y, true);
    y += ROW_HEIGHT;
    doc
      .moveTo(PAGE_MARGIN, y - 4)
      .lineTo(doc.page.width - PAGE_MARGIN, y - 4)
      .strokeColor("#cccccc")
      .stroke();

    for (const row of rows) {
      if (y > doc.page.height - PAGE_MARGIN) {
        doc.addPage();
        y = PAGE_MARGIN;
        drawRow(headers, y, true);
        y += ROW_HEIGHT;
      }
      drawRow(row, y, false);
      y += ROW_HEIGHT;
    }

    doc.end();
  });
}

export function pdfResponse(filenameBase: string, buffer: Buffer): Response {
  const date = new Date().toISOString().slice(0, 10);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filenameBase}-${date}.pdf"`,
    },
  });
}
