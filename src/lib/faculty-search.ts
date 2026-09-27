function nameWords(value: string) {
  return (
    value
      .normalize("NFKD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .match(/[\p{L}\p{N}]+/gu) || []
  );
}

/** Match first/last names and word prefixes, never research prose or keywords. */
export function matchesFacultyName(name: string, query: string) {
  if (!query.trim()) return true;
  const terms = nameWords(query);
  const words = nameWords(name);
  return (
    terms.length > 0 &&
    terms.every((term) =>
      words.some((word) =>
        /\p{Script=Han}/u.test(term)
          ? word.includes(term)
          : word.startsWith(term),
      ),
    )
  );
}
