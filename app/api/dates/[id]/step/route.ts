import { stepDate } from "@/lib/data";
import { apiViewer } from "@/lib/viewer";
import { errorResponse } from "@/lib/api";

// The judge (Sonnet) is the slowest step; give it room.
export const maxDuration = 120;

// Run the next step of the dry run (one clone line, the director's twist, or the report).
export async function POST(_req: Request, ctx: RouteContext<"/api/dates/[id]/step">) {
  const v = await apiViewer({ needProfile: true });
  if (v instanceof Response) return v;
  const { id } = await ctx.params;
  try {
    return Response.json(await stepDate(id, v.userId));
  } catch (err) {
    return errorResponse(err);
  }
}
