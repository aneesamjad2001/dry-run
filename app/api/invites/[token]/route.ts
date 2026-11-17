import { answerInvite } from "@/lib/data";
import { apiViewer } from "@/lib/viewer";
import { errorResponse, readJson } from "@/lib/api";

// Accept or decline an invite: { accept: true | false }. Accepting is the second
// person's opt-in, and starts the dry run.
export async function POST(req: Request, ctx: RouteContext<"/api/invites/[token]">) {
  const v = await apiViewer({ needProfile: true });
  if (v instanceof Response) return v;
  const { token } = await ctx.params;
  const body = await readJson(req);
  if (typeof body.accept !== "boolean") return Response.json({ error: "Accept or decline." }, { status: 400 });
  try {
    const dateId = await answerInvite(token, v.profile!, body.accept);
    return Response.json({ dateId });
  } catch (err) {
    return errorResponse(err);
  }
}
