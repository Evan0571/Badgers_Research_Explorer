import { beginOutlookAuthorization } from "@/server/outlook";
import { session, rateLimit } from "@/server/security";
import { checkOrigin, failure, json } from "@/server/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const user = await session(false);
    rateLimit(`outlook:${user.id}`, 10, 3600000);
    return json({ url: await beginOutlookAuthorization(user) });
  } catch (error) {
    return failure(error);
  }
}
