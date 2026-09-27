import {
  beforeAll,
  beforeEach,
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import { db, transaction } from "./db";
import { checkOrigin, jsonBody, readBody } from "./http";
import {
  codeDigest,
  digest,
  isUWEmail,
  seal,
  unseal,
  type Session,
  rateLimit,
} from "./security";
import { verifyCode, verifiedIdentity } from "./verification";
import { createJob, getJob, runJob } from "./jobs";
import {
  hasQuote,
  isUniversityURL,
  publicAddress,
  safeURL,
  type SourceDocument,
} from "./sources";
import { extractionSchema, validateExtraction } from "./discovery";
import { response, structured } from "./openai";
import { randomUUID } from "node:crypto";
import {
  batchInputSchema,
  freezeBatch,
  processBatch,
  history,
  resumeDelivery,
  type Sender,
} from "./delivery";
import { makeDraft } from "@/lib/research";
import { requestCode } from "./verification";

beforeAll(() => {
  process.env.DATABASE_PATH = join(
    mkdtempSync(join(tmpdir(), "research-backend-tests-")),
    "test.sqlite",
  );
  process.env.APP_ENCRYPTION_KEY = "1".repeat(64);
  process.env.APP_ORIGIN = "http://127.0.0.1:3002";
});
beforeEach(() => {
  db().exec(
    "DELETE FROM deliveries; DELETE FROM batches; DELETE FROM challenges; DELETE FROM sessions; DELETE FROM jobs; DELETE FROM limits; DELETE FROM researchers;",
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it("rate limits give a bounded wait and reopen only at the original window boundary", () => {
  vi.useFakeTimers();
  vi.setSystemTime(1000000);
  rateLimit("qa-limit", 1, 120000);
  expect(() => rateLimit("qa-limit", 1, 120000)).toThrow(
    "Try again in 2 minutes",
  );
  vi.setSystemTime(1060001);
  expect(() => rateLimit("qa-limit", 1, 120000)).toThrow(
    "Try again in 1 minutes",
  );
  vi.setSystemTime(1120000);
  expect(() => rateLimit("qa-limit", 1, 120000)).not.toThrow();
});
const user = (): Session => {
  db()
    .prepare("INSERT INTO sessions(id,expires) VALUES(?,?)")
    .run("session-a", Date.now() + 3600000);
  return db()
    .prepare("SELECT * FROM sessions WHERE id=?")
    .get("session-a") as unknown as Session;
};
const challenge = (s: Session, code = "123456") => {
  db()
    .prepare(
      "INSERT INTO challenges(session_id,email,digest,expires) VALUES(?,?,?,?)",
    )
    .run(
      s.id,
      "student@wisc.edu",
      codeDigest(s.id, "student@wisc.edu", code),
      Date.now() + 600000,
    );
};

describe("Verification and account boundaries", () => {
  it("accepts only real UW domain boundaries", () => {
    expect(isUWEmail("a@wisc.edu")).toBe(true);
    expect(isUWEmail("a@cs.wisc.edu")).toBe(true);
    expect(isUWEmail("a@wisc.edu.evil.example")).toBe(false);
    expect(isUWEmail("a@notwisc.edu")).toBe(false);
  });
  it("consumes a valid challenge exactly once and binds the identity", () => {
    const s = user();
    challenge(s);
    expect(verifyCode(s, "123456")).toEqual({
      verified: true,
      email: "student@wisc.edu",
    });
    expect(() => verifyCode(s, "123456")).toThrow(/expired/);
    const current = db()
      .prepare("SELECT * FROM sessions WHERE id=?")
      .get(s.id) as unknown as Session;
    expect(verifiedIdentity(current).accountId).toBe(
      digest("student@wisc.edu"),
    );
    expect(() =>
      verifiedIdentity({ ...current, verified_at: Date.now() - 86400001 }),
    ).toThrow(/Verify/);
  });
  it("commits wrong-code attempts and enforces the attempt cap", () => {
    const s = user();
    challenge(s);
    for (let i = 0; i < 5; i++)
      expect(verifyCode(s, "000000").verified).toBe(false);
    expect(() => verifyCode(s, "123456")).toThrow(/attempt limit/);
  });
  it("does not accept another browser challenge or an expired code", () => {
    const s = user();
    challenge(s);
    expect(() => verifyCode({ ...s, id: "other-session" }, "123456")).toThrow();
    db()
      .prepare("UPDATE challenges SET expires=?")
      .run(Date.now() - 1);
    expect(() => verifyCode(s, "123456")).toThrow();
  });
  it("encrypts private content and rejects altered ciphertext", () => {
    const encrypted = seal({ private: "attachment bytes" });
    expect(encrypted).not.toContain("attachment");
    expect(unseal(encrypted)).toEqual({ private: "attachment bytes" });
    const [iv, tag, bytes] = encrypted.split(".");
    const changed = Buffer.from(bytes, "base64url");
    changed[0] ^= 1;
    expect(() =>
      unseal([iv, tag, changed.toString("base64url")].join(".")),
    ).toThrow();
  });
});

describe("Durable asynchronous jobs", () => {
  it("restores a completed result and hides it from another session", async () => {
    const id = createJob("owner", "search");
    await runJob(id, async (progress) => {
      progress("Checking sources");
      return { items: ["public result"] };
    });
    expect(getJob(id, "owner")).toMatchObject({
      state: "succeeded",
      result: { items: ["public result"] },
    });
    expect(() => getJob(id, "other")).toThrow(/does not belong/);
  });
  it("reports interrupted jobs without manufacturing a successful result", () => {
    const id = createJob("owner", "search");
    db()
      .prepare("UPDATE jobs SET updated_at=? WHERE id=?")
      .run(Date.now() - 310000, id);
    expect(getJob(id, "owner")).toMatchObject({ state: "failed" });
  });
  it("rolls back a failed transaction", () => {
    expect(() =>
      transaction(() => {
        db()
          .prepare("INSERT INTO sessions(id,expires) VALUES(?,?)")
          .run("rollback", 1);
        throw new Error("interrupted");
      }),
    ).toThrow();
    expect(
      db().prepare("SELECT * FROM sessions WHERE id=?").get("rollback"),
    ).toBeUndefined();
  });
});

const document: SourceDocument = {
  id: "uw-profile",
  url: "https://example.wisc.edu/faculty/alex",
  title: "Alex Chen | UW-Madison",
  text: "Alex Chen is an assistant professor at the University of Wisconsin-Madison. Research focuses on water and health. Contact alex@wisc.edu. Undergraduate research is eligible for academic credit.",
  links: [],
  checkedAt: new Date().toISOString(),
};
const unknownCondition = {
  value: "unknown",
  detail: "Not stated",
  sourceId: "",
  quote: "",
  conflict: false,
} as const;
function extraction() {
  return extractionSchema.parse({
    interpretation: "Water research",
    language: "en",
    broad: false,
    directions: [
      {
        id: "water",
        title: "Water",
        description: "Water research",
        question: "How do we protect water?",
        keywords: ["water"],
      },
    ],
    warnings: [],
    researchers: [
      {
        name: "Alex Chen",
        academicTitle: "",
        academicTitleQuote: "",
        universitySourceId: "uw-profile",
        affiliationQuote:
          "Alex Chen is an assistant professor at the University of Wisconsin-Madison.",
        currentUWFaculty: true,
        department: "Environmental Studies",
        lab: "Water research",
        title: "Protecting water",
        summary: "Studies water.",
        summaryZh: "研究水。",
        question: "How can water be protected?",
        example: "A water sample.",
        methods: "Not specified.",
        relevance: "Related to water.",
        topics: ["water"],
        keywords: ["water"],
        participation: unknownCondition,
        credit: {
          value: "supported",
          detail: "Credit stated",
          sourceId: "uw-profile",
          quote: "Undergraduate research is eligible for academic credit.",
          conflict: false,
        },
        pay: unknownCondition,
        recruitment: {
          value: "unknown",
          sourceId: "",
          quote: "",
          audience: "unknown",
          conflict: false,
        },
        contact: {
          route: "email",
          url: document.url,
          email: "alex@wisc.edu",
          note: "Public email, openings unknown.",
          sourceId: "uw-profile",
        },
        sourceIds: ["uw-profile"],
      },
    ],
  });
}

describe("Evidence and safe source retrieval", () => {
  it("rejects private addresses and non-HTTPS sources", () => {
    for (const ip of [
      "127.0.0.1",
      "10.0.0.1",
      "172.31.0.1",
      "192.168.0.1",
      "169.254.169.254",
      "::1",
      "::ffff:127.0.0.1",
      "fc00::1",
    ])
      expect(publicAddress(ip)).toBe(false);
    expect(publicAddress("8.8.8.8")).toBe(true);
    expect(() => safeURL("http://example.wisc.edu")).toThrow();
    expect(() => safeURL("https://user:password@example.wisc.edu")).toThrow();
    expect(isUniversityURL("https://wisc.edu.evil.example")).toBe(false);
  });
  it("requires actual university evidence rather than a model affiliation assertion", () => {
    const raw = extraction();
    expect(validateExtraction(raw, [document])).toHaveLength(1);
    raw.researchers[0].affiliationQuote =
      "Invented affiliation with the university";
    expect(validateExtraction(raw, [document])).toHaveLength(0);
  });
  it("downgrades invented or conflicting conditions and email addresses", () => {
    const raw = extraction();
    raw.researchers[0].credit.quote = "Students receive a guaranteed paid role";
    raw.researchers[0].contact.email = "invented@wisc.edu";
    const result = validateExtraction(raw, [document])[0];
    expect(result.credit.value).toBe("unknown");
    expect(result.contact.email).toBeUndefined();
    raw.researchers[0].credit = {
      ...extraction().researchers[0].credit,
      conflict: true,
    };
    expect(validateExtraction(raw, [document])[0].credit.value).toBe("unknown");
  });
  it("retains supported evidence but does not infer recruitment from contact details", () => {
    const result = validateExtraction(extraction(), [document])[0];
    expect(result.credit.value).toBe("supported");
    expect(result.recruitment).toBe("unknown");
    expect(result.contact.email).toBe("alex@wisc.edu");
    expect(hasQuote(document, "not present in the original page")).toBe(false);
  });
});

describe("API contracts and truthful provider errors", () => {
  it("rejects cross-origin writes and oversized streaming bodies", async () => {
    expect(() =>
      checkOrigin(
        new Request("http://127.0.0.1:3002/api/search", {
          headers: { origin: "https://evil.example" },
        }),
      ),
    ).toThrow();
    await expect(
      readBody(
        new Request("http://localhost", { method: "POST", body: "1234567890" }),
        5,
      ),
    ).rejects.toThrow(/too large/);
    await expect(
      jsonBody(
        new Request("http://localhost", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: '{"query":1}',
        }),
        z.object({ query: z.string() }),
      ),
    ).rejects.toThrow(/invalid/);
  });
  it("does not make an API request or return samples when the key is absent", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);
    await expect(response("instructions", "query")).rejects.toThrow(
      /not configured/,
    );
    expect(spy).not.toHaveBeenCalled();
  });
  it("rejects incomplete responses and web answers without an actual search call", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-only");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          Response.json({ status: "incomplete", output: [] }),
        )
        .mockResolvedValueOnce(
          Response.json({
            status: "completed",
            output: [
              {
                type: "message",
                content: [{ type: "output_text", text: "Unsearched answer" }],
              },
            ],
          }),
        ),
    );
    await expect(response("instructions", "query")).rejects.toThrow(
      /incomplete/,
    );
    await expect(
      response("instructions", "query", undefined, true),
    ).rejects.toThrow(/No web search/);
  });
  it("validates model output before returning it and disables response storage", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-only");
    const spy = vi.fn().mockResolvedValue(
      Response.json({
        status: "completed",
        output: [
          {
            type: "message",
            content: [{ type: "output_text", text: '{"answer":99}' }],
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", spy);
    await expect(
      structured("example", z.object({ answer: z.string() }), "system", {}),
    ).rejects.toThrow(/validated/);
    expect(JSON.parse(spy.mock.calls[0][1].body).store).toBe(false);
  });
});

function mailFixture() {
  let s = user();
  challenge(s);
  verifyCode(s, "123456");
  s = db()
    .prepare("SELECT * FROM sessions WHERE id=?")
    .get(s.id) as unknown as Session;
  const researcher = validateExtraction(extraction(), [document])[0];
  db()
    .prepare("INSERT INTO researchers(id,payload,checked_at) VALUES(?,?,?)")
    .run(researcher.id, JSON.stringify(researcher), Date.now());
  const draft = makeDraft(
    researcher,
    {
      name: "Test Student",
      major: "Biology",
      year: "second-year",
      experience: "",
      resumeText: "",
    },
    "water",
    randomUUID(),
  );
  const input = batchInputSchema.parse({
    idempotencyKey: randomUUID(),
    confirmed: true,
    senderEmail: "student@wisc.edu",
    drafts: [draft],
    attachments: [],
  });
  return { s, input, draft };
}
const mailboxFrom = "student@wisc.edu";

describe("Durable per-message outbox", () => {
  it("sends to the verified owner without depending on the original professor's source", async () => {
    const { s, input } = mailFixture();
    input.drafts[0].to = "STUDENT@wisc.edu";
    // No client test flag or recipientEdited flag is needed to prove ownership.
    db().prepare("DELETE FROM researchers").run();
    const batch = freezeBatch(s, input, mailboxFrom);
    const preflight = vi
      .fn()
      .mockRejectedValue(new Error("Professor source unavailable"));
    const sender = vi
      .fn<Sender>()
      .mockResolvedValue({ state: "accepted", requestId: "self-test" });
    await processBatch(batch.id, sender, preflight);
    expect(preflight).not.toHaveBeenCalled();
    expect(sender).toHaveBeenCalledTimes(1);
    expect(sender.mock.calls[0][0].draft.to).toBe(mailboxFrom);
    expect(sender.mock.calls[0][0].sender).toBe(mailboxFrom);
    expect(history(s)[0].state).toBe("accepted");
  });
  it("retries an old source-blocked self-addressed snapshot without consulting professor sources", async () => {
    const { s, input } = mailFixture();
    input.drafts[0].to = mailboxFrom;
    const batch = freezeBatch(s, input, mailboxFrom);
    db()
      .prepare(
        "UPDATE deliveries SET state='failed',error='Contact source check failed' WHERE batch_id=?",
      )
      .run(batch.id);
    const sender = vi
      .fn<Sender>()
      .mockResolvedValue({ state: "accepted", requestId: "retry-self-test" });
    const preflight = vi
      .fn()
      .mockRejectedValue(new Error("Professor source unavailable"));
    db().prepare("DELETE FROM researchers").run();
    const record = history(s)[0];
    expect(resumeDelivery(s, record.id)).toBe(batch.id);
    await processBatch(batch.id, sender, preflight, record.id);
    expect(preflight).not.toHaveBeenCalled();
    expect(sender).toHaveBeenCalledTimes(1);
    expect(history(s)[0].state).toBe("accepted");
  });
  it("does not treat another recipient as a self-test just because its address was edited", async () => {
    const { s, input } = mailFixture();
    input.drafts[0].to = "other@wisc.edu";
    input.drafts[0].recipientEdited = true;
    const batch = freezeBatch(s, input, mailboxFrom);
    const preflight = vi
      .fn()
      .mockRejectedValue(new Error("Professor source unavailable"));
    const sender = vi.fn<Sender>();
    await processBatch(batch.id, sender, preflight);
    expect(preflight).toHaveBeenCalledTimes(1);
    expect(sender).not.toHaveBeenCalled();
    expect(history(s)[0].state).toBe("failed");
    db().prepare("DELETE FROM researchers").run();
    expect(() => resumeDelivery(s, history(s)[0].id)).toThrow();
    expect(() =>
      freezeBatch(s, { ...input, idempotencyKey: randomUUID() }, mailboxFrom),
    ).toThrow();
  });
  it("still checks verification and sender identity for a self-addressed test", async () => {
    const { s, input } = mailFixture();
    input.drafts[0].to = mailboxFrom;
    expect(() =>
      freezeBatch(s, { ...input, senderEmail: "other@wisc.edu" }, mailboxFrom),
    ).toThrow(/sender no longer matches/);
    const batch = freezeBatch(s, input, mailboxFrom);
    db().prepare("UPDATE sessions SET verified_at=NULL WHERE id=?").run(s.id);
    const sender = vi.fn<Sender>();
    await processBatch(batch.id, sender, vi.fn());
    expect(sender).not.toHaveBeenCalled();
    expect(
      db()
        .prepare("SELECT state FROM deliveries WHERE batch_id=?")
        .get(batch.id)?.state,
    ).toBe("cancelled");
  });
  it("rejects a forged or stale sender before creating any delivery", () => {
    const { s, input } = mailFixture();
    expect(() =>
      freezeBatch(s, { ...input, senderEmail: "other@wisc.edu" }, mailboxFrom),
    ).toThrow(/sender no longer matches/);
    expect(() => freezeBatch(s, input, "platform@example.test")).toThrow(
      /sender no longer matches/,
    );
    expect(history(s)).toEqual([]);
  });
  it("rejects messages whose combined attachments exceed the Outlook message limit", () => {
    const { s, input } = mailFixture();
    input.drafts[0].attachments = [
      {
        id: "first",
        name: "first.txt",
        type: "text/plain",
        size: 2 * 1024 * 1024,
      },
      { id: "second", name: "second.txt", type: "text/plain", size: 1 },
    ];
    expect(() => freezeBatch(s, input, mailboxFrom)).toThrow(/2 MB total/);
    expect(history(s)).toEqual([]);
  });
  it("freezes immutable snapshots and deduplicates the same confirmation", () => {
    const { s, input, draft } = mailFixture();
    const batch = freezeBatch(s, input, mailboxFrom);
    expect(freezeBatch(s, input, mailboxFrom)).toEqual({
      id: batch.id,
      existing: true,
    });
    const original = draft.body;
    input.drafts[0].body = "Changed after confirmation";
    expect(() => freezeBatch(s, input, mailboxFrom)).toThrow(
      /different snapshot/,
    );
    expect(history(s)[0].draft.body).toBe(original);
    expect(() =>
      freezeBatch(s, { ...input, idempotencyKey: randomUUID() }, mailboxFrom),
    ).toThrow(/already queued/);
  });
  it("submits once under concurrent workers and records acceptance rather than delivery", async () => {
    const { s, input } = mailFixture();
    const batch = freezeBatch(s, input, mailboxFrom);
    const sender = vi
      .fn<Sender>()
      .mockResolvedValue({ state: "accepted", requestId: "provider-test-id" });
    await Promise.all([
      processBatch(batch.id, sender),
      processBatch(batch.id, sender),
    ]);
    expect(sender).toHaveBeenCalledTimes(1);
    expect(sender.mock.calls[0][0].replyTo).toBe("student@wisc.edu");
    expect(history(s)[0]).toMatchObject({
      state: "accepted",
      providerRequestId: "provider-test-id",
    });
    expect(() => resumeDelivery(s, history(s)[0].id)).toThrow(/Only a queued/);
  });
  it("retains an uncertain submission and never retries it", async () => {
    const { s, input } = mailFixture();
    const batch = freezeBatch(s, input, mailboxFrom);
    const sender = vi
      .fn<Sender>()
      .mockRejectedValue(new Error("connection lost"));
    await processBatch(batch.id, sender);
    await processBatch(batch.id, sender);
    expect(sender).toHaveBeenCalledTimes(1);
    expect(history(s)[0].state).toBe("unknown");
    expect(() => resumeDelivery(s, history(s)[0].id)).toThrow(/uncertain/);
    expect(() =>
      freezeBatch(s, { ...input, idempotencyKey: randomUUID() }, mailboxFrom),
    ).toThrow(/already queued/);
  });
  it("allows an explicit retry after a confirmed rejection only", async () => {
    const { s, input } = mailFixture();
    const batch = freezeBatch(s, input, mailboxFrom);
    const sender = vi
      .fn<Sender>()
      .mockResolvedValueOnce({ state: "failed", error: "Rejected" })
      .mockResolvedValueOnce({
        state: "accepted",
        requestId: "second-attempt",
      });
    await processBatch(batch.id, sender);
    await processBatch(batch.id, sender);
    expect(sender).toHaveBeenCalledTimes(1);
    resumeDelivery(s, history(s)[0].id);
    await processBatch(batch.id, sender);
    expect(sender).toHaveBeenCalledTimes(2);
    expect(history(s)[0].state).toBe("accepted");
    expect(sender.mock.calls[0][0].id).not.toBe(sender.mock.calls[1][0].id);
  });
  it("keeps successful messages when a different recipient fails", async () => {
    const { s, input } = mailFixture();
    input.drafts.push({
      ...input.drafts[0],
      id: randomUUID(),
      recipientEdited: true,
      to: "other@example.test",
    });
    const batch = freezeBatch(s, input, mailboxFrom);
    await processBatch(batch.id, async (m) =>
      m.draft.to === "other@example.test"
        ? { state: "failed", error: "Rejected" }
        : { state: "accepted", requestId: "ok" },
    );
    expect(
      history(s)
        .map((r) => r.state)
        .sort(),
    ).toEqual(["accepted", "failed"]);
  });
  it("rechecks account state after source checks and cancels queued work on sign out", async () => {
    const { s, input } = mailFixture();
    const batch = freezeBatch(s, input, mailboxFrom);
    const sender = vi.fn<Sender>();
    await processBatch(batch.id, sender, async () => {
      db().prepare("UPDATE sessions SET verified_at=NULL WHERE id=?").run(s.id);
    });
    expect(sender).not.toHaveBeenCalled();
    expect(history(s)[0].state).toBe("cancelled");
  });
  it("treats a failed source recheck as a known non-submission", async () => {
    const { s, input } = mailFixture();
    const batch = freezeBatch(s, input, mailboxFrom);
    const sender = vi.fn<Sender>();
    await processBatch(batch.id, sender, async () => {
      throw new Error("Source unavailable");
    });
    expect(sender).not.toHaveBeenCalled();
    expect(history(s)[0].state).toBe("failed");
  });
  it("does not send a cancelled row when a source check finishes late", async () => {
    const { s, input } = mailFixture();
    const batch = freezeBatch(s, input, mailboxFrom);
    const sender = vi.fn<Sender>();
    await processBatch(batch.id, sender, async () => {
      db()
        .prepare("UPDATE deliveries SET state='cancelled' WHERE batch_id=?")
        .run(batch.id);
    });
    expect(sender).not.toHaveBeenCalled();
    expect(history(s)[0].state).toBe("cancelled");
  });
  it("scopes history and retry to both browser session and verified account", () => {
    const { s, input } = mailFixture();
    freezeBatch(s, input, mailboxFrom);
    const record = history(s)[0];
    expect(history({ ...s, id: "another-browser" })).toEqual([]);
    expect(history({ ...s, account_id: "another-account" })).toEqual([]);
    expect(() =>
      resumeDelivery({ ...s, account_id: "another-account" }, record.id),
    ).toThrow(/does not belong/);
  });
  it("marks interrupted submissions unknown and preserves attachment bytes", async () => {
    const { s, input } = mailFixture();
    const content = Buffer.from("test attachment").toString("base64");
    input.drafts[0].attachments = [
      { id: "test-file", name: "resume.txt", size: 15, type: "text/plain" },
    ];
    input.attachments = [{ id: "test-file", content }];
    const batch = freezeBatch(s, input, mailboxFrom);
    input.attachments[0].content = "changed";
    const sender = vi
      .fn<Sender>()
      .mockResolvedValue({ state: "accepted", requestId: "ok" });
    await processBatch(batch.id, sender);
    expect(sender.mock.calls[0][0].attachments[0].content).toBe(content);
    db()
      .prepare(
        "UPDATE deliveries SET state='submitting',updated_at=? WHERE batch_id=?",
      )
      .run(Date.now() - 121000, batch.id);
    expect(history(s)[0].state).toBe("unknown");
  });
  it("rejects missing attachment bytes, duplicate recipients and stale source records atomically", () => {
    const { s, input } = mailFixture();
    input.drafts[0].attachments = [
      { id: "absent", name: "resume.pdf", size: 1, type: "application/pdf" },
    ];
    expect(() => freezeBatch(s, input, mailboxFrom)).toThrow(/missing/);
    input.drafts[0].attachments = [];
    input.drafts.push({ ...input.drafts[0], id: randomUUID() });
    expect(() => freezeBatch(s, input, mailboxFrom)).toThrow(
      /one selected draft/,
    );
    input.drafts.pop();
    db()
      .prepare("UPDATE researchers SET checked_at=?")
      .run(Date.now() - 8 * 86400000);
    expect(() => freezeBatch(s, input, mailboxFrom)).toThrow(/seven days/);
    expect(history(s)).toEqual([]);
  });
});

describe("Email provider boundary (mocked; no email is sent)", () => {
  it("delivers a six digit challenge only through the configured provider and rate-limits requests", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-only");
    vi.stubEnv("VERIFICATION_FROM", "verify@example.test");
    const spy = vi
      .fn()
      .mockResolvedValue(Response.json({ id: "test-verification" }));
    vi.stubGlobal("fetch", spy);
    const s = user();
    expect(await requestCode(s, "student@wisc.edu")).toMatchObject({
      sent: true,
    });
    const text = JSON.parse(spy.mock.calls[0][1].body).text;
    const code = text.match(/\b\d{6}\b/)[0];
    expect(verifyCode(s, code).verified).toBe(true);
    await expect(requestCode(s, "student@wisc.edu")).rejects.toThrow(
      /Too many/,
    );
    expect(spy).toHaveBeenCalledTimes(1);
  });
  it("preserves partial generation results after a job fails", async () => {
    const id = createJob("owner", "drafts");
    await runJob(id, async (progress) => {
      progress("First draft ready", {
        drafts: [{ id: "retained" }],
        errors: [],
      });
      throw new Error("interrupted");
    });
    expect(getJob(id, "owner")).toMatchObject({
      state: "failed",
      result: { drafts: [{ id: "retained" }] },
    });
  });
});
