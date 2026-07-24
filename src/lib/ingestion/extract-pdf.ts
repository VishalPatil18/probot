import { MAX_PDF_BYTES, MAX_PDF_FILES, PDF_MIME_TYPE } from "./constants";
import { IngestionError } from "./errors";

export { MAX_PDF_BYTES, MAX_PDF_FILES, PDF_MIME_TYPE };

const PDF_MAGIC = "%PDF-";

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
