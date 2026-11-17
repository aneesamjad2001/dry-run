import "server-only";
import { AISDKError, APICallError, RetryError } from "ai";
import { EngineError, RateLimitedError } from "./engine";
import { UserError } from "./data";

/** Turns any thrown error into a JSON response the UI can show, without leaking internals. */
export function errorResponse(err: unknown): Response {
  if (err instanceof UserError) return Response.json({ error: err.message }, { status: err.status });
  // Every model is busy (free-tier rate limits). The UI waits retryAfter seconds and carries on.
  if (err instanceof RateLimitedError) return Response.json({ error: err.message, retryAfter: 15 }, { status: 429 });
  if (err instanceof EngineError) return Response.json({ error: err.message, retry: true }, { status: 502 });
  const cause = RetryError.isInstance(err) ? err.lastError : err;
  if (APICallError.isInstance(cause) && cause.statusCode === 429) {
    return Response.json({ error: "The clones are busy. Try again in a minute.", retry: true }, { status: 429 });
  }
  if (AISDKError.isInstance(err)) {
    console.error("Model call failed:", err.name, err.message);
    return Response.json({ error: "The clones lost their train of thought. Try again.", retry: true }, { status: 502 });
  }
  console.error(err);
  return Response.json({ error: "Something went wrong on our side." }, { status: 500 });
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}
