import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { makeClient } from "./engine";

let client: Anthropic | undefined;

/** Claude via ANTHROPIC_API_KEY or AI_GATEWAY_API_KEY (see lib/engine.ts). Never sent to the browser. */
export function claude(): Anthropic {
  client ??= makeClient({ timeout: 90_000, maxRetries: 2 });
  return client;
}
