import { sourceEmails } from "./email-evidence";
import https from "node:https";
import { lookup } from "node:dns/promises";
import { isIP, BlockList } from "node:net";
import { load } from "cheerio";
import { AppError } from "./http";
import { digest } from "./security";

export const isUniversityURL = (raw: string) => {
  try {
    const u = new URL(raw);
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      (!u.port || u.port === "443") &&
      (u.hostname === "wisc.edu" || u.hostname.endsWith(".wisc.edu"))
    );
  } catch {
    return false;
  }
};
const blocked = new BlockList();
for (const [net, mask] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const)
  blocked.addSubnet(net, mask, "ipv4");
export function publicAddress(address: string) {
  return isIP(address) === 4
    ? !blocked.check(address, "ipv4")
    : isIP(address) === 6 &&
        /^[23][0-9a-f]{3}:/i.test(address) &&
        !/^2001:db8:/i.test(address);
}
export function safeURL(raw: string) {
  const url = new URL(raw);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443") ||
    url.hostname === "localhost" ||
    isIP(url.hostname)
  )
    throw new AppError("SOURCE_URL", "This source URL is not allowed.");
  url.hash = "";
  return url;
}
async function download(
  url: URL,
  signal?: AbortSignal,
): Promise<{
  status: number;
  location?: string;
  contentType: string;
  html: string;
}> {
  const addresses = await lookup(url.hostname, { all: true });
  signal?.throwIfAborted();
  if (!addresses.length || addresses.some((a) => !publicAddress(a.address)))
    throw new AppError("SOURCE_ADDRESS", "The source address is not public.");
  const address = addresses.find((a) => a.family === 4) || addresses[0];
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers: {
          "User-Agent":
            "UWResearchExplorer/0.1 (public research source verification)",
          Accept: "text/html,text/plain",
        },
        // Pin the validated address so DNS cannot change between validation and connect.
        lookup: (_hostname, options, callback) => {
          if (options.all) callback(null, [address]);
          else callback(null, address.address, address.family);
        },
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(10000)])
          : AbortSignal.timeout(10000),
      },
      (res) => {
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (chunk) => {
          size += chunk.length;
          if (size > 2_000_000) request.destroy(new Error("Source too large"));
          else chunks.push(chunk);
        });
        res.on("error", reject);
        res.on("end", () =>
          resolve({
            status: res.statusCode || 0,
            location: res.headers.location,
            contentType: res.headers["content-type"] || "",
            html: Buffer.concat(chunks).toString("utf8"),
          }),
        );
      },
    );
    request.on("error", reject);
  });
}
export interface SourceDocument {
  id: string;
  url: string;
  title: string;
  text: string;
  links: string[];
  checkedAt: string;
  emails?: string[];
  linkLabels?: { url: string; label: string; navigation?: boolean }[];
  truncated?: boolean;
}
export async function readSource(
  raw: string,
  allowedHosts: Set<string>,
  signal?: AbortSignal,
): Promise<SourceDocument> {
  let url = safeURL(raw);
  for (let count = 0; count < 4; count++) {
    signal?.throwIfAborted();
    if (!allowedHosts.has(url.hostname))
      throw new AppError(
        "SOURCE_REDIRECT",
        "A source redirected to an unverified website.",
      );
    const result = await download(url, signal);
    if ([301, 302, 303, 307, 308].includes(result.status) && result.location) {
      url = safeURL(new URL(result.location, url).href);
      continue;
    }
    if (
      result.status !== 200 ||
      !/text\/html|text\/plain/i.test(result.contentType)
    )
      throw new AppError("SOURCE_UNAVAILABLE", "A source could not be read.");
    const $ = load(result.html);
    const title = $("head > title").first().text().trim().slice(0, 200);
    const links = [
      ...new Set(
        $("a[href]")
          .toArray()
          .flatMap((a) => {
            try {
              return [
                safeURL(
                  new URL($(a).attr("href")!, url).href.replace(
                    /^http:/,
                    "https:",
                  ),
                ).href,
              ];
            } catch {
              return [];
            }
          }),
      ),
    ];
    const linkLabels = $("a[href]")
      .toArray()
      .flatMap((a) => {
        try {
          return [
            {
              url: safeURL(
                new URL($(a).attr("href")!, url).href.replace(
                  /^http:/,
                  "https:",
                ),
              ).href,
              label: $(a).text().replace(/\s+/g, " ").trim(),
              navigation:
                $(a).closest('nav,header,footer,[role="navigation"]').length >
                0,
            },
          ];
        } catch {
          return [];
        }
      });
    const mailtos = $("a[href^='mailto:']")
      .toArray()
      .map((a) => {
        try {
          return decodeURIComponent($(a).attr("href")!.slice(7).split("?")[0]);
        } catch {
          return "";
        }
      });
    $("script,style,noscript,svg,nav,footer,header").remove();
    $("br").replaceWith(" ");
    $("h1,h2,h3,h4,p,div,li,section,article,dt,dd,td,a").append(" ");
    const fullText = $("body").text().replace(/\s+/g, " ").trim();
    const text = fullText.slice(0, 100000);
    if (text.length < (isUniversityURL(url.href) ? 60 : 150))
      throw new AppError(
        "SOURCE_EMPTY",
        "A source did not contain enough readable text.",
      );
    return {
      id: digest(url.href).slice(0, 20),
      url: url.href,
      title,
      text,
      emails: sourceEmails(text, mailtos),
      links,
      linkLabels,
      truncated: fullText.length > text.length,
      checkedAt: new Date().toISOString(),
    };
  }
  throw new AppError(
    "SOURCE_REDIRECT",
    "The source redirected too many times.",
  );
}
export function hasQuote(document: SourceDocument | undefined, quote: string) {
  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  return (
    !!document &&
    quote.trim().length >= 12 &&
    normalize(document.text).includes(normalize(quote))
  );
}
