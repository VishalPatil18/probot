import { describe, expect, it } from "vitest";

import { IngestionError } from "./errors";
import {
  MAX_PDF_BYTES,
  MAX_PDF_FILES,
  PDF_MIME_TYPE,
  extractPdfText,
} from "./extract-pdf";

describe("extractPdfText", () => {
  it("rejects empty buffer as invalid_file_type", async () => {
    await expect(extractPdfText(Buffer.alloc(0))).rejects.toMatchObject({
      category: "invalid_file_type",
    });
  });

  it("rejects oversized buffer as file_too_large", async () => {
    // Build a buffer that starts with PDF magic but exceeds the cap.
    // 10MB + 1 byte; magic at the head doesn't matter because size check comes first.
    const oversize = Buffer.alloc(MAX_PDF_BYTES + 1, 0);
    await expect(extractPdfText(oversize)).rejects.toMatchObject({
      category: "file_too_large",
    });
  });

  it("rejects non-PDF magic bytes as invalid_file_type", async () => {
    const notPdf = Buffer.from("This is not a PDF file at all, just text.");
    await expect(extractPdfText(notPdf)).rejects.toMatchObject({
      category: "invalid_file_type",
    });
  });

  it("rejects PDF-magic-but-corrupt as pdf_unreadable", async () => {
    // Starts with %PDF- so it passes the magic check, but the rest is garbage
    // so pdf-parse will throw.
    const corrupt = Buffer.concat([
      Buffer.from("%PDF-1.4\n"),
      Buffer.from("this is not a valid PDF body, just noise"),
    ]);
    try {
      await extractPdfText(corrupt);
      expect.fail("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(IngestionError);
      // pdf-parse may either throw (pdf_unreadable) or return empty text
      // (empty_extract) depending on how far it gets. Both are acceptable
      // failure modes for malformed PDF-shaped input.
      const cat = (e as IngestionError).category;
      expect(["pdf_unreadable", "empty_extract"]).toContain(cat);
    }
  });

  it("exports stable public limits", () => {
    expect(MAX_PDF_BYTES).toBe(10 * 1024 * 1024);
    expect(MAX_PDF_FILES).toBe(5);
    expect(PDF_MIME_TYPE).toBe("application/pdf");
  });
});
