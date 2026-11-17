// Runs clone dates on the test pairs and scores the proposal's two AI targets:
//   Mismatch detection  - the report names the planted clash      (target 80%)
//   Honest disagreement - both clones held their positions (judge) (target 70%)
//
//   npm run eval                 all pairs
//   npm run eval -- smoking kids only these pair ids
//
// Each pair is about 15 model calls. Transcripts and reports go to scripts/out/.

import { generateText, Output } from "ai";
import { z } from "zod";
import { mkdirSync, writeFileSync } from "node:fs";
import { actionAt, isRateLimited, openingEvent, runStep, CLONE_MODELS, SMART_MODELS, RateLimitedError, type DateEvent, type Report } from "../lib/engine.ts";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Free-tier models allow 5 requests a minute each: when all are busy, wait and retry. */
async function patiently<T>(fn: () => Promise<T>): Promise<T> {
  for (let tries = 0; ; tries++) {
    try {
      return await fn();
    } catch (err) {
      if (tries >= 8 || !(err instanceof RateLimitedError || isRateLimited(err))) throw err;
      await sleep(20_000);
    }
  }
}
import { PAIRS, type Pair } from "./pairs.ts";

const GradeSchema = z.object({ named: z.boolean(), why: z.string() });

async function grade(report: Report, clash: string): Promise<{ named: boolean; why: string }> {
  const res = await patiently(() => generateText({
    model: SMART_MODELS[SMART_MODELS.length - 1],
    maxRetries: 0,
    output: Output.object({ schema: GradeSchema }),
    prompt: `A date report lists these clashes:\n${report.clashes.map((c) => `- ${c.point} (${c.evidence})`).join("\n")}\n\nThe planted clash was: ${clash}\n\nDoes the report clearly name the planted clash (same underlying issue, not just a vague nod)? Answer named=true or false.`,
  }));
  return res.output;
}

async function runPair(pair: Pair) {
  const started = Date.now();
  const events: DateEvent[] = [openingEvent(pair.a.name, pair.b.name)];
  let report: Report | undefined;
  let target: string | undefined;
  for (let step = 0; actionAt(step).kind !== "done"; step++) {
    const r = await patiently(() => runStep(step, events, pair.a, pair.b));
    if (r.event) events.push(r.event);
    if (r.report) report = r.report;
    if (r.directorTarget) target = r.directorTarget;
  }
  const g = await grade(report!, pair.clash);
  return { id: pair.id, clash: pair.clash, directorTarget: target, events, report: report!, named: g.named, why: g.why, seconds: Math.round((Date.now() - started) / 1000) };
}

const only = process.argv.slice(2);
const pairs = only.length ? PAIRS.filter((p) => only.includes(p.id)) : PAIRS;
if (!pairs.length) {
  console.error(`No pairs match. Ids: ${PAIRS.map((p) => p.id).join(", ")}`);
  process.exit(1);
}

console.log(`Running ${pairs.length} clone date(s) with clones=${CLONE_MODELS.join(", ")} · director/judge=${SMART_MODELS.join(", ")}\n`);
const results = [];
// One pair at a time by default: free-tier rate limits are low. EVAL_CONCURRENCY=3 to go faster.
const PARALLEL = Math.max(1, Number(process.env.EVAL_CONCURRENCY) || 1);
for (let i = 0; i < pairs.length; i += PARALLEL) {
  const batch = await Promise.allSettled(pairs.slice(i, i + PARALLEL).map(runPair));
  for (const [j, r] of batch.entries()) {
    const id = pairs[i + j].id;
    if (r.status === "rejected") {
      console.log(`✗ ${id.padEnd(12)} ERROR ${r.reason?.message ?? r.reason}`);
      continue;
    }
    results.push(r.value);
    const v = r.value;
    console.log(`${v.named ? "✓" : "✗"} ${id.padEnd(12)} clash named: ${v.named ? "yes" : "no "}  held positions: ${v.report.held_positions ? "yes" : "no "}  ${v.seconds}s`);
    if (!v.named) console.log(`    ${v.why}`);
  }
}

const n = results.length;
const pct = (k: number) => (n ? Math.round((100 * k) / n) : 0);
const named = results.filter((r) => r.named).length;
const held = results.filter((r) => r.report.held_positions).length;
console.log(`\nMismatch detection:  ${named}/${n} = ${pct(named)}%  (target 80%)`);
console.log(`Honest disagreement: ${held}/${n} = ${pct(held)}%  (target 70%)`);
if (n < pairs.length) console.log(`Errors: ${pairs.length - n}`);

mkdirSync("scripts/out", { recursive: true });
const file = `scripts/out/eval-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
writeFileSync(file, JSON.stringify(results, null, 2));
console.log(`\nTranscripts and reports: ${file}`);
