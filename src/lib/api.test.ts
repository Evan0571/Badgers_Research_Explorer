import { afterEach, expect, it, vi } from "vitest";
import { waitForJob } from "./api";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("does not emit a running progress update for terminal success", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      Response.json({
        state: "succeeded",
        stage: "Complete",
        result: { ok: true },
      }),
    ),
  );
  const progress = vi.fn();
  expect(await waitForJob("one", progress)).toEqual({ ok: true });
  expect(progress).not.toHaveBeenCalled();
});
it("does not apply late responses after a poll is aborted", async () => {
  const controller = new AbortController();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async () => {
      controller.abort();
      return Response.json({ state: "succeeded", result: { stale: true } });
    }),
  );
  const progress = vi.fn();
  await expect(
    waitForJob("one", progress, controller.signal),
  ).rejects.toMatchObject({ name: "AbortError" });
  expect(progress).not.toHaveBeenCalled();
});
it("restores the real start time while resuming a running search", async () => {
  vi.useFakeTimers();
  const startedAt = Date.now() - 40000;
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          state: "running",
          stage: "Searching UW public sources",
          startedAt,
        }),
      )
      .mockResolvedValueOnce(
        Response.json({ state: "succeeded", result: { ok: true } }),
      ),
  );
  const progress = vi.fn();
  const result = waitForJob("resumed", progress);
  await vi.advanceTimersByTimeAsync(1001);
  await result;
  expect(progress).toHaveBeenCalledWith(
    "Searching UW public sources",
    undefined,
    startedAt,
  );
});
it("bounds a hung status fetch instead of leaving the spinner indefinitely", async () => {
  vi.useFakeTimers();
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementation(
        (_url, init) =>
          new Promise((_, reject) =>
            init.signal.addEventListener("abort", () =>
              reject(init.signal.reason),
            ),
          ),
      ),
  );
  // Mock the native timeout factory so fake timers can drive the same cancellation path.
  const timeout = vi.spyOn(AbortSignal, "timeout").mockImplementation((ms) => {
    const c = new AbortController();
    setTimeout(() => c.abort(new DOMException("Timeout", "TimeoutError")), ms);
    return c.signal;
  });
  const assertion = expect(waitForJob("one", vi.fn())).rejects.toMatchObject({
    name: "TimeoutError",
  });
  await vi.advanceTimersByTimeAsync(12001);
  await assertion;
  timeout.mockRestore();
});
