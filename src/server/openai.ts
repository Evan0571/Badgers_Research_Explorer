import { z } from "zod";
import { config } from "./config";
import { AppError } from "./http";

interface AIResponse {
  status: string;
  output: {
    type: string;
    action?: { sources?: { url: string; title?: string }[] };
    content?: {
      type: string;
      text?: string;
      annotations?: { type: string; url?: string }[];
    }[];
  }[];
}
export async function response(
  instructions: string,
  input: string,
  format?: object,
  web = false,
  timeoutMs = 120000,
  options: {
    allowedDomains?: string[];
    maxOutputTokens?: number;
    signal?: AbortSignal;
  } = {},
) {
  const c = config();
  if (!c.apiKey)
    throw new AppError(
      "AI_NOT_CONFIGURED",
      "Live search and AI generation are not configured yet. Add the OpenAI API key on the server to continue.",
      503,
    );
  let result: Response;
  try {
    result = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${c.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: c.model,
        store: false,
        instructions,
        input,
        max_output_tokens: options.maxOutputTokens || 12000,
        ...(format ? { text: { format } } : {}),
        ...(web
          ? {
              tools: [
                {
                  type: "web_search",
                  ...((options.allowedDomains || ["wisc.edu"]).length
                    ? {
                        filters: {
                          allowed_domains: options.allowedDomains || [
                            "wisc.edu",
                          ],
                        },
                      }
                    : {}),
                },
              ],
              tool_choice: "required",
              include: ["web_search_call.action.sources"],
            }
          : {}),
      }),
      signal: options.signal
        ? AbortSignal.any([options.signal, AbortSignal.timeout(timeoutMs)])
        : AbortSignal.timeout(timeoutMs),
    });
  } catch {
    options.signal?.throwIfAborted();
    throw new AppError(
      "AI_TIMEOUT",
      "The AI service did not finish in time. Your previous results are preserved.",
      504,
    );
  }
  if (!result.ok) {
    const errorBody = (await result.json().catch(() => null)) as {
      error?: { code?: string; type?: string };
    } | null;
    const providerCode = (
      errorBody?.error?.code ||
      errorBody?.error?.type ||
      "unknown"
    )
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .slice(0, 80);
    throw new AppError(
      result.status === 429 ? "AI_RATE_LIMIT" : "AI_PROVIDER",
      result.status === 429
        ? `The AI service reached its usage limit (${providerCode}). Try again later.`
        : `The AI service rejected this request (HTTP ${result.status}; ${providerCode}). Check the server API key and model access.`,
      502,
    );
  }
  const body = (await result.json()) as AIResponse;
  if (body.status !== "completed")
    throw new AppError(
      "AI_INCOMPLETE",
      "The AI response was incomplete. Please try again.",
      502,
    );
  const text = body.output
    .flatMap((item) => item.content || [])
    .filter((item) => item.type === "output_text")
    .map((item) => item.text || "")
    .join("\n");
  const sources = [
    ...new Set(
      body.output.flatMap((item) => [
        ...(item.action?.sources || []).map((s) => s.url),
        ...(item.content || []).flatMap((p) =>
          (p.annotations || []).flatMap((a) =>
            a.type === "url_citation" && a.url ? [a.url] : [],
          ),
        ),
      ]),
    ),
  ];
  if (!text)
    throw new AppError(
      "AI_EMPTY",
      "The AI service returned no usable answer.",
      502,
    );
  if (web && !body.output.some((item) => item.type === "web_search_call"))
    throw new AppError(
      "NO_SEARCH",
      "No web search was completed. Please retry.",
      502,
    );
  return { text, sources };
}
export async function structured<T>(
  name: string,
  schema: z.ZodType<T>,
  instructions: string,
  data: unknown,
  timeoutMs = 120000,
  signal?: AbortSignal,
  options: { maxOutputTokens?: number } = {},
): Promise<T> {
  const { text } = await response(
    instructions,
    JSON.stringify(data),
    {
      type: "json_schema",
      name,
      strict: true,
      schema: z.toJSONSchema(schema),
    },
    false,
    timeoutMs,
    { signal, ...options },
  );
  try {
    return schema.parse(JSON.parse(text));
  } catch {
    throw new AppError(
      "AI_SCHEMA",
      "The AI response could not be validated. No unverified result was saved.",
      502,
    );
  }
}
