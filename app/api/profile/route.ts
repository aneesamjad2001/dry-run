import { buildProfile } from "@/lib/engine";
import { DAILY_BUILD_LIMIT, deleteProfile, saveProfile, takeQuota } from "@/lib/data";
import { apiViewer } from "@/lib/viewer";
import { errorResponse, readJson, str } from "@/lib/api";
import { MAX_ANSWER, MIN_ANSWER, QUESTIONS } from "@/lib/questions";

export const maxDuration = 120;

// Build (or rebuild) my clone from the interview, and return it so I can check it.
export async function POST(req: Request) {
  const v = await apiViewer({ needProfile: false });
  if (v instanceof Response) return v;
  const body = await readJson(req);

  const name = str(body.name, 40);
  const year = str(body.year, 60);
  const bio = str(body.bio, 160);
  const contact = str(body.contact, 120);
  const raw = Array.isArray(body.answers) ? body.answers : [];
  if (!name) return Response.json({ error: "Add your first name." }, { status: 400 });
  // Names go into prompts and regexes: letters (any language), spaces, ' - . only.
  if (!/^[\p{L}][\p{L} '.-]*$/u.test(name)) return Response.json({ error: "Use letters only in your name." }, { status: 400 });
  if (raw.length !== QUESTIONS.length) return Response.json({ error: "Answer every question." }, { status: 400 });
  const answers = QUESTIONS.map((q, i) => ({ question: q.q, answer: str(raw[i], MAX_ANSWER) }));
  const short = answers.findIndex((a) => a.answer.length < MIN_ANSWER);
  if (short >= 0) return Response.json({ error: `Question ${short + 1} needs an answer.` }, { status: 400 });

  try {
    await takeQuota(v.userId, "builds", DAILY_BUILD_LIMIT, "You've rebuilt your clone a lot today. Try again tomorrow.");
    const clone = await buildProfile(name, answers);
    await saveProfile(v.userId, { name, year, bio, contact, answers, clone });
    return Response.json({ clone });
  } catch (err) {
    return errorResponse(err);
  }
}

// Delete my clone and every dry run I was part of.
export async function DELETE() {
  const v = await apiViewer({ needProfile: true });
  if (v instanceof Response) return v;
  try {
    await deleteProfile(v.userId);
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
