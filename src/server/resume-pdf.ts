import { AppError } from "./http";

export async function createResumePDFParser(data: Uint8Array) {
  try {
    // Initialize the supported Node canvas globals before PDF.js is evaluated.
    // Lazy loading keeps parser startup failures inside the route's JSON boundary
    // and leaves TXT/DOCX extraction independent of PDF dependencies.
    const { CanvasFactory, getData } = await import("pdf-parse/worker");
    const { PDFParse } = await import("pdf-parse");
    PDFParse.setWorker(getData());
    return new PDFParse({ data, CanvasFactory });
  } catch {
    throw new AppError(
      "PDF_EXTRACTION_UNAVAILABLE",
      "PDF reading is temporarily unavailable. Try again or upload a DOCX or TXT file.",
      503,
    );
  }
}
