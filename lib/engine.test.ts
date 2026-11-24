import { test } from "node:test";
import assert from "node:assert/strict";
import { actionAt, dropEcho, cloneMessages, cloneSystem, openingEvent, turnNote, unknownTopics, TOTAL_STEPS, type DateEvent } from "./engine.ts";

test("schedule: scene 1, director, scene 2 (B first), judge, done", () => {
  const kinds = Array.from({ length: TOTAL_STEPS + 1 }, (_, i) => {
    const a = actionAt(i);
    return a.kind === "turn" ? `${a.speaker}${a.scene}` : a.kind;
  });
  assert.deepEqual(kinds, ["a1", "b1", "a1", "b1", "a1", "b1", "director", "b2", "a2", "b2", "a2", "b2", "a2", "judge", "done"]);
});

test("each clone sees its own lines as assistant, and the conversation ends on the other side", () => {
  const events: DateEvent[] = [openingEvent("Maya", "Sam"), { speaker: "a", text: "hi!", scene: 1 }];
  const forB = cloneMessages(events, "b");
  assert.equal(forB[0].role, "user");
  assert.equal(forB.length, 1, "director + A's line merge into one user message");
  assert.match(String(forB[0].content), /\[Director\][\s\S]*\n\nhi!/);

  const forA = cloneMessages(events, "a");
  assert.deepEqual(
    forA.map((m) => m.role),
    ["user", "assistant", "user"],
  );
});

test("director events after a clone's own line still end on a user message", () => {
  const events: DateEvent[] = [
    openingEvent("Maya", "Sam"),
    { speaker: "a", text: "hi", scene: 1 },
    { speaker: "b", text: "hey", scene: 1 },
    { speaker: "director", text: "Scene 2: rain.", scene: 2 },
  ];
  const forB = cloneMessages(events, "b");
  assert.equal(forB[forB.length - 1].role, "user");
  assert.match(String(forB[forB.length - 1].content), /Scene 2: rain/);
});

test("cleanCloneLine keeps only the clone's own words (cases seen in evals)", async () => {
  const { cleanCloneLine } = await import("./engine.ts");
  // Wrote the director's line and another person's dialogue after its own.
  assert.equal(
    cleanCloneLine(
      "oh, i'm a physics phd student.\n\n[Director] A pregnant classmate, Sarah, walks up to their table, beaming.\nsarah: theo! hi! are you on a date?",
      "Theo",
      "Ana",
    ),
    "oh, i'm a physics phd student.",
  );
  // Stage directions in brackets or asterisks.
  assert.equal(
    cleanCloneLine("[Sam glances at the group and shakes his head a bit, but smiles.] nah, i'm good, thanks!", "Sam", "Maya"),
    "nah, i'm good, thanks!",
  );
  assert.equal(cleanCloneLine("*laughs* ok fair", "Sam", "Maya"), "ok fair");
  // Own name label and quotes.
  assert.equal(cleanCloneLine('Maya: "I don\'t smoke, actually."', "Maya", "Sam"), "I don't smoke, actually.");
  // Writing the other person's reply.
  assert.equal(cleanCloneLine("same honestly\nSam: lol ok", "Maya", "Sam"), "same honestly");
  // A colon inside an ordinary first line is fine.
  assert.equal(cleanCloneLine("honestly: i think the reg wins", "Maya", "Sam"), "honestly: i think the reg wins");
});

test("cleanCloneLine survives names with regex characters (security review M1)", async () => {
  const { cleanCloneLine } = await import("./engine.ts");
  assert.equal(cleanCloneLine("C++: hi there", "C++", "Jo)"), "hi there");
  const t = Date.now();
  cleanCloneLine("A".repeat(40) + "!", "(a*)*b", "x");
  assert.ok(Date.now() - t < 100, "no catastrophic backtracking");
});

test("a clone is told its stated facts, and never to make things up", () => {
  const profile = {
    summary: "s", looking_for: "l", values: [], dealbreakers: ["Must love dogs."], conflict_style: "c", money: "m",
    interests: [], opinions: [], voice: "v", sample_lines: [], facts: ["Doesn't drink coffee; prefers tea."],
  };
  const withFacts = cloneSystem({ name: "Lauren", profile }, "Leo");
  assert.match(withFacts, /Facts about them: Doesn't drink coffee; prefers tea\./);
  assert.match(withFacts, /The profile is everything you know about Lauren/);
  assert.match(withFacts, /ask me that one in person/);
  // Clones saved before facts existed still work.
  assert.match(cloneSystem({ name: "Lauren", profile: { ...profile, facts: undefined } }, "Leo"), /Facts about them: none stated/);
});

test("the first scene doesn't assume anyone drinks coffee", () => {
  assert.doesNotMatch(openingEvent("Lauren", "Leo").text, /for coffee/);
});

test("every turn reminds a clone what its profile is silent on", () => {
  const base = { summary: "Just graduated.", looking_for: "friends", values: [], conflict_style: "talks it out", money: "saves a lot", interests: [], opinions: [], voice: "v", sample_lines: [] };
  const lauren = { ...base, dealbreakers: ["Won't date a smoker."], facts: ["Doesn't drink coffee; prefers tea."] };
  const unknown = unknownTopics(lauren);
  assert.ok(unknown.some((u) => u.startsWith("pets")));
  assert.ok(!unknown.includes("whether they drink coffee or tea"));
  // Her own dealbreaker isn't an unknown topic: she can talk about smoking.
  assert.ok(!unknown.includes("whether they smoke or vape"));
  const note = turnNote({ name: "Lauren", profile: lauren });
  assert.match(note, /True about Lauren[^\]]*Doesn't drink coffee/);
  assert.match(note, /NOT in Lauren's profile:[^\]]*pets/);
  // Once they tap "I have a dog", it is no longer unknown.
  assert.ok(!unknownTopics({ ...lauren, facts: ["Has a dog and loves dogs."] }).some((u) => u.startsWith("pets")));
});

test("a clone that repeats the line it just heard keeps only its own answer (seen in evals)", () => {
  const heard = "lol fair, but that's a bit of a dealbreaker for me. what do you usually do on those trips?";
  assert.equal(dropEcho(`${heard}\n\non those trips, it's usually street food.`, heard), "on those trips, it's usually street food.");
  assert.equal(dropEcho("lol fair", "lol fair"), "lol fair", "short lines can honestly match");
  assert.equal(dropEcho("hi", undefined), "hi");
});
