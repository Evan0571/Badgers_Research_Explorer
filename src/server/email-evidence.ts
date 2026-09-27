// Decode only explicit address obfuscation. Never construct an address from a name.
export function normalizeEmailText(text: string) {
  return text
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\[\s*(?:at|@)\s*\]|\(\s*(?:at|@)\s*\)|\{\s*(?:at|@)\s*\}/gi, "@")
    .replace(
      /\[\s*(?:dot|\.)\s*\]|\(\s*(?:dot|\.)\s*\)|\{\s*(?:dot|\.)\s*\}/gi,
      ".",
    )
    .replace(/\s+at\s+(?=[a-z0-9-]+(?:\s+dot\s+|\.))/gi, "@")
    .replace(/\s+dot\s+(?=[a-z0-9-]+)/gi, ".")
    .replace(/\s*@\s*/g, "@")
    .replace(/(?<=[a-z0-9])\s+\.\s*(?=[a-z0-9])/gi, ".");
}
export function sourceEmails(text: string, emails: string[] = []) {
  const normalized = normalizeEmailText(text + " " + emails.join(" "));
  return [
    ...new Set(
      (
        normalized.match(
          /[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+/gi,
        ) || []
      ).map((v) => v.toLowerCase()),
    ),
  ];
}
export function hasEmail(
  document: { text: string; emails?: string[] } | undefined,
  email: string,
) {
  return (
    !!document &&
    sourceEmails(document.text, document.emails).includes(
      normalizeEmailText(email).toLowerCase().trim(),
    )
  );
}
