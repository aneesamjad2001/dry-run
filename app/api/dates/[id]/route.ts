import { getDateView } from "@/lib/data";
import { apiViewer } from "@/lib/viewer";
import { errorResponse } from "@/lib/api";

export async function GET(_req: Request, ctx: RouteContext<"/api/dates/[id]">) {
  const v = await apiViewer({ needProfile: true });
  if (v instanceof Response) return v;
  const { id } = await ctx.params;
  try {
    const view = await getDateView(id, v.userId);
    if (!view) return Response.json({ error: "Dry run not found." }, { status: 404 });
    return Response.json(view);
  } catch (err) {
    return errorResponse(err);
  }
}
