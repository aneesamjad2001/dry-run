// The clone interview has three parts:
//   1. Quick facts: taps, not typing. The plain things a date would ask about (smoking,
//      food, pets…), so a clone never has to guess them and can answer the other
//      person's dealbreakers honestly.
//   2. Questions in your own words. Each one targets something the clone needs to hold
//      its ground on a date.
//   3. Up to three follow-ups written for THIS person (lib/engine.ts followUps), aimed at
//      whatever their answers left vague.
// This file has no imports, so the browser, the server and scripts/eval.ts can all use it.

export const QUESTIONS: { q: string; hint: string }[] = [
  { q: "Describe a perfect Saturday in Chicago.", hint: "Where you'd go, who with, what time you'd wake up." },
  { q: "What are you looking for right now?", hint: "Something serious, casual, not sure? Anything specific?" },
  { q: "What would you never compromise on in a partner?", hint: "Your real dealbreakers. Be specific: “won't date a smoker” beats “honesty”." },
  { q: "How do you handle money?", hint: "Saver or spender? Would you go on a $300 weekend trip with friends?" },
  { q: "When you disagree with someone you care about, what do you actually do?", hint: "Go quiet, argue it out, joke, let it go?" },
  { q: "What's an opinion you hold that most people around you don't?", hint: "Anything: food, politics, campus, life." },
  { q: "Where do you see yourself after graduation?", hint: "City, job, grad school, kids someday or not." },
  { q: "Write a text to a friend the way you'd actually send it.", hint: "Your clone copies how you write: punctuation, emoji, slang." },
];

export const MIN_ANSWER = 3;
export const MAX_ANSWER = 800;
export const MAX_FOLLOW_UPS = 3;

/** One tap each. `line` is the sentence the clone gets, written about the person. */
export const FACTS: { id: string; q: string; options: { label: string; line: string }[] }[] = [
  {
    id: "smoking",
    q: "Do you smoke or vape?",
    options: [
      { label: "Never", line: "Doesn't smoke or vape." },
      { label: "Sometimes", line: "Smokes or vapes sometimes, socially." },
      { label: "Yes", line: "Smokes or vapes regularly." },
    ],
  },
  {
    id: "drinking",
    q: "Do you drink?",
    options: [
      { label: "No", line: "Doesn't drink alcohol." },
      { label: "Socially", line: "Drinks socially." },
      { label: "Yes", line: "Drinks regularly and enjoys it." },
    ],
  },
  {
    id: "food",
    q: "How do you eat?",
    options: [
      { label: "Everything", line: "Eats everything, meat included." },
      { label: "Vegetarian", line: "Is vegetarian: no meat or fish." },
      { label: "Vegan", line: "Is vegan: no animal products." },
      { label: "Halal", line: "Eats halal." },
      { label: "Kosher", line: "Keeps kosher." },
    ],
  },
  {
    id: "coffee",
    q: "Coffee?",
    options: [
      { label: "Love it", line: "Drinks coffee and loves it." },
      { label: "Tea person", line: "Doesn't drink coffee; prefers tea." },
      { label: "Neither", line: "Doesn't drink coffee or tea." },
    ],
  },
  {
    id: "pets",
    q: "Pets?",
    options: [
      { label: "I have a dog", line: "Has a dog and loves dogs." },
      { label: "I have a cat", line: "Has a cat and loves cats." },
      { label: "Love them, none yet", line: "Loves animals but doesn't have a pet right now." },
      { label: "Not a pet person", line: "Is not a pet person and doesn't want one." },
      { label: "Allergic", line: "Is allergic to pets, so can't live with one." },
    ],
  },
  {
    id: "kids",
    q: "Kids someday?",
    options: [
      { label: "Yes", line: "Wants kids someday." },
      { label: "No", line: "Doesn't want kids." },
      { label: "Not sure", line: "Isn't sure yet about having kids." },
    ],
  },
  {
    id: "faith",
    q: "Is faith part of your life?",
    options: [
      { label: "Yes, a big part", line: "Faith is a big part of their life." },
      { label: "A little", line: "Faith is a small part of their life." },
      { label: "Not really", line: "Isn't religious." },
    ],
  },
  {
    id: "weekend",
    q: "Friday night?",
    options: [
      { label: "Out", line: "Likes going out on a Friday night." },
      { label: "In", line: "Likes staying in on a Friday night." },
      { label: "Depends", line: "Sometimes goes out on a Friday, sometimes stays in." },
    ],
  },
];

export type FactChoices = Record<string, string>; // fact id -> option label

/** Keeps only real fact ids with real option labels. Anything else is dropped. */
export function cleanFacts(raw: unknown): FactChoices {
  const out: FactChoices = {};
  if (!raw || typeof raw !== "object") return out;
  for (const f of FACTS) {
    const v = (raw as Record<string, unknown>)[f.id];
    if (typeof v === "string" && f.options.some((o) => o.label === v)) out[f.id] = v;
  }
  return out;
}

/** The sentences a clone gets for the facts this person tapped. */
export function factLines(choices: FactChoices): string[] {
  return FACTS.flatMap((f) => {
    const o = f.options.find((x) => x.label === choices[f.id]);
    return o ? [o.line] : [];
  });
}

// How the whole interview is stored in profiles.answers (one jsonb array, no schema
// change): the typed questions as "q0".."q7", follow-ups as "f0".., taps as "fact:<id>".
export type StoredAnswer = { id?: string; question: string; answer: string };

export function packAnswers(core: string[], followUps: { question: string; answer: string }[], facts: FactChoices): StoredAnswer[] {
  return [
    ...QUESTIONS.map((q, i) => ({ id: `q${i}`, question: q.q, answer: core[i] ?? "" })),
    ...followUps.map((f, i) => ({ id: `f${i}`, question: f.question, answer: f.answer })),
    ...FACTS.filter((f) => facts[f.id]).map((f) => ({ id: `fact:${f.id}`, question: f.q, answer: facts[f.id] })),
  ];
}

export function unpackAnswers(stored: StoredAnswer[]): { core: string[]; facts: FactChoices } {
  const legacy = stored.every((a) => !a.id); // saved before ids existed: the 8 questions, in order
  const core = QUESTIONS.map((_, i) => (legacy ? stored[i]?.answer : stored.find((a) => a.id === `q${i}`)?.answer) ?? "");
  const facts = cleanFacts(Object.fromEntries(stored.filter((a) => a.id?.startsWith("fact:")).map((a) => [a.id!.slice(5), a.answer])));
  return { core, facts };
}
