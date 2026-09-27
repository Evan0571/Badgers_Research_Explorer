import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadResume } from "./resume-upload";
import { errorCopy } from "./error-copy";

const file = new File(["synthetic resume"], "resume.pdf", {
  type: "application/pdf",
});
afterEach(() => vi.unstubAllGlobals());

describe("resume upload responses", () => {
  it("uploads multipart data and returns the extracted text", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        Response.json({ text: "Education: UW student. Research experience." }),
      );
    vi.stubGlobal("fetch", fetcher);
    expect(await uploadResume(file)).toBe(
      "Education: UW student. Research experience.",
    );
    const [path, init] = fetcher.mock.calls[0];
    expect(path).toBe("/api/resume");
    expect(init.method).toBe("POST");
    expect(init.body.get("file").name).toBe("resume.pdf");
    expect(init.headers).toBeUndefined(); // Browser supplies the multipart boundary.
  });

  it.each([
    ["empty server error", "", 500],
    ["HTML gateway error", "<html>Bad Gateway</html>", 502],
    ["empty successful response", "", 200],
    ["missing extracted text", "{}", 200],
    ["null response", "null", 200],
    ["non-string extracted text", '{"text":42}', 200],
  ])("gives recovery guidance for %s", async (_name, body, status) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(body, { status })),
    );
    await expect(uploadResume(file)).rejects.toThrow(
      "Try again, upload a DOCX or TXT file, or enter your background manually.",
    );
  });

  it("preserves a useful JSON validation error", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ error: "This is not a valid PDF." }, { status: 422 }),
        ),
    );
    await expect(uploadResume(file)).rejects.toThrow(
      "This is not a valid PDF.",
    );
  });

  it("recognizes a hosting size rejection without JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("Request Entity Too Large", { status: 413 }),
        ),
    );
    await expect(uploadResume(file)).rejects.toThrow("smaller than 3 MB");
  });

  it.each([
    [
      new DOMException("timed out", "TimeoutError"),
      "The upload took too long.",
    ],
    [new TypeError("Failed to fetch"), "The upload connection failed."],
  ])(
    "explains transport failure without exposing a browser exception",
    async (error, message) => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(error));
      await expect(uploadResume(file)).rejects.toThrow(message);
    },
  );

  it("keeps upload timeout guidance specific in Chinese", () => {
    expect(
      errorCopy(
        "The upload took too long. Try again or enter your background manually.",
        "zh",
      ),
    ).toBe("上传等待超时。请重试，或手动填写背景信息。");
  });
});
