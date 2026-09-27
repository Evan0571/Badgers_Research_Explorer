import { session } from "@/server/security";
import { failure, json, checkOrigin } from "@/server/http";
import { getJob, stopJob } from "@/server/jobs";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await session(false);
    return json(await getJob((await context.params).id, user.id));
  } catch (error) {
    return failure(error);
  }
}
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    checkOrigin(request);
    const user = await session(false);
    return json(await stopJob((await context.params).id, user.id));
  } catch (error) {
    return failure(error);
  }
}
