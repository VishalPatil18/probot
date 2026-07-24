const CSV_NEEDS_QUOTE = new RegExp("[\",\\r\\n\\u2028\\u2029]");
const BOM = "﻿";

export function escapeCsvCell(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  if (!CSV_NEEDS_QUOTE.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

export function toCsv<T>(
  rows: readonly T[],
  columns: ReadonlyArray<{
    header: string;
    cell: (row: T) => string | null | undefined;
  }>,
): string {
  const headerLine = columns
    .map((c) => escapeCsvCell(c.header))
    .join(",");
  const dataLines = rows.map((row) =>
    columns.map((c) => escapeCsvCell(c.cell(row))).join(","),
  );
  return BOM + [headerLine, ...dataLines].join("\r\n") + "\r\n";
}
