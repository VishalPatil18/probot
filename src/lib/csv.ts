// RFC 4180-compliant CSV serializer for the lead export endpoint.
//
// Escape rules: a cell containing `,`, `"`, `\r`, `\n`, U+2028 (LINE
// SEPARATOR), or U+2029 (PARAGRAPH SEPARATOR) is wrapped in double
// quotes; any inner `"` is doubled. Line terminator is `\r\n`. UTF-8 BOM
// is prepended so Excel opens non-ASCII content without mojibake.
//
// U+2028 and U+2029 must be quoted because Google Sheets and older Excel
// parsers treat them as row terminators in unquoted cells, which would
// silently split a context_summary across CSV rows when a recruiter's
// browser produces them via plain text input. The regex is constructed
// from a string with backslash-u escape sequences because those code
// points are also JS source-level line terminators that would close a
// regex literal mid-pattern.
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
