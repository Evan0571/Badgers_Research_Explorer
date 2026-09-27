import type { Researcher } from "./types";

/** Classify legacy links by their destination, not by the research coverage level. */
export function researcherWebsiteKind(r: Researcher) {
  try {
    const url = new URL(r.contact.url);
    if (
      url.hostname === "guide.wisc.edu" &&
      /^\/faculty\/?$/.test(url.pathname)
    )
      return "roster";
    if (
      url.hostname === "wisc.discovery.academicanalytics.com" &&
      url.pathname.startsWith("/scholar/")
    )
      return "research-index";
  } catch {
    return "website";
  }
  return r.coverage?.profileCheckedAt ? "profile" : "website";
}
