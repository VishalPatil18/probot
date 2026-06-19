import { MAX_PDF_BYTES, MAX_PDF_FILES, PDF_MIME_TYPE } from "./constants";
import { IngestionError } from "./errors";

// Re-export so existing server-side callers keep working.
export { MAX_PDF_BYTES, MAX_PDF_FILES, PDF_MIME_TYPE };

const PDF_MAGIC = "%PDF-"; // first 5 bytes of a valid PDF

// Dynamic import path bypasses pdf-parse@1.1.1's package entrypoint, which
// runs demo code at module load that tries to read a bundled fixture and
// crashes on Next.js bundling. Importing the lib file directly is the
// well-documented workaround.
type PdfParseFn = (
  data: Buffer,
  opts?: { max?: number },
) => Promise<{ text: string; numpages: number }>;

let cachedPdfParse: PdfParseFn | null = null;
async function loadPdfParse(): Promise<PdfParseFn> {
  if (cachedPdfParse) return cachedPdfParse;
  const mod = (await import("pdf-parse/lib/pdf-parse.js")) as
    | { default: PdfParseFn }
    | PdfParseFn;
  cachedPdfParse = typeof mod === "function" ? mod : mod.default;
  return cachedPdfParse;
}

// Extracts plain text from a PDF buffer. Throws:
//   - IngestionError("invalid_file_type") if the buffer is not a PDF (magic check)
//   - IngestionError("file_too_large") if it exceeds MAX_PDF_BYTES
//   - IngestionError("pdf_unreadable") if pdf-parse rejects (encrypted, corrupt)
//   - IngestionError("empty_extract") if extraction yields no text
export async function extractPdfText(buffer: Buffer): Promise<string> {
  if (buffer.length === 0) {
    throw new IngestionError("invalid_file_type", "Empty buffer");
  }
  if (buffer.length > MAX_PDF_BYTES) {
    throw new IngestionError(
      "file_too_large",
      `PDF exceeds ${MAX_PDF_BYTES} bytes`,
    );
  }
  const head = buffer.subarray(0, PDF_MAGIC.length).toString("ascii");
  if (head !== PDF_MAGIC) {
    throw new IngestionError(
      "invalid_file_type",
      "Buffer does not start with %PDF- magic",
    );
  }

  const pdfParse = await loadPdfParse();
  let result: { text: string };
  try {
    result = await pdfParse(buffer);
  } catch (e: unknown) {
    const reason = e instanceof Error ? e.message : "unknown";
    throw new IngestionError("pdf_unreadable", `pdf-parse failed: ${reason}`);
  }

  const text = result.text?.trim() ?? "";
  if (text.length === 0) {
    throw new IngestionError(
      "empty_extract",
      "PDF contained no extractable text",
    );
  }
  return text;
}
