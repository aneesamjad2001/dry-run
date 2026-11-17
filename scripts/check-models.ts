// Quick check that the configured models work through AI Gateway before a full eval:
// one in-character line from the clone model, one structured object from the smart
// model. A few model calls in total.
//
//   npm run check
//   DRYRUN_CLONE_MODEL=openai/gpt-5-nano npm run check     (try another model)

import { generateText, Output } from "ai";
import { z } from "zod";
import { CLONE_MODELS, SMART_MODELS } from "../lib/engine.ts";

async function check(label: string, fn: () => Promise<string>) {
  const t = Date.now();
  try {
    const out = await fn();
    console.log(`✓ ${label} (${((Date.now() - t) / 1000).toFixed(1)}s)\n    ${out}`);
    return true;
  } catch (err) {
    const e = err as Error & { statusCode?: number; lastError?: { statusCode?: number; message?: string } };
    console.log(`✗ ${label}\n    ${e.name}: ${e.lastError?.message ?? e.message}`);
    return false;
  }
}

console.log(`clone models: ${CLONE_MODELS.join(", ")}\nsmart models: ${SMART_MODELS.join(", ")}\n`);

let ok = true;
for (const model of CLONE_MODELS) {
  ok = (await check(`${model} replies in character`, async () => {
  const r = await generateText({
    model,
    instructions: "You are Maya on a first date over coffee. She won't date a smoker. Reply in 1-2 short sentences, in character.",
    prompt: "Sam: honestly my favourite part of a shift is the smoke break after. you smoke?",
  });
  return r.text.trim();
  })) && ok;
}

for (const model of SMART_MODELS) {
  ok = (await check(`${model} returns structured output`, async () => {
  const r = await generateText({
    model,
    output: Output.object({ schema: z.object({ clash: z.string(), starters: z.array(z.string()) }) }),
    prompt: "Maya won't date a smoker. Sam smokes after every shift and isn't quitting. Name the clash and give 2 conversation starters.",
  });
  return JSON.stringify(r.output);
  })) && ok;
}

process.exit(ok ? 0 : 1);
