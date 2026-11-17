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
