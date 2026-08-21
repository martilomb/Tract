import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";

import {
  cancelImportRun,
  failImportRun,
  importFingerprint,
  parseCsv,
  planImportCommit,
  retryImportRun,
  stageVehicleVolumeRows,
} from "@/domain/imports";
import { readFirstWorksheet } from "@/server/excel-import.server";

const mapping = {
  organizationId: "org-a",
  source: "development-csv",
  columns: {
    externalId: "id",
    periodStart: "period_start",
    periodEnd: "period_end",
    dataKind: "kind",
    units: "units",
    partNumber: "part",
  },
  allowedDataKinds: ["actual", "forecast", "revised", "scenario"] as const,
};

describe("import staging", () => {
  it("parses quoted CSV and validates every row before commit", () => {
    const staged = stageVehicleVolumeRows(
      parseCsv(
        'id,period_start,period_end,kind,units,part\r\n"one,1",2026-08-01,2026-08-31,actual,12.50,P-1\r\nbad,2026-09-01,2026-08-01,unknown,x,P-2',
      ),
      mapping,
    );
    expect(staged[0]?.normalized?.externalId).toBe("one,1");
    expect(staged[0]?.normalized?.sourceUnits).toBe("12.50");
    expect(staged[0]?.normalized).not.toHaveProperty("signedEligibleUnits");
    expect(staged[0]?.valid).toBe(true);
    expect(staged[1]?.valid).toBe(false);
    expect(staged[1]?.sourceExternalId).toBe("bad");
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
    worksheet.addRow(["id", "period_start", "period_end", "kind", "units", "part"]);
    worksheet.addRow(["excel-1", "2026-08-01", "2026-08-31", "actual", 42, "P-1"]);
    const bytes = new Uint8Array(await workbook.xlsx.writeBuffer());
    const rows = await readFirstWorksheet(bytes);
    expect(rows).toEqual([
      {
        id: "excel-1",
        period_start: "2026-08-01",
        period_end: "2026-08-31",
        kind: "actual",
        units: "42",
        part: "P-1",
      },
    ]);
    expect(stageVehicleVolumeRows(rows, mapping)[0]?.valid).toBe(true);
  });

  it("keeps partial failures traceable and requires explicit approval before committing valid rows", () => {
    const rows = stageVehicleVolumeRows(
      parseCsv(
        "id,period_start,period_end,kind,units,part\nok,2026-08-01,2026-08-31,actual,10,P-1\nbad,2026-08-01,2026-08-31,actual,not-a-number,P-2",
      ),
      mapping,
    );
    expect(() =>
      planImportCommit({ rows, allowPartial: false, actorCanApprovePartial: true }),
    ).toThrow(/rejected rows/i);
    expect(() =>
      planImportCommit({ rows, allowPartial: true, actorCanApprovePartial: false }),
    ).toThrow(/approval permission/i);
    expect(planImportCommit({ rows, allowPartial: true, actorCanApprovePartial: true })).toEqual({
      totalRows: 2,
      validRows: 1,
      rejectedRows: 1,
      partial: true,
      committableRowNumbers: [2],
      rejected: [{ rowNumber: 3, errors: ["units must be a decimal number"] }],
    });
  });

  it("retries only failed runs and cancels non-terminal runs with permission and a reason", () => {
    const run = { id: "import-1", status: "validated" as const, attempt: 1 };
    const failed = failImportRun(run, "Provider timeout");
    expect(retryImportRun(failed)).toEqual({ id: "import-1", status: "staged", attempt: 2 });
    expect(
      cancelImportRun({ run, reason: "Superseded source file", actorCanCancel: true }),
    ).toMatchObject({ status: "cancelled", failureReason: "Superseded source file" });
    expect(() =>
      cancelImportRun({ run, reason: "No longer needed", actorCanCancel: false }),
    ).toThrow(/permission/i);
  });
});
