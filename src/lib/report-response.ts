import { csvResponse, toCsv } from "./csv";
import { toXlsxBuffer, xlsxResponse } from "./excel";
import { pdfResponse, toPdfBuffer } from "./pdf";

export type ReportFormat = "csv" | "xlsx" | "pdf";

export function parseReportFormat(value: string | null): ReportFormat {
  return value === "xlsx" || value === "pdf" ? value : "csv";
}

/** Single dispatch point so every report route supports all 3 formats identically instead of re-deriving the branch. */
export async function reportResponse(
  format: ReportFormat,
  filenameBase: string,
  title: string,
  headers: string[],
  rows: (string | number)[][],
): Promise<Response> {
  if (format === "xlsx") {
    return xlsxResponse(filenameBase, toXlsxBuffer(title, headers, rows));
  }
  if (format === "pdf") {
    return pdfResponse(filenameBase, await toPdfBuffer(title, headers, rows));
  }
  return csvResponse(filenameBase, toCsv(headers, rows));
}
