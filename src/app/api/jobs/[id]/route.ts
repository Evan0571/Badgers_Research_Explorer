import { session } from "@/server/security";
import { failure, json } from "@/server/http";
import { getJob } from "@/server/jobs";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await session(false);
    return json(getJob((await context.params).id, user.id));
  } catch (error) {
    return failure(error);
  }
}
