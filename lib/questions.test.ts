import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanFacts, factLines, packAnswers, QUESTIONS, unpackAnswers } from "./questions.ts";

test("quick facts: only real options survive, and each becomes one sentence", () => {
  const facts = cleanFacts({ smoking: "Never", food: "Vegetarian", pets: "a dragon", made_up: "x", coffee: 3 });
  assert.deepEqual(facts, { smoking: "Never", food: "Vegetarian" });
  assert.deepEqual(factLines(facts), ["Doesn't smoke or vape.", "Is vegetarian: no meat or fish."]);
  assert.deepEqual(cleanFacts(null), {});
});

test("the interview round-trips through storage", () => {
  const core = QUESTIONS.map((_, i) => `answer ${i}`);
  const stored = packAnswers(core, [{ question: "Where is the line on dogs?", answer: "liking them is enough" }], { pets: "Allergic" });
  assert.equal(stored.length, QUESTIONS.length + 2);
  assert.deepEqual(unpackAnswers(stored), { core, facts: { pets: "Allergic" } });
});

test("interviews saved before facts existed still load", () => {
  const legacy = QUESTIONS.map((q, i) => ({ question: q.q, answer: `old ${i}` }));
  assert.deepEqual(unpackAnswers(legacy), { core: legacy.map((a) => a.answer), facts: {} });
  assert.deepEqual(unpackAnswers([]).core, QUESTIONS.map(() => ""));
});
