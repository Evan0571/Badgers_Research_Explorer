import type { JobStatus } from "./contracts";
export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public terminal = false,
  ) {
    super(message);
  }
}
export async function requestJSON<T>(
  path: string,
  input?: unknown,
  method = "POST",
): Promise<T> {
  const response = await fetch(
    path,
    input === undefined
      ? { cache: "no-store" }
      : {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
  );
  const result = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new APIError(
      result.error ||
        "The server could not complete this request. Try again later.",
      response.status,
      [401, 404].includes(response.status),
    );
  return result as T;
}
export async function waitForJob(
  id: string,
  onProgress: (stage: string, partial?: unknown) => void,
  signal?: AbortSignal,
) {
  const deadline = Date.now() + 600000;
  while (!signal?.aborted && Date.now() < deadline) {
    const job = await requestJSON<JobStatus>(
      `/api/jobs/${encodeURIComponent(id)}`,
    );
    onProgress(job.stage, job.result);
    if (job.state === "succeeded") return job.result;
    if (job.state === "failed")
      throw new APIError(job.error || "This task did not complete.", 200, true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  throw new Error(
    "This request is taking too long. Reload to check its saved status.",
  );
}
