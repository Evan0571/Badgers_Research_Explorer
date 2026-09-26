"use client";
import { useEffect, useState } from "react";
import { Button, Field, Notice } from "@/components/ui";
import { requestJSON } from "@/lib/api";

export interface EmailIdentity {
  verified: boolean;
  email: string | null;
  verificationAvailable: boolean;
  outlook: { configured: boolean; connected: boolean; email: string | null };
}
export function EmailVerification({
  onChange,
}: {
  onChange: (value: EmailIdentity) => void;
}) {
  const [identity, setIdentity] = useState<EmailIdentity | null>(null);
  const [email, setEmail] = useState(""),
    [code, setCode] = useState("");
  const [sent, setSent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [connectionNotice, setConnectionNotice] = useState("");
  const update = (value: EmailIdentity) => {
    setIdentity(value);
    onChange(value);
  };
  useEffect(() => {
    let cancelled = false;
    const url = new URL(window.location.href);
    const outcome = url.searchParams.get("outlook");
    if (outcome) {
      const messages: Record<string, string> = {
        connected:
          "Outlook connected. Review your drafts before sending from your own mailbox.",
        outlook_denied:
          "Outlook was not connected. You may have cancelled, or your school may require administrator approval.",
        outlook_mismatch:
          "That Outlook mailbox did not match your verified UW email. Verify its primary address and connect the matching account.",
        outlook_state:
          "The Outlook connection request expired or your session changed. Connect again.",
        outlook_permission:
          "Microsoft did not grant the requested sending permission. Your school may require administrator approval.",
        outlook_config: "Outlook sending is not available on this server yet.",
        outlook_failed:
          "Outlook could not be connected. Try again or check your school’s app permissions.",
      };
      setConnectionNotice(
        messages[outcome] || "Outlook connection could not be confirmed.",
      );
      url.searchParams.delete("outlook");
      window.history.replaceState(
        null,
        "",
        url.pathname + url.search + url.hash,
      );
    }
    requestJSON<EmailIdentity>("/api/auth/session")
      .then((value) => {
        if (!cancelled) update(value);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
    // The parent callback only receives account status; it does not drive reloading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const perform = async (work: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="account-box" id="mail-account">
      <h3>
        {identity?.verified ? "UW email verified" : "Verify your UW email"}
      </h3>
      {identity?.verified ? (
        <>
          <p>{identity.email}</p>
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() =>
              perform(async () => {
                await requestJSON("/api/auth/session", {}, "DELETE");
                update(await requestJSON<EmailIdentity>("/api/auth/session"));
                setConnectionNotice("");
                setSent(false);
              })
            }
          >
            Sign out of this email
          </Button>
          <h3 style={{ marginTop: 20 }}>
            {identity.outlook?.connected
              ? "Outlook connected"
              : "Send from your own Outlook"}
          </h3>
          {identity.outlook?.connected ? (
            <>
              <p>
                From: {identity.outlook.email}. Each confirmed message is sent
                through this mailbox and saved in Outlook Sent Items.
              </p>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() =>
                  perform(async () => {
                    await requestJSON("/api/outlook/disconnect", {});
                    update(
                      await requestJSON<EmailIdentity>("/api/auth/session"),
                    );
                    setConnectionNotice(
                      "Outlook disconnected. Queued messages were cancelled. Messages already submitted cannot be recalled here.",
                    );
                  })
                }
              >
                Disconnect Outlook
              </Button>
            </>
          ) : (
            <>
              <p>
                Connect the same UW account to send from your own address.
                Microsoft may open your school’s sign-in and permission pages.
              </p>
              <p className="small muted">
                Permission covers your basic profile, sending mail, and
                maintaining the connection. Research Explorer does not request
                access to read your inbox.
              </p>
              {!identity.outlook?.configured && (
                <Notice>
                  Outlook connection is not available yet. You can continue
                  preparing and exporting drafts.
                </Notice>
              )}
              <Button
                variant="secondary"
                disabled={busy || !identity.outlook?.configured}
                onClick={() =>
                  perform(async () => {
                    const result = await requestJSON<{ url: string }>(
                      "/api/outlook/connect",
                      {},
                    );
                    window.location.assign(result.url);
                  })
                }
              >
                {busy ? "Connecting…" : "Connect Outlook"}
              </Button>
            </>
          )}
        </>
      ) : (
        <>
          <p>
            Verify your UW address with a six-digit code, then connect Outlook
            to send from that mailbox.
          </p>
          {identity && !identity.verificationAvailable && (
            <Notice>
              Email verification needs a configured email delivery service on
              the server.
            </Notice>
          )}
          <Field
            id="verification-email"
            label="UW email address"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setSent(false);
            }}
          />
          <Button
            variant="secondary"
            disabled={busy || !email || !identity?.verificationAvailable}
            onClick={() =>
              perform(async () => {
                await requestJSON("/api/auth/request-code", { email });
                setSent(true);
              })
            }
          >
            {busy
              ? "Working…"
              : sent
                ? "Request a new code"
                : "Email me a code"}
          </Button>
          {sent && (
            <>
              <Field
                id="verification-code"
                label="Verification code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
              <Button
                disabled={busy || code.length !== 6}
                onClick={() =>
                  perform(async () => {
                    await requestJSON("/api/auth/verify-code", { code });
                    update(
                      await requestJSON<EmailIdentity>("/api/auth/session"),
                    );
                    setCode("");
                  })
                }
              >
                Verify email
              </Button>
              <p className="small muted">
                Code expires in 10 minutes. Wait one minute before requesting
                another.
              </p>
            </>
          )}
        </>
      )}
      {error && <Notice tone="error">{error}</Notice>}
      {connectionNotice && <Notice>{connectionNotice}</Notice>}
    </div>
  );
}
