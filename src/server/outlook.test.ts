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
import { createHash } from "node:crypto";
import { InteractionRequiredAuthError } from "@azure/msal-node";
import { db } from "./db";
import { digest, seal, unseal, type Session } from "./security";
import { integrationStatus } from "./config";
import {
  beginOutlookAuthorization,
  completeOutlookAuthorization,
  configuredOutlookSender,
  currentSession,
  disconnectOutlook,
  outlookAccess,
  outlookStatus,
} from "./outlook";
import { outlookSender } from "./outlook-mailer";
import { makeDraft } from "@/lib/research";
import { researchers } from "@/data/researchers";

const msal = vi.hoisted(() => ({
  authorize: vi.fn(),
  redeem: vi.fn(),
  silent: vi.fn(),
  serialize: vi.fn(),
  deserialize: vi.fn(),
  account: vi.fn(),
}));
vi.mock("@azure/msal-node", () => ({
  ConfidentialClientApplication: class {
    getAuthCodeUrl = msal.authorize;
    acquireTokenByCode = msal.redeem;
    acquireTokenSilent = msal.silent;
    getTokenCache() {
      return {
        serialize: msal.serialize,
        deserialize: msal.deserialize,
        getAccountByHomeId: msal.account,
      };
    }
  },
  InteractionRequiredAuthError: class extends Error {},
}));
const tenantId = "11111111-1111-4111-8111-111111111111";
const account = { homeAccountId: "account.test", tenantId };
const tokenResult = () => ({
  account,
  tenantId,
  accessToken: "test-access-token",
  scopes: ["User.Read", "Mail.Send"],
});
const profile = () =>
  Response.json({
    id: "mailbox-object",
    mail: "student@wisc.edu",
    userPrincipalName: "student@wisc.edu",
  });
beforeAll(() => {
  process.env.DATABASE_PATH = join(
    mkdtempSync(join(tmpdir(), "research-outlook-tests-")),
    "test.sqlite",
  );
  process.env.APP_ENCRYPTION_KEY = "2".repeat(64);
  process.env.APP_ORIGIN = "http://127.0.0.1:3002";
});
beforeEach(() => {
  db().exec(
    "DELETE FROM deliveries; DELETE FROM batches; DELETE FROM sessions;",
  );
  vi.clearAllMocks();
  vi.stubEnv("MICROSOFT_CLIENT_ID", "22222222-2222-4222-8222-222222222222");
  vi.stubEnv("MICROSOFT_CLIENT_SECRET", "test-client-secret");
  vi.stubEnv("MICROSOFT_TENANT_ID", "organizations");
  vi.stubEnv("OPENAI_API_KEY", "test-openai-key");
  msal.authorize.mockImplementation(async (input) => {
    const url = new URL(
      "https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize",
    );
    url.searchParams.set("state", input.state);
    return url.toString();
  });
  msal.redeem.mockResolvedValue(tokenResult());
  msal.silent.mockResolvedValue(tokenResult());
  msal.serialize.mockReturnValue('{"test":"encrypted-token-cache"}');
  msal.account.mockResolvedValue(account);
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async () => profile()),
  );
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
function user(id = "session-test", email = "student@wisc.edu"): Session {
  db()
    .prepare(
      "INSERT INTO sessions(id,expires,verified_email,verified_at,account_id,email) VALUES(?,?,?,?,?,?)",
    )
    .run(id, Date.now() + 3600000, email, Date.now(), digest(email), email);
  return currentSession(id);
}
async function start(s: Session) {
  const url = new URL(await beginOutlookAuthorization(s));
  return {
    state: url.searchParams.get("state")!,
    code: "test-authorization-code",
  };
}
async function connect(s = user()) {
  const response = await start(s);
  await completeOutlookAuthorization(currentSession(s.id), response);
  return currentSession(s.id);
}

describe("Outlook authorization boundaries", () => {
  it("requires configured credentials and a verified UW session", async () => {
    const s = user();
    vi.stubEnv("MICROSOFT_CLIENT_SECRET", "");
    vi.stubEnv("MAIL_TRANSPORT", "resend");
    vi.stubEnv("MAIL_FROM", "platform@example.test");
    expect(integrationStatus().sending).toBe(false);
    await expect(start(s)).rejects.toThrow(/not configured/);
    vi.stubEnv("MICROSOFT_CLIENT_SECRET", "test-secret");
    db().prepare("UPDATE sessions SET verified_at=NULL WHERE id=?").run(s.id);
    await expect(start(currentSession(s.id))).rejects.toThrow(/Verify/);
    expect(msal.authorize).not.toHaveBeenCalled();
  });
  it("binds authorization to the browser with PKCE, a nonce, and least-privilege scopes", async () => {
    const s = user();
    const response = await start(s);
    const saved = currentSession(s.id);
    const pending = unseal<{
      stateHash: string;
      verifier: string;
      nonce: string;
    }>(saved.oauth!);
    const request = msal.authorize.mock.calls[0][0];
    expect(request.scopes).toEqual([
      "https://graph.microsoft.com/User.Read",
      "https://graph.microsoft.com/Mail.Send",
      "openid",
      "profile",
      "offline_access",
    ]);
    expect(request).toMatchObject({
      codeChallengeMethod: "S256",
      loginHint: "student@wisc.edu",
      responseMode: "query",
      redirectUri: "http://127.0.0.1:3002/api/outlook/callback",
    });
    expect(request.codeChallenge).toBe(
      createHash("sha256").update(pending.verifier).digest("base64url"),
    );
    expect(pending.stateHash).toBe(digest(response.state));
    expect(saved.oauth).not.toContain(pending.verifier);
    await completeOutlookAuthorization(saved, response);
    expect(msal.redeem.mock.calls[0][0]).toMatchObject({
      codeVerifier: pending.verifier,
      nonce: pending.nonce,
    });
    expect(outlookStatus(currentSession(s.id))).toMatchObject({
      connected: true,
      email: "student@wisc.edu",
    });
    expect(currentSession(s.id).tokens).not.toContain("encrypted-token-cache");
  });
  it("rejects a callback from another browser or with a forged state without exchanging its code", async () => {
    const first = user();
    const response = await start(first);
    const second = user("another-session");
    await expect(
      completeOutlookAuthorization(second, response),
    ).rejects.toThrow(/expired/);
    await expect(
      completeOutlookAuthorization(currentSession(first.id), {
        ...response,
        state: "wrong",
      }),
    ).rejects.toThrow(/did not match/);
    expect(msal.redeem).not.toHaveBeenCalled();
  });
  it("expires authorization attempts and never replays a consumed callback", async () => {
    const s = user();
    const response = await start(s);
    const pending = unseal<Record<string, unknown>>(
      currentSession(s.id).oauth!,
    );
    db()
      .prepare("UPDATE sessions SET oauth=? WHERE id=?")
      .run(seal({ ...pending, expires: 0 }), s.id);
    await expect(
      completeOutlookAuthorization(currentSession(s.id), response),
    ).rejects.toThrow(/expired/);
    const next = await start(currentSession(s.id));
    const snapshot = currentSession(s.id);
    await completeOutlookAuthorization(snapshot, next);
    await expect(completeOutlookAuthorization(snapshot, next)).rejects.toThrow(
      /already used/,
    );
    expect(msal.redeem).toHaveBeenCalledTimes(1);
  });
  it("consumes a denied request without fetching tokens or accepting provider error text", async () => {
    const s = user();
    const response = await start(s);
    await expect(
      completeOutlookAuthorization(currentSession(s.id), {
        state: response.state,
        error: "access_denied",
      }),
    ).rejects.toThrow(/not connected/);
    expect(msal.redeem).not.toHaveBeenCalled();
    expect(currentSession(s.id)).toMatchObject({ tokens: null, oauth: null });
  });
  it("rejects the wrong mailbox, including a matching login name but a different primary sender", async () => {
    const s = user();
    const response = await start(s);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({
            id: "other",
            mail: "other@wisc.edu",
            userPrincipalName: "student@wisc.edu",
          }),
        ),
    );
    await expect(
      completeOutlookAuthorization(currentSession(s.id), response),
    ).rejects.toThrow(/does not match/);
    expect(currentSession(s.id).tokens).toBeNull();
  });
  it("requires actual Mail.Send permission", async () => {
    const s = user();
    const response = await start(s);
    msal.redeem.mockResolvedValue({ ...tokenResult(), scopes: ["User.Read"] });
    await expect(
      completeOutlookAuthorization(currentSession(s.id), response),
    ).rejects.toThrow(/permission/);
    expect(currentSession(s.id).tokens).toBeNull();
  });
  it("cannot restore a connection after a disconnect while the callback is in flight", async () => {
    const s = user();
    const response = await start(s);
    msal.redeem.mockImplementationOnce(async () => {
      disconnectOutlook(currentSession(s.id));
      return tokenResult();
    });
    await expect(
      completeOutlookAuthorization(currentSession(s.id), response),
    ).rejects.toThrow(/session changed/);
    expect(currentSession(s.id).tokens).toBeNull();
  });
  it("does not restore refreshed credentials after sign-out or disconnect", async () => {
    const s = await connect();
    msal.silent.mockImplementationOnce(async () => {
      disconnectOutlook(currentSession(s.id));
      return tokenResult();
    });
    await expect(outlookAccess(s.id, "student@wisc.edu")).rejects.toThrow(
      /connection changed/,
    );
    expect(currentSession(s.id).tokens).toBeNull();
  });
  it("detects a mailbox address change before sending", async () => {
    const s = await connect();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ id: "mailbox-object", mail: "renamed@wisc.edu" }),
        ),
    );
    await expect(outlookAccess(s.id, "student@wisc.edu")).rejects.toThrow(
      /mailbox changed/,
    );
    expect(currentSession(s.id).tokens).toBeNull();
  });
  it("requires reconnection when consent is revoked", async () => {
    const s = await connect();
    msal.silent.mockRejectedValueOnce(
      new InteractionRequiredAuthError(
        "interaction_required",
        "test-correlation",
      ),
    );
    await expect(outlookAccess(s.id, "student@wisc.edu")).rejects.toThrow(
      /Reconnect/,
    );
    expect(outlookStatus(currentSession(s.id)).connected).toBe(false);
  });
  it("preserves verification but cancels queued work when Outlook is disconnected", async () => {
    const s = await connect();
    db()
      .prepare(
        "INSERT INTO batches(id,session_id,account_id,idempotency_key,fingerprint,created_at) VALUES(?,?,?,?,?,?)",
      )
      .run("batch", s.id, s.account_id, "key", "fingerprint", Date.now());
    for (const state of ["queued", "submitting", "accepted"])
      db()
        .prepare(
          "INSERT INTO deliveries(id,batch_id,session_id,account_id,sender,draft_id,snapshot,attachments,state,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
        )
        .run(
          state,
          "batch",
          s.id,
          s.account_id,
          "student@wisc.edu",
          state,
          "opaque",
          "opaque",
          state,
          Date.now(),
          Date.now(),
        );
    disconnectOutlook(s);
    expect(currentSession(s.id)).toMatchObject({
      tokens: null,
      oauth: null,
      verified_email: "student@wisc.edu",
    });
    expect(
      db().prepare("SELECT state FROM deliveries WHERE id='queued'").get(),
    ).toMatchObject({ state: "cancelled" });
    expect(
      db().prepare("SELECT state FROM deliveries WHERE id='accepted'").get(),
    ).toMatchObject({ state: "accepted" });
    expect(
      db().prepare("SELECT state FROM deliveries WHERE id='submitting'").get(),
    ).toMatchObject({ state: "submitting" });
  });
});

function message() {
  const draft = makeDraft(
    researchers[0],
    {
      name: "Test Student",
      major: "Biology",
      year: "second-year",
      experience: "",
      resumeText: "",
    },
    "research",
    "draft-test",
  );
  return {
    id: "delivery-attempt",
    sender: "student@wisc.edu",
    replyTo: "student@wisc.edu",
    draft,
    attachments: [
      {
        id: "file",
        name: "resume.txt",
        type: "text/plain",
        size: 5,
        content: Buffer.from("hello").toString("base64"),
        sha256: "test",
      },
    ],
  };
}
describe("Outlook sends as the connected user", () => {
  it("uses /me, preserves reviewed body and attachments, and saves Sent Items without overriding From", async () => {
    const s = await connect();
    expect(configuredOutlookSender(s)).toBe("student@wisc.edu");
    const fetcher = vi
      .fn()
      .mockImplementation(async (url) =>
        String(url).endsWith("/sendMail")
          ? new Response(null, {
              status: 202,
              headers: { "request-id": "graph-reference" },
            })
          : profile(),
      );
    vi.stubGlobal("fetch", fetcher);
    const m = message();
    expect(await outlookSender(s.id)(m)).toEqual({
      state: "accepted",
      requestId: "graph-reference",
    });
    const request = fetcher.mock.calls.find((call) =>
      String(call[0]).endsWith("/sendMail"),
    )!;
    expect(request[0]).toBe("https://graph.microsoft.com/v1.0/me/sendMail");
    const body = JSON.parse(request[1].body);
    expect(body).toMatchObject({
      saveToSentItems: true,
      message: {
        subject: m.draft.subject,
        body: { contentType: "Text", content: m.draft.body },
        toRecipients: [{ emailAddress: { address: m.draft.to } }],
      },
    });
    expect(body.message).not.toHaveProperty("from");
    expect(body.message).not.toHaveProperty("replyTo");
    expect(body.message.attachments[0]).toMatchObject({
      "@odata.type": "#microsoft.graph.fileAttachment",
      name: "resume.txt",
      contentBytes: m.attachments[0].content,
    });
    expect(request[1].headers).not.toHaveProperty("Idempotency-Key");
  });
  it("refuses a legacy platform sender without submitting any message", async () => {
    const s = await connect();
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    expect(
      (
        await outlookSender(s.id)({
          ...message(),
          sender: "platform@example.test",
        })
      ).state,
    ).toBe("failed");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([400, 401, 403, 413, 429])(
    "records a definite Microsoft rejection (%s) as failed",
    async (status) => {
      const s = await connect();
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockImplementation(async (url) =>
            String(url).endsWith("/sendMail")
              ? new Response(null, { status })
              : profile(),
          ),
      );
      expect((await outlookSender(s.id)(message())).state).toBe("failed");
    },
  );
  it.each([500, 502])(
    "does not treat an ambiguous Microsoft response (%s) as safe to retry",
    async (status) => {
      const s = await connect();
      const fetcher = vi
        .fn()
        .mockImplementation(async (url) =>
          String(url).endsWith("/sendMail")
            ? new Response(null, { status })
            : profile(),
        );
      vi.stubGlobal("fetch", fetcher);
      expect((await outlookSender(s.id)(message())).state).toBe("unknown");
      expect(
        fetcher.mock.calls.filter((call) =>
          String(call[0]).endsWith("/sendMail"),
        ),
      ).toHaveLength(1);
    },
  );
  it("keeps a lost send response unknown and never automatically resubmits", async () => {
    const s = await connect();
    const fetcher = vi.fn().mockImplementation(async (url) => {
      if (String(url).endsWith("/sendMail")) throw new Error("timeout");
      return profile();
    });
    vi.stubGlobal("fetch", fetcher);
    expect(await outlookSender(s.id)(message())).toMatchObject({
      state: "unknown",
    });
    expect(
      fetcher.mock.calls.filter((call) =>
        String(call[0]).endsWith("/sendMail"),
      ),
    ).toHaveLength(1);
  });
});
