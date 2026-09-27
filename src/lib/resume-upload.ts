const unavailable =
  "The upload service is temporarily unavailable. Try again, upload a DOCX or TXT file, or enter your background manually.";

export async function uploadResume(file: File): Promise<string> {
  const form = new FormData();
  form.set("file", file);
  let response: Response;
  try {
    response = await fetch("/api/resume", {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(30000),
    });
  } catch (error) {
    throw new Error(
      error instanceof Error &&
        ["TimeoutError", "AbortError"].includes(error.name)
        ? "The upload took too long. Try again or enter your background manually."
        : "The upload connection failed. Check your connection and try again.",
    );
  }
  // Hosting errors can be empty or HTML, even though our route returns JSON.
  if (response.status === 413)
    throw new Error("Choose a file smaller than 3 MB.");
  const result: unknown = await response.json().catch(() => null);
  const data =
    result && typeof result === "object"
      ? (result as { error?: unknown; text?: unknown })
      : null;
  if (!response.ok)
    throw new Error(
      typeof data?.error === "string" && data.error ? data.error : unavailable,
    );
  if (typeof data?.text !== "string" || !data.text.trim())
    throw new Error(unavailable);
  return data.text;
}
