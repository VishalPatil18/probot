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
