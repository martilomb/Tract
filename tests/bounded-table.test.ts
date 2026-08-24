import { describe, expect, it } from "vitest";

import { buildBoundedTablePage } from "../src/domain/bounded-table";

describe("bounded enterprise tables", () => {
  it("sorts and bounds a 17,000-part fixture without rendering the full result", () => {
    const parts = Array.from({ length: 17_000 }, (_, index) => ({
      id: index,
      partNumber: `PART-${String(17_000 - index).padStart(5, "0")}`,
    }));
    const result = buildBoundedTablePage({
      rows: parts,
      page: 2,
      pageSize: 50,
      direction: "ascending",
      compare: (left, right) => left.partNumber.localeCompare(right.partNumber),
    });

    expect(result.totalRows).toBe(17_000);
    expect(result.rows).toHaveLength(50);
    expect(result.pageCount).toBe(340);
    expect(result.rows[0]?.partNumber).toBe("PART-00051");
  });

  it("bounds a 200-program selector page and clamps an invalid high page", () => {
    const result = buildBoundedTablePage({
      rows: Array.from({ length: 200 }, (_, id) => ({ id })),
      page: 99,
      pageSize: 25,
      direction: "descending",
      compare: (left, right) => left.id - right.id,
    });

    expect(result.page).toBe(8);
    expect(result.rows).toHaveLength(25);
    expect(result.rows[0]?.id).toBe(24);
  });

  it("rejects a page size above the governed render bound", () => {
    expect(() =>
      buildBoundedTablePage({
        rows: [1, 2, 3],
        page: 1,
        pageSize: 101,
        direction: "none",
        compare: (left, right) => left - right,
      }),
    ).toThrow("Rendered table page size must be between 1 and 100");
  });
});
