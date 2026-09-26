import { z } from "zod";
import { config } from "./config";

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function checkOrigin(request: Request) {
  if (request.headers.get("origin") !== config().origin)
    throw new AppError(
      "ORIGIN",
      "This request must come from the application.",
      403,
    );
}
export async function readBody(request: Request, limit = 100_000) {
  if (Number(request.headers.get("content-length")) > limit)
    throw new AppError("BODY_SIZE", "The request is too large.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new AppError("BODY", "A request body is required.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) {
        await reader.cancel();
        throw new AppError("BODY_SIZE", "The request is too large.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}
export async function jsonBody<T>(
  request: Request,
  schema: z.ZodType<T>,
  limit?: number,
): Promise<T> {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new AppError("CONTENT_TYPE", "JSON is required.", 415);
  try {
    return schema.parse(
      JSON.parse((await readBody(request, limit)).toString("utf8")),
    );
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      "INVALID_INPUT",
      "Some submitted fields are missing or invalid.",
    );
  }
}
export function json(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
export function failure(error: unknown) {
  if (error instanceof AppError)
    return json({ code: error.code, error: error.message }, error.status);
  // Never log provider responses, document text, messages, or credentials.
  console.error(
    "Request failed",
    error instanceof Error ? error.name : "UnknownError",
  );
  return json(
    {
      code: "INTERNAL",
      error:
        "The request could not be completed. Your saved work is unchanged.",
    },
    500,
  );
}
