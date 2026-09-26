"use client";
import { useEffect, useState } from "react";
import { Button, Field, Notice } from "@/components/ui";
import { requestJSON } from "@/lib/api";

export interface EmailIdentity {
  verified: boolean;
  email: string | null;
  verificationAvailable: boolean;
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
  const update = (value: EmailIdentity) => {
    setIdentity(value);
    onChange(value);
  };
  useEffect(() => {
    let cancelled = false;
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
    <div className="account-box">
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
                update({ ...identity, verified: false, email: null });
                setSent(false);
              })
            }
          >
            Sign out of this email
          </Button>
        </>
      ) : (
        <>
          <p>
            Receive a six-digit code in your UW mailbox. No school sign-in page
            or mailbox password is required.
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
    </div>
  );
}
