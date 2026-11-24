import "server-only";
import { str } from "./api";
import { cleanFacts, MAX_ANSWER, MAX_FOLLOW_UPS, MIN_ANSWER, QUESTIONS, type FactChoices } from "./questions";

// Reads and checks what the interview form sends. Both interview routes use it, so the
// follow-up interviewer and the clone builder see exactly the same, validated answers.

export type InterviewInput = {
  name: string;
  year: string;
  bio: string;
  contact: string;
  core: string[];
  facts: FactChoices;
  followUps: { question: string; answer: string }[];
};

export function readInterview(body: Record<string, unknown>): InterviewInput | { error: string } {
  const name = str(body.name, 40);
  if (!name) return { error: "Add your first name." };
  // Names go into prompts and regexes: letters (any language), spaces, ' - . only.
  if (!/^[\p{L}][\p{L} '.-]*$/u.test(name)) return { error: "Use letters only in your name." };

  const raw = Array.isArray(body.answers) ? body.answers : [];
  if (raw.length !== QUESTIONS.length) return { error: "Answer every question." };
  const core = QUESTIONS.map((_, i) => str(raw[i], MAX_ANSWER));
  if (core.some((a) => a.length < MIN_ANSWER)) return { error: "One of the questions still needs an answer." };

  // Follow-ups are optional: keep the ones they answered.
  const followUps = (Array.isArray(body.followUps) ? body.followUps : [])
    .slice(0, MAX_FOLLOW_UPS)
    .map((f) => {
      const o = (f && typeof f === "object" ? f : {}) as Record<string, unknown>;
      return { question: str(o.question, 240), answer: str(o.answer, MAX_ANSWER) };
    })
    .filter((f) => f.question && f.answer.length >= MIN_ANSWER);

  return { name, year: str(body.year, 60), bio: str(body.bio, 160), contact: str(body.contact, 120), core, facts: cleanFacts(body.facts), followUps };
}
