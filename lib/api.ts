import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { EngineError } from "./engine";
import { UserError } from "./data";

/** Turns any thrown error into a JSON response the UI can show, without leaking internals. */
export function errorResponse(err: unknown): Response {
  if (err instanceof UserError) return Response.json({ error: err.message }, { status: err.status });
  if (err instanceof EngineError) return Response.json({ error: err.message, retry: true }, { status: 502 });
  if (err instanceof Anthropic.RateLimitError) return Response.json({ error: "The clones are busy. Try again in a minute.", retry: true }, { status: 429 });
  if (err instanceof Anthropic.APIError) {
    console.error("Claude API error", err.status, err.message);
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
