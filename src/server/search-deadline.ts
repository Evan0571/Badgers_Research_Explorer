import { AppError } from "./http";

export const WEB_SEARCH_LIMIT_MS = 60_000;

/** Bound the whole web lookup, not each of its sequential network requests. */
export async function withSearchDeadline<T>(
  work: (signal: AbortSignal) => Promise<T>,
  timeoutMs = WEB_SEARCH_LIMIT_MS,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work(controller.signal),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          const error = new AppError(
            "WEB_SEARCH_TIMEOUT",
            "The web search reached its time limit. Catalog results are still available.",
            504,
          );
          controller.abort(error);
          reject(error);
        }, timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}
