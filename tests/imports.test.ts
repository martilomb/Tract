import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";

import { importFingerprint, parseCsv, stageVolumeRows } from "@/domain/imports";
import { readFirstWorksheet } from "@/server/excel-import.server";

const mapping = {
  organizationId: "org-a",
  source: "development-csv",
  columns: {
    externalId: "id",
    occurredOn: "date",
    eventType: "type",
    units: "units",
    partNumber: "part",
  },
  allowedEventTypes: ["actual", "correction", "return"] as const,
};

describe("import staging", () => {
  it("parses quoted CSV and validates every row before commit", () => {
    const rows = parseCsv(
      'id,date,type,units,part\r\n"one,1",2026-08-01,actual,12.50,P-1\r\nbad,08/02/2026,forecast,x,P-2',
    );
    const staged = stageVolumeRows(rows, mapping);
    expect(staged[0]?.normalized?.externalId).toBe("one,1");
    expect(staged[0]?.valid).toBe(true);
    expect(staged[1]?.valid).toBe(false);
    expect(staged[1]?.errors).toHaveLength(3);
  });

  it("creates tenant- and connector-specific idempotency fingerprints", async () => {
    const bytes = new TextEncoder().encode("same file");
    const one = await importFingerprint({ organizationId: "org-a", connectorId: "c1", bytes });
    const two = await importFingerprint({ organizationId: "org-a", connectorId: "c1", bytes });
    const otherTenant = await importFingerprint({
      organizationId: "org-b",
      connectorId: "c1",
      bytes,
    });
    expect(one).toBe(two);
    expect(one).not.toBe(otherTenant);
    expect(one).toHaveLength(64);
  });

  it("reads the first Excel worksheet into the same staging shape", async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Volume");
    worksheet.addRow(["id", "date", "type", "units", "part"]);
    worksheet.addRow(["excel-1", "2026-08-01", "actual", 42, "P-1"]);
    const bytes = new Uint8Array(await workbook.xlsx.writeBuffer());
    const rows = await readFirstWorksheet(bytes);
    expect(rows).toEqual([
      { id: "excel-1", date: "2026-08-01", type: "actual", units: "42", part: "P-1" },
    ]);
    expect(stageVolumeRows(rows, mapping)[0]?.valid).toBe(true);
  });
});
