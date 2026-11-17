import "server-only";
import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | undefined;

/** Reads ANTHROPIC_API_KEY from the environment. Never sent to the browser. */
export function claude(): Anthropic {
  client ??= new Anthropic({ timeout: 90_000, maxRetries: 2 });
  return client;
}
