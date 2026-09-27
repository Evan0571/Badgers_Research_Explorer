import { load } from "cheerio";
import { sourceEmails } from "./email-evidence";
import { nameKey, type FacultyEntry } from "./faculty-roster";

export function nameMatcher(roster: FacultyEntry[]) {
  const aliases = new Map<string, FacultyEntry[]>();
  for (const person of roster) {
    for (const key of new Set([
      nameKey(person.name),
      nameKey(person.firstName.split(" ")[0] + " " + person.lastName),
    ])) {
      aliases.set(key, [...(aliases.get(key) || []), person]);
    }
  }
  return (label: string) => {
    const key = nameKey(
      label
        .replace(/^(?:Dr\.?|Professor)\s+/i, "")
        .replace(/,?\s+(?:Ph\.?D\.?|M\.?D\.?).*$/i, ""),
    );
    const matches = aliases.get(key);
    return matches?.length === 1 ? matches[0] : undefined;
  };
}
export function publicLinks(html: string, url: string) {
  const $ = load(html);
  return $("a[href]")
    .toArray()
    .flatMap((a) => {
      try {
        const u = new URL($(a).attr("href")!, url);
        u.hash = "";
        return u.protocol === "https:" &&
          !u.username &&
          !u.password &&
          (u.hostname === "wisc.edu" || u.hostname.endsWith(".wisc.edu")) &&
          !/\.(pdf|jpg|png|zip|docx?)$/i.test(u.pathname) &&
          !(
            u.hostname === "www.wisc.edu" &&
            u.pathname.startsWith("/directories")
          )
          ? [{ url: u.href, label: $(a).text().replace(/\s+/g, " ").trim() }]
          : [];
      } catch {
        return [];
      }
    });
}
/** Require a matching individual page heading before associating a public email. */
export function profileContact(
  html: string,
  url: string,
  entry: FacultyEntry,
  checkedAt = new Date().toISOString(),
) {
  const $ = load(html);
  $(
    "script,style,nav,footer,header,aside,noscript,.uw-footer,.site-footer",
  ).remove();
  const match = nameMatcher([entry]);
  const heading = $("h1,h2,.uw-name,.faculty-name")
    .toArray()
    .find((el) => match($(el).text().trim()));
  if (!heading) return null;
  $("br").replaceWith(" ");
  $("h1,h2,h3,h4,p,div,li,section,article,dt,dd,td,a").append(" ");
  const content = $("main").length
    ? $("main")
    : $("#content").length
      ? $("#content")
      : $("body");
  const text = content.text().replace(/\s+/g, " ").trim();
  const emails = sourceEmails(
    text,
    content
      .find("a[href^='mailto:']")
      .toArray()
      .flatMap((a) => {
        try {
          return [
            decodeURIComponent($(a).attr("href")!.slice(7).split("?")[0]),
          ];
        } catch {
          return [];
        }
      }),
  ).filter(
    (e) =>
      /@(?:[a-z0-9-]+\.)*wisc\.edu$/i.test(e) &&
      !/^(webmaster|webadmin|info|contact|help|support|accessibility|communications|office|admin)@/i.test(
        e,
      ),
  );
  // Multiple contacts cannot be safely assigned to this person automatically.
  return {
    key: entry.key,
    url,
    name: entry.name,
    email: emails.length === 1 ? emails[0] : undefined,
    checkedAt,
    excerpt: entry.name + (emails.length === 1 ? " — " + emails[0] : ""),
  };
}
