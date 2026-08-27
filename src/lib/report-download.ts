import type { CurrentScopeReport } from "@/domain/reports";
import { safeSpreadsheetCell, toCsv } from "@/domain/reports";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function downloadCurrentScopeCsv(name: string, report: CurrentScopeReport) {
  downloadBlob(name, new Blob([currentScopeCsv(report)], { type: "text/csv;charset=utf-8" }));
}

export function currentScopeCsv(report: CurrentScopeReport): string {
  return toCsv(report.rows.length ? report.rows : [report.metadata]);
}

export async function currentScopeXlsxBuffer(report: CurrentScopeReport): Promise<ArrayBuffer> {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Tract";
  workbook.created = new Date(report.metadata["As of"] ?? Date.now());

  const metadata = workbook.addWorksheet("Report metadata");
  metadata.columns = [
    { header: "Field", key: "field", width: 28 },
    { header: "Value", key: "value", width: 64 },
  ];
  for (const [field, value] of Object.entries(report.metadata)) {
    metadata.addRow({ field: safeSpreadsheetCell(field), value: safeSpreadsheetCell(value) });
  }
  metadata.getRow(1).font = { bold: true };
  metadata.views = [{ state: "frozen", ySplit: 1 }];

  const data = workbook.addWorksheet("Current scope data");
  const headers = Object.keys(report.rows[0] ?? report.metadata);
  data.columns = headers.map((header) => ({
    header,
    key: header,
    width: Math.min(Math.max(header.length + 2, 16), 42),
  }));
  for (const row of report.rows) {
    data.addRow(
      Object.fromEntries(headers.map((header) => [header, safeSpreadsheetCell(row[header] ?? "")])),
    );
  }
  data.getRow(1).font = { bold: true };
  data.views = [{ state: "frozen", ySplit: 1 }];
  data.autoFilter = {
    from: "A1",
    to: { row: Math.max(1, report.rows.length + 1), column: headers.length },
  };

  return workbook.xlsx.writeBuffer() as Promise<ArrayBuffer>;
}

export async function downloadCurrentScopeXlsx(name: string, report: CurrentScopeReport) {
  const buffer = await currentScopeXlsxBuffer(report);
  downloadBlob(name, new Blob([buffer], { type: XLSX_MIME }));
}

function downloadBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
