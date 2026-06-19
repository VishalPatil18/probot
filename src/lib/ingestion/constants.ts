// Constants only - safe to import from client components without dragging
// the pdf-parse runtime (and its Node-only `fs` dependency) into the browser
// bundle. Server-side code should keep importing from `./extract-pdf`.
export const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_PDF_FILES = 5;
export const PDF_MIME_TYPE = "application/pdf";
