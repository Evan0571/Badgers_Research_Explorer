import { randomUUID } from "node:crypto";
import { db, transaction } from "./db";
import { AppError } from "./http";
import type { JobStatus } from "@/lib/contracts";
export const JOB_TIMEOUT_MS = 270_000;

export async function createJob(sessionId: string, kind: string) {
  return await transaction(async () => {
    const busy = await db()
      .prepare(
        "SELECT id FROM jobs WHERE session_id=? AND kind=? AND state='running' AND updated_at>?",
      )
      .get(sessionId, kind, Date.now() - 300000);
    if (busy)
      throw new AppError(
        "JOB_RUNNING",
        "A request is already running. Wait for it to finish before starting another.",
        409,
      );
    const id = randomUUID(),
      now = Date.now();
    await db()
      .prepare(
        "INSERT INTO jobs(id,session_id,kind,state,stage,created_at,updated_at) VALUES(?,?,?,'running','Starting',?,?)",
      )
      .run(id, sessionId, kind, now, now);
    return id;
  });
}
export async function runJob(
  id: string,
  work: (
    progress: (stage: string, partial?: unknown) => void | Promise<void>,
  ) => Promise<unknown>,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const running = work(async (stage, partial) => {
      const current = await db()
        .prepare("SELECT state FROM jobs WHERE id=?")
        .get(id);
      if (current?.state !== "running")
        throw new AppError("JOB_STOPPED", "This task has stopped.");
      await db()
        .prepare(
          "UPDATE jobs SET stage=?,updated_at=?,payload=COALESCE(?,payload) WHERE id=? AND state='running'",
        )
        .run(
          stage,
          Date.now(),
          partial === undefined ? null : JSON.stringify(partial),
          id,
        );
    });
    const result = await Promise.race([
      running,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new AppError(
                "JOB_TIMEOUT",
                "The search took too long. Please try a more specific question.",
              ),
            ),
          JOB_TIMEOUT_MS,
        );
      }),
    ]);
    await db()
      .prepare(
        "UPDATE jobs SET state='succeeded',stage='Complete',payload=?,updated_at=? WHERE id=? AND state='running'",
      )
      .run(JSON.stringify(result), Date.now(), id);
  } catch (error) {
    await db()
      .prepare(
        "UPDATE jobs SET state='failed',stage='Stopped',error=?,updated_at=? WHERE id=? AND state='running'",
      )
      .run(
        error instanceof AppError
          ? error.message
          : "This request failed. Your saved work has not been replaced.",
        Date.now(),
        id,
      );
  } finally {
    clearTimeout(timer);
  }
}
export async function stopJob(id: string, sessionId: string) {
  await getJob(id, sessionId);
  await db()
    .prepare(
      "UPDATE jobs SET state='failed',stage='Stopped',error='This task was cancelled.',updated_at=? WHERE id=? AND session_id=? AND state='running'",
    )
    .run(Date.now(), id, sessionId);
  return await getJob(id, sessionId);
}
export async function getJob(
  id: string,
  sessionId: string,
): Promise<JobStatus> {
  const row = (await db()
    .prepare("SELECT * FROM jobs WHERE id=? AND session_id=?")
    .get(id, sessionId)) as
    | {
        id: string;
        kind: string;
        state: JobStatus["state"];
        stage: string;
        payload: string | null;
        error: string | null;
        updated_at: number;
        created_at: number;
      }
    | undefined;
  if (!row)
    throw new AppError(
      "JOB_NOT_FOUND",
      "This task does not belong to your session or has expired.",
      404,
    );
  if (
    row.state === "running" &&
    (row.updated_at < Date.now() - 300000 ||
      row.created_at < Date.now() - JOB_TIMEOUT_MS)
  ) {
    row.state = "failed";
    row.error =
      "The server was interrupted or the request timed out. Please retry.";
    await db()
      .prepare(
        "UPDATE jobs SET state='failed',error=? WHERE id=? AND state='running'",
      )
      .run(row.error, id);
  }
  return {
    id: row.id,
    kind: row.kind,
    state: row.state,
    stage: row.stage,
    startedAt: row.created_at,
    ...(row.payload ? { result: JSON.parse(row.payload) } : {}),
    ...(row.error ? { error: row.error } : {}),
  };
}
