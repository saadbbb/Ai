import * as XLSX from "xlsx";

/** Excel counterpart to toCsv/csvResponse (src/lib/csv.ts) — same headers/rows shape, every existing report reuses both. */
export function toXlsxBuffer(sheetName: string, headers: string[], rows: (string | number)[][]): Buffer {
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export function xlsxResponse(filenameBase: string, buffer: Buffer): Response {
  const date = new Date().toISOString().slice(0, 10);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filenameBase}-${date}.xlsx"`,
    },
  });
}
