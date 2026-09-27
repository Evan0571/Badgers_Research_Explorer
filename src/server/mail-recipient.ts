import type { Draft } from "@/lib/types";

// The caller must supply the server-verified sender, never a client assertion.
// Aliases and similar-looking domains do not establish mailbox ownership.
export function isSelfAddressed(
  draft: Pick<Draft, "to">,
  verifiedSender: string,
) {
  const sender = verifiedSender.trim().toLowerCase();
  return !!sender && draft.to.trim().toLowerCase() === sender;
}
