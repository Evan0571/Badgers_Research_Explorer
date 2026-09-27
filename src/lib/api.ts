import type { JobStatus } from "./contracts";
export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public terminal = false,
    public code = "",
  ) {
    super(message);
  }
}
export async function requestJSON<T>(
  path: string,
  input?: unknown,
  method = "POST",
  signal?: AbortSignal,
  timeoutMs = 150000,
): Promise<T> {
  const response = await fetch(
    path,
    input === undefined
      ? {
          cache: "no-store",
          method: method === "POST" ? "GET" : method,
          signal: signal
            ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)])
            : AbortSignal.timeout(timeoutMs),
        }
      : {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
          signal: signal
            ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)])
            : AbortSignal.timeout(timeoutMs),
        },
  );
  const result = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new APIError(
      result.error ||
        "The server could not complete this request. Try again later.",
      response.status,
      [401, 404].includes(response.status),
      result.code || "",
    );
  return result as T;
}
export async function waitForJob(
  id: string,
  onProgress: (stage: string, partial?: unknown, startedAt?: number) => void,
  signal?: AbortSignal,
) {
  const deadline = Date.now() + 600000;
  while (!signal?.aborted && Date.now() < deadline) {
    const job = await requestJSON<JobStatus>(
      `/api/jobs/${encodeURIComponent(id)}`,
      undefined,
      "GET",
      signal,
      12000,
    );
    signal?.throwIfAborted();
    if (job.state === "succeeded") return job.result;
    if (job.state === "failed")
      throw new APIError(job.error || "This task did not complete.", 200, true);
    onProgress(job.stage, job.result, job.startedAt);
    await new Promise<void>((resolve, reject) => {
      const abort = () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      };
      const timer = setTimeout(() => {
        signal?.removeEventListener("abort", abort);
        resolve();
      }, 1000);
      signal?.addEventListener("abort", abort, { once: true });
    });
  }
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  throw new Error(
    "This request is taking too long. Reload to check its saved status.",
  );
}
