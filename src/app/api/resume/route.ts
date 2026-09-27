import mammoth from "mammoth";
import { checkOrigin, failure, readBody } from "@/server/http";
import { session, rateLimit } from "@/server/security";
import { resumeInputIssue } from "@/lib/input-quality";
import { createResumePDFParser } from "@/server/resume-pdf";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (Number(request.headers.get("content-length") || 0) > 4 * 1024 * 1024)
    return Response.json(
      { error: "Choose a file smaller than 3 MB." },
      { status: 413, headers },
    );
  try {
    checkOrigin(request);
    const user = await session();
    await rateLimit(`extract:${user.id}`, 15, 3600000);
    const bytes = await readBody(request, 4 * 1024 * 1024);
    const form = await new Response(new Uint8Array(bytes), {
      headers: { "Content-Type": request.headers.get("content-type") || "" },
    }).formData();
    const file = form.get("file");
    if (!(file instanceof File))
      return Response.json(
        { error: "Choose a résumé file." },
        { status: 400, headers },
      );
    if (file.size > 3 * 1024 * 1024)
      return Response.json(
        { error: "Choose a file smaller than 3 MB." },
        { status: 413, headers },
      );
    const ext = file.name.split(".").pop()?.toLowerCase();
    let text = "";
    const buffer = Buffer.from(await file.arrayBuffer());
    if (ext === "txt")
      text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    else if (ext === "pdf") {
      if (!buffer.subarray(0, 5).equals(Buffer.from("%PDF-")))
        return Response.json(
          { error: "This file is not a valid PDF. Paste its text instead." },
          { status: 422, headers },
        );
      const parser = await createResumePDFParser(buffer);
      try {
        if ((await parser.getInfo()).total > 20)
          return Response.json(
            {
              error:
                "Choose a résumé with 20 pages or fewer, or paste the relevant text.",
            },
            { status: 422, headers },
          );
        text = (await parser.getText({ first: 20 })).text;
      } finally {
        await parser.destroy();
      }
    } else if (ext === "docx") {
      if (!buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])))
        return Response.json(
          {
            code: "INVALID_RESUME_FILE",
            error: "This is not a valid DOCX file.",
          },
          { status: 422, headers },
        );
      text = (await mammoth.extractRawText({ buffer })).value;
    } else
      return Response.json(
        { error: "Choose a text PDF, DOCX, or TXT file." },
        { status: 415, headers },
      );
    if (text.replace(/--\s*\d+\s*of\s*\d+\s*--/g, "").trim().length < 20)
      return Response.json(
        {
          error:
            "No usable text was found. Scanned documents need OCR; paste the text or continue with your interests.",
        },
        { status: 422, headers },
      );
    if (text.length > 50000)
      return Response.json(
        {
          error:
            "This document contains too much text. Upload a shorter résumé or paste the relevant passages.",
        },
        { status: 422, headers },
      );
    if (resumeInputIssue(text))
      return Response.json(
        {
          code: "NOT_RESUME",
          error:
            "This does not look like a readable resume or personal background. Upload a resume or describe your education and experience.",
        },
        { status: 422, headers },
      );
    return Response.json(
      { text: text.trim(), mode: "text-extraction", retainedFile: false },
      { headers },
    );
  } catch (error) {
    if (error instanceof Error && "status" in error) return failure(error);
    return Response.json(
      {
        error:
          "The file could not be read. It may be damaged or password-protected. Paste the text or continue without it.",
      },
      { status: 422, headers },
    );
  }
}
