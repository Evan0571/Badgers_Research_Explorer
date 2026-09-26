import { completeOutlookAuthorization } from "@/server/outlook";
import { session } from "@/server/security";
import { config } from "@/server/config";
import { AppError } from "@/server/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  let status = "connected";
  try {
    const url = new URL(request.url);
    const user = await session(false);
    await completeOutlookAuthorization(user, {
      state: url.searchParams.get("state") || "",
      code: url.searchParams.get("code") || undefined,
      error: url.searchParams.get("error") || undefined,
    });
  } catch (error) {
    status =
      error instanceof AppError &&
      [
        "OUTLOOK_DENIED",
        "OUTLOOK_MISMATCH",
        "OUTLOOK_STATE",
        "OUTLOOK_PERMISSION",
        "OUTLOOK_CONFIG",
      ].includes(error.code)
        ? error.code.toLowerCase()
        : "outlook_failed";
  }
  // Remove authorization parameters immediately; never echo provider error text.
  return new Response(null, {
    status: 303,
    headers: {
      Location: `${config().origin}/explore/mail?outlook=${status}`,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
