import ExcelJS from "exceljs";

import { invariant } from "@/domain/errors";

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") return value.text;
    if ("result" in value) return String(value.result ?? "");
    if ("richText" in value && Array.isArray(value.richText))
      return value.richText.map((part) => part.text).join("");
  }
  return String(value);
}

export async function readFirstWorksheet(
  bytes: Uint8Array,
): Promise<readonly Readonly<Record<string, string>>[]> {
  const workbook = new ExcelJS.Workbook();
  const workbookBytes = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(workbookBytes).set(bytes);
  await workbook.xlsx.load(workbookBytes);
  const worksheet = workbook.worksheets[0];
  invariant(worksheet, "Workbook has no worksheets", "invalid_workbook");
  const headers: string[] = [];
  worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell, column) => {
    headers[column - 1] = cellText(cell.value).trim();
  });
  invariant(
    headers.length > 0 && headers.every(Boolean),
    "First worksheet requires a header row",
    "invalid_workbook",
  );
  invariant(
    new Set(headers).size === headers.length,
    "Worksheet headers must be unique",
    "invalid_workbook",
  );

  const rows: Readonly<Record<string, string>>[] = [];
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const record = Object.freeze(
      Object.fromEntries(
        headers.map((header, index) => [header, cellText(row.getCell(index + 1).value).trim()]),
      ),
    );
    if (Object.values(record).some(Boolean)) rows.push(record);
  }
  return Object.freeze(rows);
}
