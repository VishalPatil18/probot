export type IngestFileResult = {
  name: string;
  ok: boolean;
  error?: string;
  category?: string;
};

export type IngestFailure = { name: string; error: string };

const INGEST_MESSAGES: Record<string, string> = {
  file_too_large: "Too large to process.",
  invalid_file_type: "Not a valid PDF.",
  pdf_unreadable: "Couldn't read this PDF (encrypted or corrupt).",
  empty_extract: "No readable text found in this PDF.",
  too_many_files: "Too many files.",
  empty_input: "The file was empty.",
};

export function describeIngestFailure(file: IngestFileResult): string {
  return (
    (file.category ? INGEST_MESSAGES[file.category] : undefined) ??
    "Couldn't process this file."
  );
}

export function collectFailures(
  files: IngestFileResult[] | undefined,
): IngestFailure[] {
  return (files ?? [])
    .filter((f) => !f.ok)
    .map((f) => ({ name: f.name, error: describeIngestFailure(f) }));
}
