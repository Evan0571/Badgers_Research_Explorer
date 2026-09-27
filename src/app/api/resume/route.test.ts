import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { AppError } from "@/server/http";
import * as pdfRuntime from "@/server/resume-pdf";
import { resumePDF } from "@/test/fixtures/resume-pdf";

vi.mock("@/server/security", () => ({
  session: vi.fn().mockResolvedValue({ id: "synthetic-upload-session" }),
  rateLimit: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/server/config", () => ({
  config: () => ({ origin: "http://127.0.0.1:3002" }),
}));
afterEach(() => vi.restoreAllMocks());

function upload(file: File) {
  const form = new FormData();
  form.set("file", file);
  return POST(
    new Request("http://127.0.0.1:3002/api/resume", {
      method: "POST",
      headers: { origin: "http://127.0.0.1:3002" },
      body: form,
    }),
  );
}

describe("resume extraction boundary", () => {
  it("extracts a real PDF through the Node worker setup", async () => {
    const response = await upload(new File([resumePDF()], "resume.pdf"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      text: expect.stringContaining("Example University"),
      retainedFile: false,
      mode: "text-extraction",
    });
  });

  it("returns JSON with recovery guidance when the PDF runtime cannot start", async () => {
    vi.spyOn(pdfRuntime, "createResumePDFParser").mockRejectedValueOnce(
      new AppError(
        "PDF_EXTRACTION_UNAVAILABLE",
        "PDF reading is temporarily unavailable. Try again or upload a DOCX or TXT file.",
        503,
      ),
    );
    const response = await upload(new File([resumePDF()], "resume.pdf"));
    expect(response.status).toBe(503);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.json()).toMatchObject({
      code: "PDF_EXTRACTION_UNAVAILABLE",
    });
  });

  it("does not initialize the PDF parser for a TXT resume", async () => {
    const parser = vi
      .spyOn(pdfRuntime, "createResumePDFParser")
      .mockRejectedValue(new Error("unavailable"));
    const response = await upload(
      new File(
        ["Education: Example University. Research experience and skills."],
        "resume.txt",
      ),
    );
    expect(response.status).toBe(200);
    expect(parser).not.toHaveBeenCalled();
  });

  it("rejects a disguised non-PDF before initializing the parser", async () => {
    const parser = vi.spyOn(pdfRuntime, "createResumePDFParser");
    const response = await upload(new File(["not a PDF"], "resume.pdf"));
    expect(response.status).toBe(422);
    expect(parser).not.toHaveBeenCalled();
    expect((await response.json()).error).toContain("not a valid PDF");
  });

  it("gives text/OCR guidance for a PDF without readable text", async () => {
    const response = await upload(new File([resumePDF("")], "blank.pdf"));
    expect(response.status).toBe(422);
    expect((await response.json()).error).toContain(
      "Scanned documents need OCR",
    );
  });
});
