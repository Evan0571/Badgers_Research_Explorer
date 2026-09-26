import { z } from "zod";
import { requestCode } from "@/server/verification";
import { session } from "@/server/security";
import { checkOrigin, failure, json, jsonBody } from "@/server/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const input = await jsonBody(
      request,
      z.object({ email: z.email().max(254) }),
    );
    return json(await requestCode(await session(), input.email));
  } catch (error) {
    return failure(error);
  }
}
