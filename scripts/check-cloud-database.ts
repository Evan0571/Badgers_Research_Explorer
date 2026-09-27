import nextEnv from "@next/env";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { db, transaction } from "../src/server/db";
import {
  rateLimit,
  digest,
  codeDigest,
  type Session,
} from "../src/server/security";
import { createJob, getJob, runJob } from "../src/server/jobs";
import { verifyCode } from "../src/server/verification";
import { freezeBatch, processBatch, history } from "../src/server/delivery";
import { loadCatalog } from "../src/server/catalog-store";
nextEnv.loadEnvConfig(process.cwd());
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const mode = process.argv[2];
if (mode === "--worker") {
  try {
    await rateLimit(process.argv[3], 3, 60000);
    console.log("allowed");
  } catch {
    console.log("limited");
  } finally {
    await db().close();
  }
} else {
  const prefix = "deploy-qa-" + randomUUID();
  const user: Session = {
    id: prefix,
    expires: Date.now() + 60000,
    verified_email: "deployment-qa@wisc.edu",
    verified_at: Date.now(),
    account_id: digest(prefix),
    email: "deployment-qa@wisc.edu",
    tokens: null,
    oauth: null,
  };
  const worker = () =>
    new Promise<string>((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [
          "--import",
          "tsx",
          "scripts/check-cloud-database.ts",
          "--worker",
          prefix,
        ],
        { env: process.env, windowsHide: true },
      );
      let output = "";
      child.stdout.on("data", (chunk) => (output += chunk));
      child.on("error", reject);
      child.on("close", (code) =>
        code === 0
          ? resolve(output.trim())
          : reject(new Error("Database worker failed")),
      );
    });
  try {
    const races = await Promise.all(Array.from({ length: 8 }, worker));
    assert.equal(races.filter((r) => r === "allowed").length, 3);
    await db()
      .prepare(
        "INSERT INTO sessions(id,expires,verified_email,verified_at,account_id,email) VALUES(?,?,?,?,?,?)",
      )
      .run(
        user.id,
        user.expires,
        user.verified_email,
        user.verified_at,
        user.account_id,
        user.email,
      );
    await assert.rejects(
      transaction(async () => {
        await db()
          .prepare("UPDATE sessions SET email=? WHERE id=?")
          .run("rollback", user.id);
        throw new Error("rollback");
      }),
    );
    assert.equal(
      (await db().prepare("SELECT email FROM sessions WHERE id=?").get(user.id))
        .email,
      user.email,
    );
    await db()
      .prepare(
        "INSERT INTO challenges(session_id,email,digest,expires,attempts) VALUES(?,?,?,?,0)",
      )
      .run(
        user.id,
        user.email,
        codeDigest(user.id, user.email!, "123456"),
        Date.now() + 60000,
      );
    const codes = await Promise.allSettled([
      verifyCode(user, "123456"),
      verifyCode(user, "123456"),
    ]);
    assert.equal(codes.filter((r) => r.status === "fulfilled").length, 1);
    const jobs = await Promise.allSettled([
      createJob(user.id, "qa"),
      createJob(user.id, "qa"),
    ]);
    assert.equal(jobs.filter((r) => r.status === "fulfilled").length, 1);
    const job = jobs.find(
      (r) => r.status === "fulfilled",
    ) as PromiseFulfilledResult<string>;
    await runJob(job.value, async (progress) => {
      await progress("Cloud persistence check");
      return { ok: true };
    });
    assert.equal((await getJob(job.value, user.id)).state, "succeeded");
    const current = (await db()
      .prepare("SELECT * FROM sessions WHERE id=?")
      .get(user.id)) as unknown as Session;
    const draft = {
      id: randomUUID(),
      researcherId: "self",
      to: current.email!,
      subject: "Synthetic deployment test",
      body: "Hello, this synthetic record verifies cloud storage and is never sent to any mailbox. Regards, Deployment QA.",
      recipientEdited: true,
      updatedAt: new Date().toISOString(),
      answers: { interest: "", experience: "", request: "" },
      attachments: [],
    };
    const input = {
      idempotencyKey: randomUUID(),
      confirmed: true as const,
      senderEmail: current.email!,
      drafts: [draft],
      attachments: [],
    };
    const batches = await Promise.all([
      freezeBatch(current, input, current.email!),
      freezeBatch(current, input, current.email!),
    ]);
    assert.equal(batches[0].id, batches[1].id);
    let submitted = 0;
    const sender = async () => {
      submitted++;
      return { state: "accepted" as const, requestId: "synthetic-no-email" };
    };
    await Promise.all([
      processBatch(batches[0].id, sender),
      processBatch(batches[0].id, sender),
    ]);
    assert.equal(submitted, 1);
    await db().close();
    assert.equal((await history(current))[0].state, "accepted");
    const catalog = await loadCatalog();
    assert.equal(catalog.shared, true);
    assert(catalog.records.length > 2000);
    console.log(
      JSON.stringify({
        crossProcessRateLimit: true,
        transactionRollback: true,
        oneTimeVerification: true,
        jobClaim: true,
        persistedJob: true,
        batchIdempotency: true,
        singleSubmission: true,
        reconnectPersistence: true,
        catalogRecords: catalog.records.length,
      }),
    );
  } finally {
    await transaction(async () => {
      await db()
        .prepare("DELETE FROM deliveries WHERE session_id=?")
        .run(prefix);
      await db().prepare("DELETE FROM batches WHERE session_id=?").run(prefix);
      await db()
        .prepare("DELETE FROM challenges WHERE session_id=?")
        .run(prefix);
      await db().prepare("DELETE FROM jobs WHERE session_id=?").run(prefix);
      await db().prepare("DELETE FROM sessions WHERE id=?").run(prefix);
      await db().prepare("DELETE FROM limits WHERE key=?").run(prefix);
    });
    await db().close();
  }
}
