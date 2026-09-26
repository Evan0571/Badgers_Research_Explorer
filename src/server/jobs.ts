import { randomUUID } from "node:crypto";
import { db, transaction } from "./db";
import { AppError } from "./http";
import type { JobStatus } from "@/lib/contracts";

export function createJob(sessionId: string, kind: string) {
  return transaction(() => {
    const busy = db()
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
    db()
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
    progress: (stage: string, partial?: unknown) => void,
  ) => Promise<unknown>,
) {
  try {
    const result = await work((stage, partial) => {
      db()
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
    db()
      .prepare(
        "UPDATE jobs SET state='succeeded',stage='Complete',payload=?,updated_at=? WHERE id=? AND state='running'",
      )
      .run(JSON.stringify(result), Date.now(), id);
  } catch (error) {
    db()
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
  }
}
export function getJob(id: string, sessionId: string): JobStatus {
  const row = db()
    .prepare("SELECT * FROM jobs WHERE id=? AND session_id=?")
    .get(id, sessionId) as
    | {
        id: string;
        kind: string;
        state: JobStatus["state"];
        stage: string;
        payload: string | null;
        error: string | null;
        updated_at: number;
      }
    | undefined;
  if (!row)
    throw new AppError(
      "JOB_NOT_FOUND",
      "This task does not belong to your session or has expired.",
      404,
    );
  if (row.state === "running" && row.updated_at < Date.now() - 300000) {
    row.state = "failed";
    row.error =
      "The server was interrupted or the request timed out. Please retry.";
    db()
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
    ...(row.payload ? { result: JSON.parse(row.payload) } : {}),
    ...(row.error ? { error: row.error } : {}),
  };
}
