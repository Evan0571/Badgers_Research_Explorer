import type { Researcher } from "./types";
import { departments } from "./research-metadata";
export interface CatalogCoverage {
  total: number;
  rosterListed: number;
  researchIndexed: number;
  profileVerified: number;
  emailVerified: number;
  rosterOnly: number;
  departments: number;
  rosterCheckedAt: string | null;
  undergraduate?: {
    reviewed: number;
    partial: number;
    failed: number;
    pending: number;
    supervision: number;
    applications: number;
    openings: number;
    forms: number;
  };
}
export function catalogCoverage(records: Researcher[]): CatalogCoverage {
  const dates = records
    .flatMap((r) =>
      r.coverage?.rosterCheckedAt ? [r.coverage.rosterCheckedAt] : [],
    )
    .sort();
  return {
    total: records.length,
    rosterListed: records.filter((r) => r.coverage).length,
    researchIndexed: records.filter((r) => r.coverage?.level !== "roster")
      .length,
    profileVerified: records.filter(
      (r) => !r.coverage || r.coverage.level === "profile",
    ).length,
    emailVerified: records.filter((r) => !!r.contact.email).length,
    rosterOnly: records.filter((r) => r.coverage?.level === "roster").length,
    departments: new Set(
      records
        .filter((r) => r.coverage?.category !== "emeritus")
        .flatMap((r) => departments(r.department)),
    ).size,
    rosterCheckedAt: dates[0] || null,
    undergraduate: {
      reviewed: records.filter((r) => r.undergraduate?.checkedAt).length,
      partial: records.filter((r) => r.undergraduate?.status === "partial")
        .length,
      failed: records.filter((r) => r.undergraduate?.status === "failed")
        .length,
      pending: records.filter((r) => !r.undergraduate).length,
      supervision: records.filter(
        (r) => r.undergraduate?.supervision.value === "yes",
      ).length,
      applications: records.filter(
        (r) => r.undergraduate?.applications.value === "yes",
      ).length,
      openings: records.filter((r) => r.undergraduate?.openings.value === "yes")
        .length,
      forms: records.filter((r) =>
        r.undergraduate?.contactOptions.some((o) => o.kind === "form"),
      ).length,
    },
  };
}
