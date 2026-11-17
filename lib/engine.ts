// The clone date engine: two clones, a director, and a judge.
//
// A date is a fixed schedule of steps. Each step is ONE model call, so the browser can
// ask for the next step, show it, and ask again (that is the live view), and no request
// runs long enough to hit a timeout. The same functions run from scripts/eval.ts, so
// this file must not import anything Next-specific or "server-only".
//
// Privacy rules the prompts enforce:
// - Each clone is a separate call that sees only its OWN private profile.
// - The director sees both profiles but writes only a neutral situation, never a detail
//   from either profile.
// - The judge sees only the transcript (what both people can watch anyway), so the
//   report cannot leak anyone's private profile.

import { generateText, NoObjectGeneratedError, Output, type ModelMessage } from "ai";
import { z } from "zod";

// All model calls go through Vercel AI Gateway with the AI SDK, so any model in the
// Gateway catalog works. Auth: AI_GATEWAY_API_KEY locally; on Vercel, the deployment's
// OIDC token. Pick models in .env.local without touching code (comma-separated lists):
//   DRYRUN_CLONE_MODEL  many short in-character turns: fast and cheap
//   DRYRUN_SMART_MODEL  building the clone, the director and the judge: needs judgment
//
// Why lists: on the Gateway's free tier each model allows only 5 requests a minute, and a
// dry run is 12 clone turns. Each model has its own limit, so the calls rotate through
// the list, and a rate-limited model hands the turn to the next one. Defaults are
// free-tier models whose providers don't train on prompts.
function modelList(v: string | undefined, fallback: string[]): string[] {
  const list = (v ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return list.length ? list : fallback;
}
export const CLONE_MODELS = modelList(process.env.DRYRUN_CLONE_MODEL, ["openai/gpt-4.1-mini", "openai/gpt-4o-mini", "google/gemini-2.5-flash-lite"]);
export const SMART_MODELS = modelList(process.env.DRYRUN_SMART_MODEL, ["openai/gpt-5-mini", "google/gemini-2.5-flash"]);
export const CLONE_MODEL = CLONE_MODELS[0];
export const SMART_MODEL = SMART_MODELS[0];

// No SDK-level retries: on a rate limit the SDK would wait out a 60s retry-after.
// Moving to the next model is faster; see withModels().
const REQUEST = { maxRetries: 0, timeout: 60_000 } as const;

export const CloneProfileSchema = z.object({
  summary: z.string().describe("Two or three sentences: who this person is, in plain words."),
  looking_for: z.string().describe("What they want right now: serious, casual, unsure, and any detail."),
  values: z.array(z.string()).describe("3-5 things they care about most."),
  dealbreakers: z.array(z.string()).describe("1-4 things they would not accept in a partner. Specific, not generic."),
  conflict_style: z.string().describe("What they actually do when they disagree with someone they care about."),
  money: z.string().describe("How they handle money, with any example they gave."),
  interests: z.array(z.string()).describe("Concrete interests and ways they spend time."),
  opinions: z.array(z.string()).describe("Opinions they hold firmly, especially unpopular ones."),
  voice: z.string().describe("How they text: length, punctuation, slang, humour, emoji or not."),
  sample_lines: z.array(z.string()).describe("2-4 short lines written the way they actually text."),
});
export type CloneProfile = z.infer<typeof CloneProfileSchema>;

export type Person = { name: string; profile: CloneProfile };

export type Speaker = "a" | "b" | "director";
export type DateEvent = { speaker: Speaker; text: string; scene: 1 | 2 };

export const ReportSchema = z.object({
  aligned: z
    .array(z.object({ point: z.string(), evidence: z.string().describe("A short quote from the date, as Name: \"words\".") }))
    .describe("2-4 places they genuinely lined up."),
  clashes: z
    .array(z.object({ point: z.string(), evidence: z.string().describe("A short quote from the date, as Name: \"words\".") }))
    .describe("1-3 places they would clash. Never empty: name the biggest difference even if it is small."),
  starters: z.array(z.string()).describe("Exactly 3 specific conversation starters for a real first date, built on what came up."),
  held_positions: z
    .boolean()
    .describe("True if, in scene 2, BOTH clones kept their own position instead of caving to agree."),
  summary: z.string().describe("One sentence on what this date showed, without predicting chemistry."),
});
export type Report = z.infer<typeof ReportSchema>;

const DirectorSchema = z.object({
  target: z.string().describe("Private note: which difference between them this scene is meant to test."),
  event: z.string().describe("The situation, 1-3 sentences, addressed to both of them, ending in a decision or question they each have to answer."),
});

// ---------------------------------------------------------------------------
// The schedule

export const SCENE_TURNS = 6; // messages per scene, alternating speakers

export type Action =
  | { kind: "turn"; speaker: "a" | "b"; scene: 1 | 2 }
  | { kind: "director" }
  | { kind: "judge" }
  | { kind: "done" };

/** What happens at a given step. Step 0 is the first clone message. */
export function actionAt(step: number): Action {
  if (step < SCENE_TURNS) return { kind: "turn", speaker: step % 2 === 0 ? "a" : "b", scene: 1 };
  if (step === SCENE_TURNS) return { kind: "director" };
  const s2 = step - SCENE_TURNS - 1;
  // Scene 2 starts with B, so A doesn't always lead.
  if (s2 < SCENE_TURNS) return { kind: "turn", speaker: s2 % 2 === 0 ? "b" : "a", scene: 2 };
  if (s2 === SCENE_TURNS) return { kind: "judge" };
  return { kind: "done" };
}

export const TOTAL_STEPS = SCENE_TURNS * 2 + 2;

export function openingEvent(a: string, b: string): DateEvent {
  return {
    speaker: "director",
    scene: 1,
    text: `Scene 1: ${a} and ${b} have just sat down for coffee at Plein Air on 57th Street. It's their first date. ${a} speaks first.`,
  };
}

// ---------------------------------------------------------------------------
// Prompts

function profileBlock(p: CloneProfile): string {
  return [
    `Summary: ${p.summary}`,
    `Looking for: ${p.looking_for}`,
    `Values: ${p.values.join("; ")}`,
    `Dealbreakers: ${p.dealbreakers.join("; ")}`,
    `When they disagree: ${p.conflict_style}`,
    `Money: ${p.money}`,
    `Interests: ${p.interests.join("; ")}`,
    `Firm opinions: ${p.opinions.join("; ")}`,
    `Texting voice: ${p.voice}`,
    `Lines in their voice: ${p.sample_lines.map((l) => `"${l}"`).join(" ")}`,
  ].join("\n");
}

export function cloneSystem(self: Person, other: string): string {
  return `You are playing ${self.name} on a first date with ${other}. You are a stand-in built from ${self.name}'s own interview answers, so the two of them can see how a first date might go before they meet. Speak exactly as ${self.name} would.

Who ${self.name} is (private; never quote this list or say it exists):
<profile>
${profileBlock(self.profile)}
</profile>

How to play it:
- Talk like a real person texting on a first date: 1-3 short sentences, under 40 words, in ${self.name}'s voice. No stage directions, no narration, no name labels.
- Hold ${self.name}'s real positions. When ${other} says something that conflicts with ${self.name}'s values, money habits or dealbreakers, say so plainly and kindly, the way ${self.name} actually would. Do not agree just to be pleasant, and only change your mind if you are genuinely persuaded.
- When a dealbreaker becomes relevant, let it show honestly; don't hide it to keep things smooth.
- Don't invent big facts that the profile doesn't support. Small everyday details are fine.
- Ask questions too, but don't interview them.
- Never say you are an AI, a clone, or a stand-in.
- Lines that start with [Director] describe what is happening. React to them in character.
- Write ONLY ${self.name}'s next message, as plain text. Never write lines for ${other}, the director, or anyone else, and never describe actions in brackets or asterisks.`;
}

/** The transcript from one clone's point of view: its own lines are the assistant's. */
export function cloneMessages(events: DateEvent[], self: "a" | "b"): ModelMessage[] {
  const out: { role: "user" | "assistant"; content: string }[] = [];
  for (const e of events) {
    const role = e.speaker === self ? "assistant" : "user";
    const text = e.speaker === "director" ? `[Director] ${e.text}` : e.text;
    const last = out[out.length - 1];
    if (last && last.role === role) {
      last.content += `\n\n${text}`;
    } else {
      out.push({ role, content: text });
    }
  }
  // The API needs the conversation to start with the user and end with the user.
  if (out[0]?.role !== "user") out.unshift({ role: "user", content: "[Director] The date begins." });
  if (out[out.length - 1].role !== "user") out.push({ role: "user", content: "[Director] Keep going." });
  return out;
}

function transcriptText(events: DateEvent[], a: string, b: string): string {
  return events
    .map((e) => {
      const who = e.speaker === "a" ? a : e.speaker === "b" ? b : "[Director]";
      return `${who}: ${e.text}`;
    })
    .join("\n");
}

// ---------------------------------------------------------------------------
// Model calls

export type StepResult = { event?: DateEvent; report?: Report; directorTarget?: string };

export class EngineError extends Error {}

/** Every model in the list is rate-limited right now. The caller should wait and retry. */
export class RateLimitedError extends EngineError {
  constructor() {
    super("Lots of people are on dry runs right now. Picking up again in a few seconds…");
  }
}

/** True for a 429 / rate-limit error, including when the SDK wraps it. */
export function isRateLimited(err: unknown): boolean {
  for (let e = err as { name?: string; statusCode?: number; lastError?: unknown; cause?: unknown } | undefined, i = 0; e && i < 4; i++) {
    if (e.statusCode === 429 || /RateLimit/i.test(e.name ?? "")) return true;
    e = (e.lastError ?? e.cause) as typeof e;
  }
  return false;
}

let rotation = 0;

/** Tries each model in turn, starting at the next one in the rotation; moves on only on rate limits. */
async function withModels<T>(models: string[], fn: (model: string) => Promise<T>): Promise<T> {
  const start = rotation++;
  for (let k = 0; k < models.length; k++) {
    try {
      return await fn(models[(start + k) % models.length]);
    } catch (err) {
      if (!isRateLimited(err)) throw err;
    }
  }
  throw new RateLimitedError();
}

/** One structured call: the model must return JSON matching the schema. */
async function structured<T>(schema: z.ZodType<T>, models: string[], instructions: string, prompt: string, failure: string): Promise<T> {
  try {
    return await withModels(models, async (model) => {
      const res = await generateText({ ...REQUEST, model, instructions, prompt, reasoning: "medium", output: Output.object({ schema }) });
      return res.output;
    });
  } catch (err) {
    if (NoObjectGeneratedError.isInstance(err)) throw new EngineError(failure);
    throw err;
  }
}

async function cloneTurn(events: DateEvent[], a: Person, b: Person, speaker: "a" | "b", scene: 1 | 2): Promise<DateEvent> {
  const self = speaker === "a" ? a : b;
  const other = speaker === "a" ? b : a;
  const res = await withModels(CLONE_MODELS, (model) =>
    generateText({
      ...REQUEST,
      model,
      // Short in-character replies don't need deep thinking; low keeps turns fast.
      reasoning: "low",
      maxOutputTokens: 2000,
      instructions: cloneSystem(self, other.name),
      messages: cloneMessages(events, speaker),
    }),
  );
  if (res.finishReason === "content-filter") throw new EngineError(`${self.name}'s clone declined to answer.`);
  const text = cleanCloneLine(res.text, self.name, other.name);
  if (!text) throw new EngineError(`${self.name}'s clone said nothing.`);
  return { speaker, text, scene };
}

/**
 * Smaller models sometimes go beyond their own line: they add a "Name:" label, stage
 * directions like "[glances away]" or "*laughs*", wrap the line in quotes, or carry on and
 * write the director's or other people's lines. Keep only this clone's own words.
 */
export function cleanCloneLine(raw: string, self: string, other: string): string {
  let t = raw.trim();
  // Drop a leading "Name:" label for this clone, and a leading director line if it echoed one.
  t = t.replace(new RegExp(`^\\s*\\*{0,2}${self}\\*{0,2}:\\s*`, "i"), "");
  t = t.replace(/^\s*\[director\][^\n]*\n*/i, "");
  // Stop where it starts writing someone else: a later line that is a director line or a
  // "Name:" label (the other person, or anyone it invented).
  const stop = t.search(new RegExp(`\\n\\s*(\\[director\\]|\\*{0,2}(${other}|[A-Za-z]+)\\*{0,2}:\\s)`, "i"));
  if (stop > 0) t = t.slice(0, stop);
  t = t.replace(/\[[^\]]{0,200}\]/g, "").replace(/(^|\s)\*[^*\n]{1,120}\*(?=\s|$)/g, "$1");
  t = t.replace(/^"([\s\S]*)"$/, "$1");
  return t.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

const DIRECTOR_INSTRUCTIONS = `You direct scene 2 of a first date between two people's stand-ins. Scene 1 was small talk. Your job is to add friction: write a concrete situation that makes them each take a position on the most important real difference between them.

Rules:
- Read both private profiles and pick the difference most likely to matter in a relationship (a dealbreaker, money, plans, values, how they handle conflict). If they truly align on everything, pick the subtlest difference.
- Write the situation in 1-2 sentences, as something that happens to both of them, set in Chicago or at UChicago, ending with ONE short neutral question to both, such as "What do you each do?".
- Only describe what happens. Never script their answers, say how either might feel or react, or offer options like "do you end the date?".
- NEVER mention or hint at a detail from either private profile. The situation must be neutral: it should not reveal what either person said in their interview.
- Do not take sides.`;

async function director(events: DateEvent[], a: Person, b: Person): Promise<StepResult> {
  const out = await structured(
    DirectorSchema,
    SMART_MODELS,
    DIRECTOR_INSTRUCTIONS,
    `<person_a name="${a.name}">\n${profileBlock(a.profile)}\n</person_a>\n\n<person_b name="${b.name}">\n${profileBlock(b.profile)}\n</person_b>\n\n<scene_1>\n${transcriptText(events, a.name, b.name)}\n</scene_1>\n\nWrite scene 2. ${b.name} will respond first.`,
    "The director couldn't set up scene 2.",
  );
  return { event: { speaker: "director", scene: 2, text: `Scene 2: ${out.event}` }, directorTarget: out.target };
}

const JUDGE_INSTRUCTIONS = `You write the report after a first date between two people's stand-ins. Both real people will read it, then decide whether to meet. It must give them a reason to meet, not a verdict.

Rules:
- Base everything on the transcript. Quote or point to real moments as evidence.
- Be honest about clashes. If one of them pushed back or a dealbreaker came up, name it plainly. Do not soften a real conflict into "different perspectives".
- Never give a score, a percentage, or a prediction about chemistry or attraction. Stand-ins can't predict that.
- Conversation starters must be specific to what came up, not generic ("what's your favourite food?" or "what are your hobbies?"). At least one must help them talk about their biggest clash openly and kindly.
- Write in plain words, addressed to both of them by name.`;

export async function judge(events: DateEvent[], aName: string, bName: string): Promise<Report> {
  return structured(
    ReportSchema,
    SMART_MODELS,
    JUDGE_INSTRUCTIONS,
    `<transcript>\n${transcriptText(events, aName, bName)}\n</transcript>`,
    "The judge couldn't write the report.",
  );
}

/** Runs the model call for one step. The caller saves the result and advances the step. */
export async function runStep(step: number, events: DateEvent[], a: Person, b: Person): Promise<StepResult> {
  const action = actionAt(step);
  switch (action.kind) {
    case "turn":
      return { event: await cloneTurn(events, a, b, action.speaker, action.scene) };
    case "director":
      return director(events, a, b);
    case "judge":
      return { report: await judge(events, a.name, b.name) };
    case "done":
      throw new EngineError("This date is already over.");
  }
}

// ---------------------------------------------------------------------------
// Building a clone from interview answers

const PROFILE_INSTRUCTIONS = `You turn a UChicago student's interview answers into a private profile for their stand-in on a first date. The stand-in must hold this person's real positions, so be specific and faithful:
- Use their own words and examples where you can.
- Dealbreakers and firm opinions matter most: keep them concrete ("won't date a smoker"), not generic ("values honesty").
- If they didn't say something, don't invent it. Keep that field short or say "not stated".
- The voice and sample lines should copy how they actually wrote their answers.`;

export async function buildProfile(name: string, answers: { question: string; answer: string }[]): Promise<CloneProfile> {
  return structured(
    CloneProfileSchema,
    SMART_MODELS,
    PROFILE_INSTRUCTIONS,
    `Name: ${name}\n\n${answers.map((qa) => `<qa>\nQ: ${qa.question}\nA: ${qa.answer}\n</qa>`).join("\n")}`,
    "Couldn't build your clone from those answers. Try again.",
  );
}
