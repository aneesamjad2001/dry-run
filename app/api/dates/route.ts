import { createInvite, startDemoDate } from "@/lib/data";
import { apiViewer } from "@/lib/viewer";
import { errorResponse, readJson, str } from "@/lib/api";

// Start a dry run: with a demo person ({ demo: "demo_maya" }) or by creating an invite
// link for someone you matched with ({ invite: true, label: "Sam from Hinge" }).
export async function POST(req: Request) {
  const v = await apiViewer({ needProfile: true });
  if (v instanceof Response) return v;
  const body = await readJson(req);
  try {
    if (typeof body.demo === "string") {
      const id = await startDemoDate(v.profile!, body.demo);
      return Response.json({ id });
    }
    if (body.invite === true) {
      const { id, token } = await createInvite(v.profile!, str(body.label, 60));
      return Response.json({ id, token });
    }
    return Response.json({ error: "Pick a demo person or create an invite." }, { status: 400 });
  } catch (err) {
    return errorResponse(err);
  }
}
