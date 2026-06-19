// Typed taxonomy for ingestion failures.
// The API layer maps `category` → HTTP status; the message is for server logs
// (never echoed verbatim to the chat path).
export type IngestionErrorCategory =
  | "invalid_file_type"
  | "file_too_large"
  | "too_many_files"
  | "pdf_unreadable"
  | "empty_extract"
  | "empty_input";

export class IngestionError extends Error {
  readonly category: IngestionErrorCategory;

  constructor(category: IngestionErrorCategory, message: string) {
    super(message);
    this.name = "IngestionError";
    this.category = category;
  }
}
