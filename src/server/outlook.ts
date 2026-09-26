import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import {
  ConfidentialClientApplication,
  InteractionRequiredAuthError,
} from "@azure/msal-node";
import { config, integrationStatus } from "./config";
import { db, transaction } from "./db";
import { digest, seal, unseal, type Session } from "./security";
import { verifiedIdentity } from "./verification";
import { AppError } from "./http";

export const outlookScopes = [
  "https://graph.microsoft.com/User.Read",
  "https://graph.microsoft.com/Mail.Send",
];
const graphProfileURL =
  "https://graph.microsoft.com/v1.0/me?$select=id,mail,userPrincipalName";
export const outlookRedirectURI = () =>
  `${config().origin}/api/outlook/callback`;
interface PendingAuthorization {
  stateHash: string;
  verifier: string;
  nonce: string;
  email: string;
  expires: number;
}
interface Connection {
  version: 1;
  cache: string;
  homeAccountId: string;
  objectId: string;
  tenantId: string;
  email: string;
  connectionId: string;
}

function client(tenant = config().microsoftTenant) {
  if (!integrationStatus().outlook)
    throw new AppError(
      "OUTLOOK_CONFIG",
      "Outlook sending is not configured on this server yet. Your drafts stay saved.",
      503,
    );
  return new ConfidentialClientApplication({
    auth: {
      clientId: config().microsoftClientId,
      clientSecret: config().microsoftClientSecret,
      authority: `https://login.microsoftonline.com/${tenant}`,
    },
    system: {
      loggerOptions: { piiLoggingEnabled: false, loggerCallback: () => {} },
    },
  });
}

export function currentSession(id: string): Session {
  const user = db()
    .prepare("SELECT * FROM sessions WHERE id=? AND expires>?")
    .get(id, Date.now()) as Session | undefined;
  if (!user)
    throw new AppError(
      "SESSION",
      "Your session expired. Reload the page and verify your email.",
      401,
    );
  return user;
}

function connection(user: Session): Connection {
  const identity = verifiedIdentity(user);
  if (!user.tokens)
    throw new AppError(
      "OUTLOOK_CONNECT",
      "Connect your verified UW mailbox to Outlook before sending.",
      401,
    );
  let result: Connection;
  try {
    result = unseal<Connection>(user.tokens);
  } catch {
    throw new AppError(
      "OUTLOOK_CONNECT",
      "Reconnect Outlook before sending.",
      401,
    );
  }
  if (
    result.version !== 1 ||
    result.email !== identity.email ||
    !result.homeAccountId ||
    !result.objectId ||
    !/^[0-9a-f-]{36}$/i.test(result.tenantId)
  )
    throw new AppError(
      "OUTLOOK_MISMATCH",
      "Connect the Outlook account that matches your verified UW mailbox.",
      409,
    );
  return result;
}

export function outlookStatus(user: Session) {
  const configured = integrationStatus().outlook;
  try {
    const linked = connection(user);
    return {
      configured,
      connected: configured,
      email: configured ? linked.email : null,
    };
  } catch {
    return { configured, connected: false, email: null };
  }
}

export function configuredOutlookSender(user: Session) {
  if (!integrationStatus().sending)
    throw new AppError(
      "MAIL_CONFIG",
      "Outlook sending is not configured on this server yet. Your drafts stay saved.",
      503,
    );
  return connection(user).email;
}

export async function beginOutlookAuthorization(user: Session) {
  const identity = verifiedIdentity(user);
  const app = client();
  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const nonce = randomBytes(32).toString("base64url");
  const pending: PendingAuthorization = {
    stateHash: digest(state),
    verifier,
    nonce,
    email: identity.email,
    expires: Date.now() + 10 * 60000,
  };
  const url = await app.getAuthCodeUrl({
    scopes: [...outlookScopes, "openid", "profile", "offline_access"],
    redirectUri: outlookRedirectURI(),
    responseMode: "query",
    state,
    nonce,
    codeChallenge: createHash("sha256").update(verifier).digest("base64url"),
    codeChallengeMethod: "S256",
    prompt: "select_account",
    loginHint: identity.email,
  });
  const saved = db()
    .prepare(
      "UPDATE sessions SET oauth=? WHERE id=? AND verified_email=? AND verified_at=? AND expires>?",
    )
    .run(seal(pending), user.id, identity.email, user.verified_at, Date.now());
  if (!saved.changes)
    throw new AppError(
      "OUTLOOK_STATE",
      "Your email session changed. Start connecting Outlook again.",
      409,
    );
  return url;
}

function claimAuthorization(user: Session, state: string) {
  const identity = verifiedIdentity(user);
  let pending: PendingAuthorization;
  try {
    pending = unseal<PendingAuthorization>(user.oauth || "");
  } catch {
    throw new AppError(
      "OUTLOOK_STATE",
      "This Outlook connection request expired. Start again.",
      400,
    );
  }
  if (
    !pending.stateHash ||
    pending.expires < Date.now() ||
    pending.email !== identity.email ||
    state.length > 256 ||
    !timingSafeEqual(
      Buffer.from(digest(state), "hex"),
      Buffer.from(pending.stateHash, "hex"),
    )
  )
    throw new AppError(
      "OUTLOOK_STATE",
      "This Outlook connection request expired or did not match this browser. Start again.",
      400,
    );
  const marker = seal({ processing: randomUUID() });
  const claimed = db()
    .prepare("UPDATE sessions SET oauth=? WHERE id=? AND oauth=?")
    .run(marker, user.id, user.oauth);
  if (!claimed.changes)
    throw new AppError(
      "OUTLOOK_STATE",
      "This Outlook connection request was already used. Start again.",
      400,
    );
  return { pending, marker };
}

async function readProfile(accessToken: string) {
  const response = await fetch(graphProfileURL, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(15000),
    redirect: "error",
  });
  if (!response.ok)
    throw new AppError(
      "OUTLOOK_PROFILE",
      "Microsoft could not confirm this mailbox. Reconnect Outlook and check your school permissions.",
      502,
    );
  const profile = await response.json();
  const email = (
    (typeof profile.mail === "string" && profile.mail) ||
    (typeof profile.userPrincipalName === "string" &&
      profile.userPrincipalName) ||
    ""
  )
    .trim()
    .toLowerCase();
  if (typeof profile.id !== "string" || !email)
    throw new AppError(
      "OUTLOOK_PROFILE",
      "Microsoft did not return a mailbox address.",
      502,
    );
  return { id: profile.id as string, email };
}

function hasSendPermission(scopes: string[]) {
  return scopes.some((scope) =>
    /^(https:\/\/graph\.microsoft\.com\/)?mail\.send$/i.test(scope),
  );
}

export async function completeOutlookAuthorization(
  user: Session,
  input: { state: string; code?: string; error?: string },
) {
  const { pending, marker } = claimAuthorization(user, input.state);
  try {
    if (input.error)
      throw new AppError(
        "OUTLOOK_DENIED",
        "Outlook was not connected. Your school may require administrator approval.",
        403,
      );
    if (!input.code || input.code.length > 12000)
      throw new AppError(
        "OUTLOOK_STATE",
        "The authorization response was incomplete. Start again.",
        400,
      );
    const app = client();
    const result = await app.acquireTokenByCode({
      code: input.code,
      redirectUri: outlookRedirectURI(),
      scopes: outlookScopes,
      codeVerifier: pending.verifier,
      nonce: pending.nonce,
    });
    if (
      !result?.account ||
      !hasSendPermission(result.scopes) ||
      !/^[0-9a-f-]{36}$/i.test(result.tenantId)
    )
      throw new AppError(
        "OUTLOOK_PERMISSION",
        "Microsoft has not granted permission to send from this mailbox.",
        403,
      );
    const profile = await readProfile(result.accessToken);
    if (profile.email !== pending.email)
      throw new AppError(
        "OUTLOOK_MISMATCH",
        "The connected Outlook mailbox does not match your verified UW email. Use the mailbox's primary address.",
        409,
      );
    const linked: Connection = {
      version: 1,
      cache: app.getTokenCache().serialize(),
      homeAccountId: result.account.homeAccountId,
      objectId: profile.id,
      tenantId: result.tenantId,
      email: profile.email,
      connectionId: randomUUID(),
    };
    const updated = db()
      .prepare(
        "UPDATE sessions SET tokens=?,oauth=NULL WHERE id=? AND oauth=? AND verified_email=? AND verified_at=? AND expires>?",
      )
      .run(
        seal(linked),
        user.id,
        marker,
        pending.email,
        user.verified_at,
        Date.now(),
      );
    if (!updated.changes)
      throw new AppError(
        "OUTLOOK_STATE",
        "Your email session changed while connecting Outlook. Start again.",
        409,
      );
  } finally {
    db()
      .prepare("UPDATE sessions SET oauth=NULL WHERE id=? AND oauth=?")
      .run(user.id, marker);
  }
}

export function disconnectOutlook(user: Session, expectedTokens?: string) {
  return transaction(() => {
    const result =
      expectedTokens === undefined
        ? db()
            .prepare("UPDATE sessions SET tokens=NULL,oauth=NULL WHERE id=?")
            .run(user.id)
        : db()
            .prepare("UPDATE sessions SET tokens=NULL WHERE id=? AND tokens=?")
            .run(user.id, expectedTokens);
    if (result.changes)
      db()
        .prepare(
          "UPDATE deliveries SET state='cancelled',error='Outlook was disconnected. Review a new batch after reconnecting.',updated_at=? WHERE session_id=? AND state='queued'",
        )
        .run(Date.now(), user.id);
  });
}

// Serialize token-cache refreshes per session; compare-and-swap also protects
// against sign-out, re-verification, and another process changing the connection.
const tokenLocks = new Map<string, Promise<void>>();
async function locked<T>(id: string, work: () => Promise<T>): Promise<T> {
  const previous = tokenLocks.get(id) || Promise.resolve();
  let release!: () => void;
  const next = new Promise<void>((resolve) => {
    release = resolve;
  });
  const tail = previous.then(() => next);
  tokenLocks.set(id, tail);
  await previous;
  try {
    return await work();
  } finally {
    release();
    if (tokenLocks.get(id) === tail) tokenLocks.delete(id);
  }
}

export function outlookAccess(id: string, expectedEmail: string) {
  return locked(id, async () => {
    const user = currentSession(id);
    const linked = connection(user);
    if (linked.email !== expectedEmail)
      throw new AppError(
        "OUTLOOK_MISMATCH",
        "The sending mailbox changed. Review a new batch.",
        409,
      );
    const app = client(linked.tenantId);
    app.getTokenCache().deserialize(linked.cache);
    const account = await app
      .getTokenCache()
      .getAccountByHomeId(linked.homeAccountId);
    if (!account)
      throw new AppError(
        "OUTLOOK_CONNECT",
        "Reconnect Outlook before sending.",
        401,
      );
    let result;
    try {
      result = await app.acquireTokenSilent({ account, scopes: outlookScopes });
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError)
        disconnectOutlook(user, user.tokens!);
      throw new AppError(
        "OUTLOOK_RECONNECT",
        "Microsoft could not authorize this send. Reconnect Outlook and review the message again.",
        401,
      );
    }
    if (
      !result ||
      !hasSendPermission(result.scopes) ||
      result.account?.homeAccountId !== linked.homeAccountId ||
      result.tenantId !== linked.tenantId
    )
      throw new AppError(
        "OUTLOOK_PERMISSION",
        "Microsoft has not granted permission for this mailbox. Reconnect Outlook.",
        403,
      );
    const profile = await readProfile(result.accessToken);
    if (profile.id !== linked.objectId || profile.email !== expectedEmail) {
      disconnectOutlook(user, user.tokens!);
      throw new AppError(
        "OUTLOOK_MISMATCH",
        "Your Outlook mailbox changed. Verify its primary address and connect it again.",
        409,
      );
    }
    const tokens = seal({ ...linked, cache: app.getTokenCache().serialize() });
    const updated = db()
      .prepare(
        "UPDATE sessions SET tokens=? WHERE id=? AND tokens=? AND verified_email=? AND verified_at=? AND expires>?",
      )
      .run(
        tokens,
        id,
        user.tokens,
        expectedEmail,
        user.verified_at,
        Date.now(),
      );
    if (!updated.changes)
      throw new AppError(
        "OUTLOOK_STATE",
        "Your Outlook connection changed. Nothing was sent; review the message again.",
        409,
      );
    return {
      accessToken: result.accessToken,
      connectionId: linked.connectionId,
      tokens,
    };
  });
}

export function assertOutlookConnection(
  id: string,
  email: string,
  connectionId: string,
) {
  const linked = connection(currentSession(id));
  if (linked.email !== email || linked.connectionId !== connectionId)
    throw new AppError(
      "OUTLOOK_STATE",
      "Your Outlook connection changed. Nothing was sent.",
      409,
    );
}
