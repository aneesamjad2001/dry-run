import { test } from "node:test";
import assert from "node:assert/strict";
import { actionAt, cloneMessages, openingEvent, TOTAL_STEPS, type DateEvent } from "./engine.ts";

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
