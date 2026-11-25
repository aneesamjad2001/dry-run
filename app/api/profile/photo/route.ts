import { deletePhoto, savePhoto } from "@/lib/data";
import { apiViewer } from "@/lib/viewer";
import { errorResponse, readJson } from "@/lib/api";

// Add, replace or remove my photo. It is optional, and I can take it down at any time.
export async function POST(req: Request) {
  const v = await apiViewer({ needProfile: true });
  if (v instanceof Response) return v;
  // A 320px JPEG is far under this; anything bigger didn't come from our own form.
  if (Number(req.headers.get("content-length") ?? 0) > 400_000) return Response.json({ error: "That picture is too big." }, { status: 413 });
  const body = await readJson(req);
  try {
    return Response.json({ photo: await savePhoto(v.userId, typeof body.photo === "string" ? body.photo : "") });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE() {
  const v = await apiViewer({ needProfile: true });
  if (v instanceof Response) return v;
  try {
    await deletePhoto(v.userId);
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
