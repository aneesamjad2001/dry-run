import { followUps } from "@/lib/engine";
import { DAILY_BUILD_LIMIT, takeQuota } from "@/lib/data";
import { apiViewer } from "@/lib/viewer";
import { errorResponse, readJson } from "@/lib/api";
import { readInterview } from "@/lib/interview";
import { factLines, QUESTIONS } from "@/lib/questions";

export const maxDuration = 120;

// The follow-up interviewer: reads my answers so far and asks up to three questions
// about what they left vague. Nothing is saved here; the answers come back with the
// rest of the interview when I build my clone.
export async function POST(req: Request) {
  const v = await apiViewer({ needProfile: false });
  if (v instanceof Response) return v;
  const i = readInterview(await readJson(req));
  if ("error" in i) return Response.json({ error: i.error }, { status: 400 });

  try {
    await takeQuota(v.userId, "builds", DAILY_BUILD_LIMIT, "You've rebuilt your clone a lot today. Try again tomorrow.");
    const answers = QUESTIONS.map((q, n) => ({ question: q.q, answer: i.core[n] }));
    return Response.json({ questions: await followUps(i.name, answers, factLines(i.facts)) });
  } catch (err) {
    return errorResponse(err);
  }
}
