import { disconnectOutlook } from "@/server/outlook";
import { session } from "@/server/security";
import { checkOrigin, failure, json } from "@/server/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    disconnectOutlook(await session(false));
    return json({ disconnected: true });
  } catch (error) {
    return failure(error);
  }
}
