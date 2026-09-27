"use client";
import { useLocale } from "../locale";
import { useEffect, useState } from "react";
import { Button, Field, Notice } from "@/components/ui";
import { requestJSON } from "@/lib/api";
import { useEmailIdentity } from "./use-email-identity";
import { isUWEmail } from "@/lib/uw-email";
import { BRAND_NAME } from "@/lib/brand";

const connectionMessages: Record<string, [string, string]> = {
  connected: [
    "Outlook connected. You can return to Emails to review and send your drafts.",
    "Outlook 已连接。你可以返回邮件草稿页面，核对并发送邮件。",
  ],
  outlook_denied: [
    "Outlook was not connected. You may have cancelled, or your school may require administrator approval.",
    "Outlook 未连接。你可能取消了授权，或学校要求管理员批准。",
  ],
  outlook_mismatch: [
    "That Outlook mailbox did not match your verified UW email. Verify its primary address and connect the matching account.",
    "此 Outlook 邮箱与你验证的 UW 邮箱不一致。请验证其主邮箱地址，并连接相同账户。",
  ],
  outlook_state: [
    "The Outlook connection request expired or your session changed. Connect again.",
    "Outlook 连接请求已过期，或会话发生变化。请重新连接。",
  ],
  outlook_permission: [
    "Microsoft did not grant the requested sending permission. Your school may require administrator approval.",
    "Microsoft 未授予发送权限，学校可能要求管理员批准。",
  ],
  outlook_config: [
    "Outlook sending is not available on this server yet.",
    "此服务器暂未配置 Outlook 发送功能。",
  ],
  outlook_failed: [
    "Outlook could not be connected. Try again or check your school’s app permissions.",
    "无法连接 Outlook。请重试或检查学校的应用授权设置。",
  ],
  disconnected: [
    "Outlook disconnected. Queued messages were cancelled. Messages already submitted cannot be recalled here.",
    "Outlook 已断开，排队中的邮件已取消。已提交的邮件无法在此撤回。",
  ],
};

export function EmailVerification() {
  const { t } = useLocale();
  const {
    identity,
    loading,
    error: identityError,
    refresh,
  } = useEmailIdentity();
  const [email, setEmail] = useState(""),
    [code, setCode] = useState("");
  const [sent, setSent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [connectionNotice, setConnectionNotice] = useState("");
  useEffect(() => {
    const url = new URL(window.location.href);
    const outcome = url.searchParams.get("outlook");
    if (outcome) {
      setConnectionNotice(outcome);
      url.searchParams.delete("outlook");
      window.history.replaceState(
        null,
        "",
        url.pathname + url.search + url.hash,
      );
    }
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
  if (!identity)
    return (
      <Notice tone={identityError ? "error" : undefined}>
        {loading
          ? t("Loading email settings…", "正在加载邮箱设置…")
          : identityError}
        {!loading && (
          <Button variant="ghost" onClick={() => void refresh()}>
            {t("Try again", "重试")}
          </Button>
        )}
      </Notice>
    );
  return (
    <div className="account-box" id="mail-account">
      <h3>
        {identity?.verified
          ? t("UW email verified", "UW 邮箱已验证")
          : t("Verify your UW email", "验证你的 UW 邮箱")}
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
                await refresh();
                setConnectionNotice("");
                setSent(false);
              })
            }
          >
            {t("Sign out of this email", "退出此邮箱")}
          </Button>
          <h3 className="outlook-settings-heading">
            {identity.outlook?.connected
              ? t("Outlook connected", "Outlook 已连接")
              : t("Send from your own Outlook", "通过自己的 Outlook 发送")}
          </h3>
          {identity.outlook?.connected ? (
            <>
              <p>
                {t("From:", "发件邮箱：")} {identity.outlook.email}.{" "}
                {t(
                  "Each confirmed message is sent through this mailbox and saved in Outlook Sent Items.",
                  "确认发送的邮件会通过此邮箱发出，并保存在 Outlook 已发送邮件中。",
                )}
              </p>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() =>
                  perform(async () => {
                    await requestJSON("/api/outlook/disconnect", {});
                    await refresh();
                    setConnectionNotice("disconnected");
                  })
                }
              >
                {t("Disconnect Outlook", "断开 Outlook 连接")}
              </Button>
            </>
          ) : (
            <>
              <p>
                {t(
                  "Connect the same UW account to send from your own address. Microsoft may open your school’s sign-in and permission pages.",
                  "连接同一个 UW 账户，即可通过自己的邮箱发送。Microsoft 可能会打开学校的登录与授权页面。",
                )}
              </p>
              <p className="small muted">
                {t(
                  `Permission covers your basic profile, sending mail, and maintaining the connection. ${BRAND_NAME} does not request access to read your inbox.`,
                  "授权范围包括基本资料、发送邮件和维持连接，不会申请读取收件箱的权限。",
                )}
              </p>
              {!identity.outlook?.configured && (
                <Notice>
                  {t(
                    "Outlook connection is not available yet. You can continue preparing and exporting drafts.",
                    "Outlook 连接暂不可用，你仍可准备和导出草稿。",
                  )}
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
                {busy
                  ? t("Connecting…", "正在连接…")
                  : t("Connect Outlook", "连接 Outlook")}
              </Button>
            </>
          )}
        </>
      ) : (
        <>
          <p>
            {t(
              "Verify your UW address with a six-digit code, then connect Outlook to send from that mailbox.",
              "使用六位验证码验证 UW 邮箱，然后连接 Outlook 以从该邮箱发送。",
            )}
          </p>
          {identity && !identity.verificationAvailable && (
            <Notice>
              {t(
                "Email verification needs a configured email delivery service on the server.",
                "邮箱验证需要服务器配置邮件服务。",
              )}
            </Notice>
          )}
          <Field
            id="verification-email"
            label={t("UW email address", "UW 邮箱地址")}
            type="email"
            autoComplete="email"
            value={email}
            aria-invalid={!!email.trim() && !isUWEmail(email.trim())}
            aria-describedby={
              email.trim() && !isUWEmail(email.trim())
                ? "uw-email-help"
                : undefined
            }
            onChange={(e) => {
              setEmail(e.target.value);
              setSent(false);
            }}
          />
          {email.trim() && !isUWEmail(email.trim()) && (
            <p id="uw-email-help" className="small error-text">
              {t(
                "Enter a UW address ending in @wisc.edu or a UW subdomain, such as @cs.wisc.edu.",
                "请输入以 @wisc.edu 或学校子域名（如 @cs.wisc.edu）结尾的 UW 邮箱。",
              )}
            </p>
          )}
          <Button
            variant="secondary"
            disabled={
              busy ||
              !isUWEmail(email.trim()) ||
              !identity?.verificationAvailable
            }
            onClick={() =>
              perform(async () => {
                if (!isUWEmail(email.trim())) return;
                await requestJSON("/api/auth/request-code", {
                  email: email.trim(),
                });
                setSent(true);
              })
            }
          >
            {busy
              ? t("Working…", "正在处理…")
              : sent
                ? t("Request a new code", "重新获取验证码")
                : t("Email me a code", "发送验证码")}
          </Button>
          {sent && (
            <>
              <Field
                id="verification-code"
                label={t("Verification code", "验证码")}
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
                    await refresh();
                    setCode("");
                  })
                }
              >
                {t("Verify email", "验证邮箱")}
              </Button>
              <p className="small muted">
                {t(
                  "Code expires in 10 minutes. Wait one minute before requesting another.",
                  "验证码 10 分钟内有效，请间隔一分钟再申请。",
                )}
              </p>
            </>
          )}
        </>
      )}
      {error && <Notice tone="error">{error}</Notice>}
      {connectionNotice && (
        <Notice>
          {t(
            ...(connectionMessages[connectionNotice] ||
              connectionMessages.outlook_failed),
          )}
        </Notice>
      )}
    </div>
  );
}
