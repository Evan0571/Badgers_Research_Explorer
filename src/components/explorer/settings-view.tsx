"use client";
import { EmailVerification } from "./email-verification";
import { useLocale } from "../locale";

export function SettingsView() {
  const { t } = useLocale();
  return (
    <div className="settings-page">
      <div className="page-heading">
        <h1>{t("Settings", "设置")}</h1>
        <p>
          {t(
            "Manage your UW email verification and Outlook connection.",
            "管理 UW 邮箱认证与 Outlook 连接。",
          )}
        </p>
      </div>
      <EmailVerification />
    </div>
  );
}
