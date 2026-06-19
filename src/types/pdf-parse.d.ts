// pdf-parse@1.1.1 ships demo code on the package entrypoint that breaks
// Next.js bundling. We import the lib file directly as a workaround; this
// declaration mirrors the shape of the upstream `Result` type for the
// subpath since @types/pdf-parse only declares the package root.
declare module "pdf-parse/lib/pdf-parse.js" {
  interface PdfParseResult {
    text: string;
    numpages: number;
  }
  function pdfParse(
    data: Buffer,
    opts?: { max?: number },
  ): Promise<PdfParseResult>;
  export default pdfParse;
  export = pdfParse;
}
