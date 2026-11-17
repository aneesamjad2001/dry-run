import { answerMeet } from "@/lib/data";
import { apiViewer } from "@/lib/viewer";
import { errorResponse, readJson } from "@/lib/api";

// "Want to meet?" { yes: true | false }
export async function POST(req: Request, ctx: RouteContext<"/api/dates/[id]/meet">) {
  const v = await apiViewer({ needProfile: true });
  if (v instanceof Response) return v;
  const { id } = await ctx.params;
  const body = await readJson(req);
  if (typeof body.yes !== "boolean") return Response.json({ error: "Answer yes or no." }, { status: 400 });
  try {
    return Response.json(await answerMeet(id, v.userId, body.yes));
  } catch (err) {
    return errorResponse(err);
  }
}
