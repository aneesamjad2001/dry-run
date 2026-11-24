import { buildProfile } from "@/lib/engine";
import { DAILY_BUILD_LIMIT, deleteProfile, saveProfile, takeQuota } from "@/lib/data";
import { apiViewer } from "@/lib/viewer";
import { errorResponse, readJson } from "@/lib/api";
import { readInterview } from "@/lib/interview";
import { factLines, packAnswers } from "@/lib/questions";

export const maxDuration = 120;

// Build (or rebuild) my clone from the interview, and return it so I can check it.
export async function POST(req: Request) {
  const v = await apiViewer({ needProfile: false });
  if (v instanceof Response) return v;
  const i = readInterview(await readJson(req));
  if ("error" in i) return Response.json({ error: i.error }, { status: 400 });

  try {
    await takeQuota(v.userId, "builds", DAILY_BUILD_LIMIT, "You've rebuilt your clone a lot today. Try again tomorrow.");
    const answers = packAnswers(i.core, i.followUps, i.facts);
    // The model reads what they typed; what they tapped goes in as plain sentences.
    const typed = answers.filter((a) => !a.id?.startsWith("fact:"));
    const clone = await buildProfile(i.name, typed, factLines(i.facts));
    await saveProfile(v.userId, { name: i.name, year: i.year, bio: i.bio, contact: i.contact, answers, clone });
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
