import { invariant } from "./errors";

export type TableSortDirection = "ascending" | "descending" | "none";

export interface BoundedTablePage<T> {
  rows: readonly T[];
  totalRows: number;
  page: number;
  pageCount: number;
  pageSize: number;
}

export function buildBoundedTablePage<T>(input: {
  rows: readonly T[];
  page: number;
  pageSize: number;
  direction: TableSortDirection;
  compare: (left: T, right: T) => number;
  maximumPageSize?: number;
}): BoundedTablePage<T> {
  const maximumPageSize = input.maximumPageSize ?? 100;
  invariant(
    Number.isInteger(input.pageSize) && input.pageSize > 0 && input.pageSize <= maximumPageSize,
    `Rendered table page size must be between 1 and ${maximumPageSize}`,
    "table_page_size_invalid",
  );
  const ordered =
    input.direction === "none"
      ? input.rows
      : [...input.rows].sort((left, right) =>
          input.direction === "ascending" ? input.compare(left, right) : input.compare(right, left),
        );
  const pageCount = Math.max(1, Math.ceil(ordered.length / input.pageSize));
  const page = Math.min(Math.max(1, Math.trunc(input.page)), pageCount);
  const start = (page - 1) * input.pageSize;
  return Object.freeze({
    rows: Object.freeze(ordered.slice(start, start + input.pageSize)),
    totalRows: ordered.length,
    page,
    pageCount,
    pageSize: input.pageSize,
  });
}
