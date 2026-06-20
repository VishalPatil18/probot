import { describe, expect, it } from "vitest";

import { escapeCsvCell, toCsv } from "./csv";

const BOM = "﻿";

describe("escapeCsvCell", () => {
  it("returns empty string for null/undefined", () => {
    expect(escapeCsvCell(null)).toBe("");
    expect(escapeCsvCell(undefined)).toBe("");
  });

  it("returns plain value when no special chars present", () => {
    expect(escapeCsvCell("jane@example.com")).toBe("jane@example.com");
  });

  it("wraps in quotes when value contains a comma", () => {
    expect(escapeCsvCell("Smith, Jane")).toBe('"Smith, Jane"');
  });

  it("doubles internal quotes and wraps", () => {
    expect(escapeCsvCell('she said "hi"')).toBe('"she said ""hi"""');
  });

  it("wraps on CR or LF", () => {
    expect(escapeCsvCell("line1\nline2")).toBe('"line1\nline2"');
    expect(escapeCsvCell("line1\r\nline2")).toBe('"line1\r\nline2"');
  });

  it("wraps on U+2028 (LINE SEPARATOR) and U+2029 (PARAGRAPH SEPARATOR)", () => {
    expect(escapeCsvCell("line1 line2")).toBe('"line1 line2"');
    expect(escapeCsvCell("para1 para2")).toBe('"para1 para2"');
  });
});

describe("toCsv", () => {
  it("emits header + rows separated by CRLF and prefixed with BOM", () => {
    type Row = { email: string; name: string };
    const rows: Row[] = [
      { email: "a@x.com", name: "Alice" },
      { email: "b@x.com", name: "Bob" },
    ];
    const out = toCsv(rows, [
      { header: "email", cell: (r) => r.email },
      { header: "name", cell: (r) => r.name },
    ]);
    expect(out.startsWith(BOM)).toBe(true);
    const body = out.slice(BOM.length);
    expect(body).toBe("email,name\r\na@x.com,Alice\r\nb@x.com,Bob\r\n");
  });

  it("escapes cells with commas + quotes", () => {
    const out = toCsv(
      [{ a: 'has "quote", and comma' }],
      [{ header: "a", cell: (r) => r.a }],
    );
    expect(out).toContain('"has ""quote"", and comma"');
  });

  it("emits a header-only file for an empty rows array", () => {
    const out = toCsv([] as readonly { x: string }[], [
      { header: "x", cell: (r) => r.x },
    ]);
    expect(out.slice(BOM.length)).toBe("x\r\n");
  });

  it("handles null cells by emitting empty fields", () => {
    const out = toCsv(
      [{ a: "x", b: null as string | null }],
      [
        { header: "a", cell: (r) => r.a },
        { header: "b", cell: (r) => r.b },
      ],
    );
    expect(out.slice(BOM.length)).toBe("a,b\r\nx,\r\n");
  });
});
