"use client";
import { Select } from "@/components/ui";
import { useLocale } from "../locale";
import type { UndergraduateFilters as Filters } from "@/lib/undergraduate";

export function UndergraduateFilters({
  prefix,
  value,
  onChange,
}: {
  prefix: string;
  value: Filters;
  onChange: (value: Filters) => void;
}) {
  const { t } = useLocale();
  const fields = [
    {
      key: "supervision",
      label: t("Undergraduate mentoring", "是否带本科生科研"),
      yes: t("Mentoring evidence found", "有明确指导记录"),
      no: t("Explicitly does not supervise", "明确不指导本科生"),
    },
    {
      key: "openings",
      label: t("Current undergraduate openings", "目前是否有本科生名额"),
      yes: t("Current openings reported", "明确有当前名额"),
      no: t("No current openings", "明确暂无名额"),
    },
    {
      key: "applications",
      label: t("Undergraduate applications", "是否接受本科生申请"),
      yes: t("Accepts inquiries / applications", "接受咨询或申请"),
      no: t("Not accepting applications", "明确不接受申请"),
    },
  ] as const;
  return (
    <>
      {fields.map(({ key, label, yes, no }) => (
        <Select
          key={key}
          id={`${prefix}-${key}`}
          label={label}
          value={value[key] || ""}
          onChange={(e) => onChange({ ...value, [key]: e.target.value })}
        >
          <option value="">{t("Any", "不限")}</option>
          <option value="yes">{yes}</option>
          <option value="no">{no}</option>
          <option value="unknown">
            {t("Unknown / not verified", "未知或尚未核实")}
          </option>
        </Select>
      ))}
    </>
  );
}

export function UndergraduateFilterHelp() {
  const { t } = useLocale();
  return (
    <p className="small muted">
      {t(
        "Selected conditions must all match. Mentoring includes past or current undergraduate research; accepting applications does not confirm an opening. Unknown does not mean no.",
        "所选条件须同时满足。“带本科生”指有过或正在指导本科科研；接受申请不代表现在有名额。未知不等于没有。",
      )}
    </p>
  );
}
